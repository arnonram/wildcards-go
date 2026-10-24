import type { ReactNode } from 'react';
import { cn } from '../../helpers/cn';

export interface SectionProps {
  id: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
}

export function Section({ id, title, actions, children, className, description }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn('scroll-mt-[calc(var(--appbar-h)+var(--nav-h)+1rem)]', className)}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-1.5">
        <div className="min-w-0">
          <h2
            id={`${id}-title`}
            className="font-display text-lg font-semibold uppercase tracking-[0.08em] text-heading"
          >
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-faint">{description}</p>}
        </div>
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
