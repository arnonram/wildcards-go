const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

type Named = { name: string };
type GetName<T> = (item: T) => string;

const storedName = (item: Named) => item.name;

function compareByName<T extends Named>(a: T, b: T, getName: GetName<T>) {
  const nameA = getName(a).trim();
  const nameB = getName(b).trim();
  // Unnamed rows are usually freshly added; keep them at the bottom.
  if (!nameA || !nameB) return Number(!nameA) - Number(!nameB);
  return collator.compare(nameA, nameB);
}

/** `getName` sorts by a displayed name (e.g. a translated skill) instead of the stored one. */
export function sortByName<T extends Named>(
  items: readonly T[],
  getName: GetName<T> = storedName,
): T[] {
  return [...items].sort((a, b) => compareByName(a, b, getName));
}

export function isSortedByName<T extends Named>(
  items: readonly T[],
  getName: GetName<T> = storedName,
) {
  return items.every(
    (item, index) => index === 0 || compareByName(items[index - 1], item, getName) <= 0,
  );
}
