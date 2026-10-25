import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { CharToLoad } from '../../dtos/CharToLoad';
import { usePortraitUrl } from '../../helpers/offline/hooks';

export interface CharacterCardProps {
  character: CharToLoad;
  onDelete?: (character: CharToLoad) => void;
}

export function CharacterCard({ character, onDelete }: CharacterCardProps) {
  const portraitUrl = usePortraitUrl(character._id);

  return (
    <div className="group relative flex items-stretch rounded-[var(--radius)] border border-line bg-surface transition-colors hover:border-accent/50">
      <Link
        href={`/character/${encodeURIComponent(character._id)}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-line bg-bg-deep">
          {portraitUrl ? (
            // biome-ignore lint/performance/noImgElement: portraits are local blob URLs
            <img src={portraitUrl} alt={character.name} className="size-full object-cover" />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-faint">No image</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-semibold text-ink">
            {character.name || 'Unnamed Character'}
          </div>
          <div className="mt-0.5 text-xs text-muted">Open character sheet</div>
        </div>
      </Link>

      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(character)}
          aria-label={`Delete ${character.name || 'character'}`}
          title={`Delete ${character.name || 'character'}`}
          className="m-2 self-start rounded-[var(--radius)] p-1.5 text-faint transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
