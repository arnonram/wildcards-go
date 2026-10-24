import { cn } from '../../helpers/cn';

export interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}

export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn('min-w-14', className)} title={hint}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="font-display text-lg font-semibold leading-tight tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
}
