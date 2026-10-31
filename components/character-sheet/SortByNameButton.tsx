import { ArrowDownAZ } from 'lucide-react';
import { isSortedByName, sortByName } from '../../helpers/sort-by-name';
import { Button } from '../ui/Button';

/** One-shot A–Z reorder of a list; disabled while the list is already in order. */
export function SortByNameButton<T extends { name: string }>({
  items,
  onSort,
  label,
}: {
  items: readonly T[];
  onSort: (sorted: T[]) => void;
  label: string;
}) {
  if (items.length < 2) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onSort(sortByName(items))}
      disabled={isSortedByName(items)}
      aria-label={`Sort ${label} A to Z`}
      title="Sort A–Z"
    >
      <ArrowDownAZ size={14} />
    </Button>
  );
}
