import { ArrowDownAZ } from 'lucide-react';
import { useTranslation } from '../../helpers/context/locale-context';
import { isSortedByName, sortByName } from '../../helpers/sort-by-name';
import { Button } from '../ui/Button';

/** One-shot A–Z reorder of a list; disabled while the list is already in order. */
export function SortByNameButton<T extends { name: string }>({
  items,
  onSort,
  label,
  getName,
}: {
  items: readonly T[];
  onSort: (sorted: T[]) => void;
  label: string;
  /** Name the player sees, when it differs from the stored one. */
  getName?: (item: T) => string;
}) {
  const { t } = useTranslation();
  if (items.length < 2) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onSort(sortByName(items, getName))}
      disabled={isSortedByName(items, getName)}
      aria-label={t('ui.sort.label', { label })}
      title={t('ui.sort.title')}
    >
      <ArrowDownAZ size={14} />
    </Button>
  );
}
