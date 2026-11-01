import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  isLocale,
  type Locale,
  type MessageKey,
  persistLocale,
  type TranslateVars,
  translate,
} from '../i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: TranslateVars) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key, vars) => translate('en', key, vars),
});

/**
 * UI language only. Deliberately independent of character state: switching
 * language never touches a character, Dexie, or the sync queue.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // The blocking script in _document has already resolved the stored or
  // browser language onto <html lang>. Mirror it into React state after mount.
  useEffect(() => {
    const resolved = document.documentElement.lang;
    if (isLocale(resolved)) setLocaleState(resolved);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next, localStorage, document.documentElement);
  }, []);

  const value = useMemo<LocaleContextType>(
    () => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  return useContext(LocaleContext);
}
