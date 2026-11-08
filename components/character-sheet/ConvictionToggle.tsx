import { Flame } from 'lucide-react';
import { cn } from '../../helpers/cn';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { hasConviction } from '../../helpers/sheet-options';

export function ConvictionToggle() {
  const { wildcardData, update } = useWildcard();
  const { t } = useTranslation();
  const active = hasConviction(wildcardData);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => update({ conviction: !active })}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors',
        active
          ? 'border-accent-2/60 bg-accent-2/10 text-accent-2'
          : 'border-line-strong text-muted hover:border-accent-2/50 hover:text-ink',
      )}
    >
      <Flame
        size={13}
        strokeWidth={2}
        fill={active ? 'currentColor' : 'none'}
        className={cn(active ? 'text-accent-2' : 'text-faint')}
        aria-hidden="true"
      />
      {t('stat.conviction')}
    </button>
  );
}
