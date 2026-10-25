import { TriangleAlert } from 'lucide-react';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { resolveConflict } from '../../helpers/offline/characters';
import { Button } from '../ui/Button';

export function ConflictBanner() {
  const { characterId, conflict } = useWildcard();
  if (conflict === undefined) return null;

  const deletedElsewhere = conflict === null || conflict.deleted;
  const resolve = (choice: 'mine' | 'theirs') => {
    resolveConflict(characterId, choice).catch((error) => {
      console.error('Could not resolve the conflict:', error);
    });
  };

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-ink"
    >
      <TriangleAlert size={16} className="shrink-0 text-danger" />
      <p className="min-w-0 flex-1">
        {deletedElsewhere
          ? 'This character was deleted on another device.'
          : 'This character changed on another device.'}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => resolve('mine')}>
          Keep mine
        </Button>
        <Button size="sm" variant="outline" onClick={() => resolve('theirs')}>
          Use theirs
        </Button>
      </div>
    </div>
  );
}
