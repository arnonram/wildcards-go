import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type Skin = 'classic' | 'modern';
export type ThemeMode = 'light' | 'dark';

const SKIN_KEY = 'wc-skin';
const MODE_KEY = 'wc-mode';

interface ThemeContextType {
  skin: Skin;
  mode: ThemeMode;
  setSkin: (skin: Skin) => void;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  skin: 'classic',
  mode: 'light',
  setSkin: () => {},
  setMode: () => {},
  toggleTheme: () => {},
});

function applyToDocument(skin: Skin, mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.skin = skin;
  root.dataset.mode = mode;
  root.style.colorScheme = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<Skin>('classic');
  const [mode, setModeState] = useState<ThemeMode>('light');

  // The blocking script in _document has already resolved the stored values.
  // Mirror them into React state after mount so there is no hydration flash.
  useEffect(() => {
    const root = document.documentElement;
    const storedSkin = root.dataset.skin as Skin | undefined;
    const storedMode = root.dataset.mode as ThemeMode | undefined;
    if (storedSkin === 'classic' || storedSkin === 'modern') {
      setSkinState(storedSkin);
    }
    if (storedMode === 'light' || storedMode === 'dark') {
      setModeState(storedMode);
    }
  }, []);

  const setSkin = useCallback((next: Skin) => {
    setSkinState(next);
    applyToDocument(next, document.documentElement.dataset.mode as ThemeMode);
    localStorage.setItem(SKIN_KEY, next);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyToDocument(document.documentElement.dataset.skin as Skin, next);
    localStorage.setItem(MODE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [setMode]);

  return (
    <ThemeContext.Provider value={{ skin, mode, setSkin, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
