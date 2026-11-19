export const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** 0 means "not set" in Foundry's numeric item fields. */
export const nonZero = (value: unknown): number | undefined => {
  const n = num(value);
  return n === 0 ? undefined : n;
};

export const str = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** `fighting`, `common-knowledge` → `Fighting`, `Common Knowledge`. */
export const fromSwid = (value: string) =>
  value
    .split(/[-_\s]+/)
    .map(capitalize)
    .join(' ');
