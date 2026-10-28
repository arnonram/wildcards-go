/** Browser globals bun lacks, for tests of modules that read them. */
export function installBrowserGlobals() {
  const items = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, String(value)),
      removeItem: (key: string) => void items.delete(key),
      clear: () => items.clear(),
    },
  });
  setOnline(true);
}

export function setOnline(online: boolean) {
  Object.defineProperty(globalThis.navigator, 'onLine', { value: online, configurable: true });
}
