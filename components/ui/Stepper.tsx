import { Minus, Plus } from 'lucide-react';
import { cn } from '../../helpers/cn';
import { useTranslation } from '../../helpers/context/locale-context';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function Stepper({
  label,
  value,
  onChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  className,
}: StepperProps) {
  const { t } = useTranslation();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label={t('ui.stepper.decrease', { label })}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="flex size-7 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35"
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        aria-label={label}
        value={value}
        min={Number.isFinite(min) ? min : undefined}
        max={Number.isFinite(max) ? max : undefined}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isNaN(next)) onChange(clamp(next));
        }}
        className="h-7 w-12 rounded-[var(--radius)] border border-line bg-surface text-center text-sm tabular-nums text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
      <button
        type="button"
        aria-label={t('ui.stepper.increase', { label })}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
        className="flex size-7 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
