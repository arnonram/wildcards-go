import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../helpers/cn';

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof widths;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="ui-backdrop fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" />
        <BaseDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <BaseDialog.Popup
            className={cn(
              'ui-dialog relative w-full rounded-[calc(var(--radius)+3px)] border border-line-strong bg-surface p-5 text-ink shadow-2xl',
              'max-h-[calc(100dvh-2rem)] overflow-y-auto',
              widths[size],
              className,
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <BaseDialog.Title className="font-display text-lg font-semibold tracking-wide text-heading">
                  {title}
                </BaseDialog.Title>
                {description && (
                  <BaseDialog.Description className="mt-1 text-sm text-muted">
                    {description}
                  </BaseDialog.Description>
                )}
              </div>
              <BaseDialog.Close
                aria-label="Close dialog"
                className="-mr-1 -mt-1 rounded-[var(--radius)] p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <X size={16} />
              </BaseDialog.Close>
            </div>

            {children && <div className="mt-4">{children}</div>}

            {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
