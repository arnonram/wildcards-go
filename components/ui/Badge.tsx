import { cn } from '../../helpers/cn';

export type BadgeTone = 'neutral' | 'accent' | 'danger' | 'warn' | 'ok';

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-surface-2 text-muted',
  accent: 'border-accent/40 bg-accent-soft text-accent',
  danger: 'border-danger/40 bg-danger-soft text-danger',
  warn: 'border-warn/40 bg-warn/10 text-warn',
  ok: 'border-ok/40 bg-ok/10 text-ok',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
