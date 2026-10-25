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
import type { ServerCharacter } from '../../dtos/sync';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { saveCharacter } from '../offline/characters';
import type { LocalCharacter } from '../offline/db';
import { useCharacter, useSyncStatus } from '../offline/hooks';
import type { SyncStatus } from '../offline/sync';

export type SaveState = 'idle' | 'saving' | 'saved' | 'pending' | 'offline' | 'error' | 'conflict';

interface WildcardContextValue {
  characterId: string;
  wildcardData: WildCardCharacter;
  setWildcardData: Dispatch<SetStateAction<WildCardCharacter>>;
  update: (patch: Partial<WildCardCharacter>) => void;
  saveState: SaveState;
  /** Server copy that conflicts with local edits; undefined = none, null = gone. */
  conflict: ServerCharacter | null | undefined;
}

export const WildcardContext = createContext<WildcardContextValue | undefined>(undefined);

type WildcardProviderProps = {
  characterId: string;
  /** The stored row's data when the sheet opened. */
  initial: WildCardCharacter;
  children: ReactNode;
};

function toSaveState(
  row: LocalCharacter | null | undefined,
  sync: SyncStatus,
  localError: boolean,
): SaveState {
  if (localError) return 'error';
  if (!row) return 'idle';
  if (row.conflict !== undefined) return 'conflict';
  if (row.syncError) return 'error';
  if (!row.dirty) return 'saved';
  if (!sync.online) return 'offline';
  if (sync.syncing) return 'saving';
  return sync.lastError ? 'error' : 'pending';
}

export function WildCardProvider({ characterId, initial, children }: WildcardProviderProps) {
  const [wildcardData, setWildcardDataState] = useState(initial);
  const [localError, setLocalError] = useState(false);
  const row = useCharacter(characterId);
  const sync = useSyncStatus();

  const dirty = useRef(false);
  const pendingWrites = useRef(0);
  const lastWrite = useRef(0);

  const setWildcardData = useCallback<Dispatch<SetStateAction<WildCardCharacter>>>((value) => {
    dirty.current = true;
    setWildcardDataState(value);
  }, []);

  const update = useCallback((patch: Partial<WildCardCharacter>) => {
    dirty.current = true;
    setWildcardDataState((previous) => ({ ...previous, ...patch }));
  }, []);

  // Write every edit to IndexedDB straight away; the sync engine debounces the push.
  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    pendingWrites.current += 1;
    saveCharacter(wildcardData)
      .then((stamp) => {
        lastWrite.current = Math.max(lastWrite.current, stamp);
        setLocalError(false);
      })
      .catch((error) => {
        console.error('Could not save the character in this browser:', error);
        setLocalError(true);
      })
      .finally(() => {
        pendingWrites.current -= 1;
      });
  }, [wildcardData]);

  // Adopt writes this sheet did not make: a pull, a resolved conflict, another tab.
  useEffect(() => {
    if (!row || pendingWrites.current > 0) return;
    if (lastWrite.current === 0) {
      lastWrite.current = row.localUpdatedAt;
      return;
    }
    if (row.localUpdatedAt <= lastWrite.current) return;
    lastWrite.current = row.localUpdatedAt;
    setWildcardDataState(row.data);
  }, [row]);

  const saveState = toSaveState(row, sync, localError);
  const conflict = row?.conflict;

  const value = useMemo(
    () => ({ characterId, wildcardData, setWildcardData, update, saveState, conflict }),
    [characterId, wildcardData, setWildcardData, update, saveState, conflict],
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
