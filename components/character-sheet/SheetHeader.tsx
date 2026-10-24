import { Camera, Trash2 } from 'lucide-react';
import { Ranks } from '../../dtos/wildcards-consts';
import { type SaveState, useWildcard } from '../../helpers/context/wildcard-context';
import { fileToPortraitDataUrl } from '../../helpers/image-helpers';
import { Button } from '../ui/Button';

const saveLabels: Record<SaveState, { text: string; className: string }> = {
  idle: { text: 'Autosave on', className: 'text-faint' },
  saving: { text: 'Saving…', className: 'text-warn' },
  saved: { text: 'Saved', className: 'text-ok' },
  error: { text: 'Save failed', className: 'text-danger' },
};

function SaveIndicator({ state }: { state: SaveState }) {
  const label = saveLabels[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${label.className}`}
      aria-live="polite"
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label.text}
    </span>
  );
}

export function SheetHeader({ onDelete }: { onDelete: () => void }) {
  const { wildcardData, update, saveState } = useWildcard();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await fileToPortraitDataUrl(file);
      update({ imageUrl });
    } catch (error) {
      console.error('Failed to process portrait:', error);
    } finally {
      input.value = '';
    }
  };

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <label className="group relative block size-20 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius)] border border-line bg-surface-2 sm:size-24">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="sr-only"
          aria-label="Upload character portrait"
        />
        {wildcardData.imageUrl ? (
          <>
            {/* Data URLs are not compatible with the Next image optimizer. */}
            {/* biome-ignore lint/performance/noImgElement: portraits are arbitrary user-provided URLs */}
            <img
              src={wildcardData.imageUrl}
              alt={`${wildcardData.name || 'Character'} portrait`}
              className="size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={20} className="text-white" />
            </span>
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 text-faint transition-colors group-hover:text-accent">
            <Camera size={22} />
            <span className="text-[10px] uppercase tracking-wider">Upload</span>
          </span>
        )}
      </label>

      <div className="min-w-0 flex-1">
        <input
          value={wildcardData.name ?? ''}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="Unnamed Wildcard"
          aria-label="Character name"
          className="w-full bg-transparent font-display text-xl font-bold tracking-[0.02em] text-heading placeholder:text-faint focus:outline-none sm:text-3xl"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          <span>{wildcardData.rank ?? Ranks.Novice}</span>
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          <span>{wildcardData.race || 'No ancestry'}</span>
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        <SaveIndicator state={saveState} />
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 size={13} />
          Delete
        </Button>
      </div>
    </div>
  );
}
