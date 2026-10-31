const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

function compareByName(a: { name: string }, b: { name: string }) {
  const nameA = a.name.trim();
  const nameB = b.name.trim();
  // Unnamed rows are usually freshly added; keep them at the bottom.
  if (!nameA || !nameB) return Number(!nameA) - Number(!nameB);
  return collator.compare(nameA, nameB);
}

export function sortByName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort(compareByName);
}

export function isSortedByName(items: readonly { name: string }[]) {
  return items.every((item, index) => index === 0 || compareByName(items[index - 1], item) <= 0);
}
