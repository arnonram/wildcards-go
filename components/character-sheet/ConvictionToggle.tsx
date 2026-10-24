import { Flame } from 'lucide-react';
import { cn } from '../../helpers/cn';
import { useWildcard } from '../../helpers/context/wildcard-context';

export function ConvictionToggle() {
  const { wildcardData, update } = useWildcard();
  const active = wildcardData.conviction === true || Number(wildcardData.conviction) > 0;

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
      Conviction
    </button>
  );
}
