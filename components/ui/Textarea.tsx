import { type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '../../helpers/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export function Textarea({
  label,
  hint,
  error,
  id,
  containerClassName,
  className,
  rows = 3,
  ...props
}: TextareaProps) {
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
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          'w-full resize-y rounded-[var(--radius)] border border-line bg-surface px-2.5 py-2 text-sm leading-relaxed text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15',
          error && 'border-danger',
          className,
        )}
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
