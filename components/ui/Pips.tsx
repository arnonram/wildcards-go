// biome-ignore-all lint/suspicious/noArrayIndexKey: pips are positional and never reordered
import { Plus } from 'lucide-react';
import { cn } from '../../helpers/cn';

export type PipTone = 'accent' | 'danger' | 'warn';

const filledTones: Record<PipTone, string> = {
  accent: 'border-accent bg-accent',
  danger: 'border-danger bg-danger',
  warn: 'border-warn bg-warn',
};

export interface PipsProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  tone?: PipTone;
  allowAdd?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export function Pips({
  label,
  value,
  max,
  onChange,
  tone = 'accent',
  allowAdd = false,
  formatValue,
  className,
}: PipsProps) {
  const count = Math.max(max, value);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <fieldset aria-label={label} className="m-0 flex min-w-0 items-center gap-0.5 border-0 p-0">
        {Array.from({ length: count }, (_, index) => {
          const filled = index < value;
          return (
            <button
              key={`pip-${index}`}
              type="button"
              aria-label={`${label} ${index + 1}`}
              aria-pressed={filled}
              onClick={() => onChange(filled ? index : index + 1)}
              className="flex size-6 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
            >
              <span
                className={cn(
                  'size-2.5 rounded-full border transition-colors',
                  filled ? filledTones[tone] : 'border-line-strong bg-transparent',
                )}
              />
            </button>
          );
        })}
        {allowAdd && (
          <button
            type="button"
            aria-label={`Add ${label}`}
            onClick={() => onChange(value + 1)}
            className="flex size-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Plus size={12} />
          </button>
        )}
      </fieldset>
      <span className="min-w-6 text-xs tabular-nums text-muted">
        {formatValue ? formatValue(value) : value}
      </span>
    </div>
  );
}
