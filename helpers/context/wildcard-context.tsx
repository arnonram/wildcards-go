import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { saveToDb } from '../save-action';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface WildcardContextValue {
  wildcardData: WildCardCharacter;
  setWildcardData: Dispatch<SetStateAction<WildCardCharacter>>;
  update: (patch: Partial<WildCardCharacter>) => void;
  saveState: SaveState;
}

export const WildcardContext = createContext<WildcardContextValue | undefined>(undefined);

type WildcardProviderProps = {
  wildCard: WildCardCharacter;
  children: ReactNode;
};

const SAVE_DELAY = 600;

export function WildCardProvider({ wildCard, children }: WildcardProviderProps) {
  const [wildcardData, setWildcardDataState] = useState(wildCard);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const latest = useRef(wildcardData);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  latest.current = wildcardData;

  const setWildcardData = useCallback<Dispatch<SetStateAction<WildCardCharacter>>>((value) => {
    dirty.current = true;
    setWildcardDataState(value);
  }, []);

  const update = useCallback((patch: Partial<WildCardCharacter>) => {
    dirty.current = true;
    setWildcardDataState((previous) => ({ ...previous, ...patch }));
  }, []);

  // Debounced autosave. Every edit resets the timer so typing does not spam the API.
  // biome-ignore lint/correctness/useExhaustiveDependencies: wildcardData is the trigger; the latest value lives in latest.current
  useEffect(() => {
    if (!dirty.current) return;

    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await saveToDb(latest.current);
        setSaveState('saved');
      } catch (error) {
        console.error('Failed to save character:', error);
        setSaveState('error');
      }
    }, SAVE_DELAY);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [wildcardData]);

  // Leaving the sheet before the debounce fires must not lose the last edit.
  useEffect(() => {
    return () => {
      if (dirty.current) {
        void saveToDb(latest.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({ wildcardData, setWildcardData, update, saveState }),
    [wildcardData, setWildcardData, update, saveState],
  );

  return <WildcardContext.Provider value={value}>{children}</WildcardContext.Provider>;
}

export function useWildcard() {
  const context = useContext(WildcardContext);
  if (context === undefined) {
    throw new Error('useWildcard must be used within a WildCardProvider');
  }
  return context;
}
