import { Camera, Download, Pencil, Trash2 } from 'lucide-react';
import { Ranks } from '../../dtos/wildcards-consts';
import { useTranslation } from '../../helpers/context/locale-context';
import { type SaveState, useWildcard } from '../../helpers/context/wildcard-context';
import { type MessageKey, rankLabel } from '../../helpers/i18n';
import { fileToPortraitBlob } from '../../helpers/image-helpers';
import { setPortrait } from '../../helpers/offline/characters';
import { usePortraitUrl } from '../../helpers/offline/hooks';
import { downloadExport } from '../../helpers/offline/transfer';
import { Button } from '../ui/Button';
import { SheetOptionsMenu } from './SheetOptionsMenu';

const saveLabels: Record<SaveState, { key: MessageKey; className: string }> = {
  idle: { key: 'sheet.save.idle', className: 'text-faint' },
  saving: { key: 'sheet.save.saving', className: 'text-warn' },
  saved: { key: 'sheet.save.saved', className: 'text-ok' },
  pending: { key: 'sheet.save.pending', className: 'text-warn' },
  offline: { key: 'sheet.save.offline', className: 'text-warn' },
  error: { key: 'sheet.save.error', className: 'text-danger' },
  conflict: { key: 'sheet.save.conflict', className: 'text-danger' },
};

function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  const label = saveLabels[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${label.className}`}
      aria-live="polite"
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(label.key)}
    </span>
  );
}

export function SheetHeader({ onDelete }: { onDelete: () => void }) {
  const { characterId, wildcardData, update, saveState } = useWildcard();
  const portraitUrl = usePortraitUrl(characterId);
  const { t } = useTranslation();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const portraitRev = await setPortrait(characterId, await fileToPortraitBlob(file));
      update({ portraitRev });
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
          aria-label={t('sheet.header.uploadPortrait')}
        />
        {portraitUrl ? (
          <>
            {/* Blob URLs are not compatible with the Next image optimizer. */}
            {/* biome-ignore lint/performance/noImgElement: portraits are local blob URLs */}
            <img
              src={portraitUrl}
              alt={t('sheet.header.portraitAlt', {
                name: wildcardData.name || t('sheet.header.character'),
              })}
              className="size-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera size={20} className="text-white" />
            </span>
          </>
        ) : (
          <span className="flex size-full flex-col items-center justify-center gap-1 text-faint transition-colors group-hover:text-accent">
            <Camera size={22} />
            <span className="text-[10px] uppercase tracking-wider">{t('sheet.header.upload')}</span>
          </span>
        )}
      </label>

      <div className="min-w-0 flex-1">
        <div className="group relative">
          <input
            value={wildcardData.name ?? ''}
            onChange={(event) => update({ name: event.target.value })}
            placeholder={t('sheet.header.namePlaceholder')}
            aria-label={t('sheet.header.nameLabel')}
            title={t('sheet.header.nameTitle')}
            className="w-[calc(100%+0.5rem)] -ml-2 rounded-[var(--radius)] border border-transparent bg-transparent py-0.5 pr-7 pl-2 font-display text-xl font-bold tracking-[0.02em] text-heading placeholder:text-faint transition-colors hover:border-line focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/15 sm:text-3xl"
          />
          <Pencil
            size={12}
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          <span>{rankLabel(wildcardData.rank ?? Ranks.Novice, t)}</span>
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          <span>{wildcardData.race || t('sheet.header.noAncestry')}</span>
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end">
        <SaveIndicator state={saveState} />
        <div className="flex gap-2">
          <SheetOptionsMenu />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void downloadExport({ id: characterId, name: wildcardData.name })}
          >
            <Download size={13} />
            {t('sheet.header.export')}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 size={13} />
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
