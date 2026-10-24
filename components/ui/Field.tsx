import { type InputHTMLAttributes, useId } from 'react';
import { cn } from '../../helpers/cn';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
  variant?: 'default' | 'quiet';
}

const inputBase =
  'h-[var(--row-h)] w-full rounded-[var(--radius)] px-2.5 text-sm text-ink placeholder:text-faint transition-colors focus:outline-none';

const inputVariants = {
  default:
    'border border-line bg-surface hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/15',
  quiet:
    'border border-transparent bg-transparent hover:border-line focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15',
} as const;

export function Field({
  label,
  hint,
  error,
  id,
  containerClassName,
  variant = 'default',
  className,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('min-w-0', containerClassName)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          {label}
        </label>
      )}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(inputBase, inputVariants[variant], error && 'border-danger', className)}
        {...props}
      />
      {message && (
        <p
          id={messageId}
          className={cn('mt-1 text-[11px] leading-tight', error ? 'text-danger' : 'text-faint')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
