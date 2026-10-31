import { useEffect, useState } from 'react';
import { Field, type FieldProps } from './Field';

export interface NumberFieldProps extends Omit<FieldProps, 'type' | 'value' | 'onChange' | 'min'> {
  value: number;
  /** Lowest accepted value; also blocks typing "-" when non-negative. */
  min?: number;
  onValueChange: (value: number) => void;
}

const NUMERIC_PATTERN = /^-?\d*(?:\.\d*)?$/;

/**
 * Numeric input that keeps a text draft while editing so intermediate values
 * like "" or "-" don't get coerced to 0 before the user can finish typing.
 */
export function NumberField({
  value,
  min,
  onValueChange,
  onFocus,
  onBlur,
  ...props
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [focused, value]);

  return (
    <Field
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        setDraft(String(value));
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value.replace('−', '-');
        if (!NUMERIC_PATTERN.test(next)) return;
        if (min !== undefined && min >= 0 && next.includes('-')) return;

        setDraft(next);
        if (next !== '' && next !== '-' && next !== '.' && next !== '-.') {
          onValueChange(Number(next));
        }
      }}
      onBlur={(event) => {
        setFocused(false);
        const parsed = Number(draft);
        if (
          draft === '' ||
          draft === '-' ||
          draft === '.' ||
          draft === '-.' ||
          !Number.isFinite(parsed)
        ) {
          const fallback = Math.max(0, min ?? 0);
          setDraft(String(fallback));
          onValueChange(fallback);
        } else if (min !== undefined && parsed < min) {
          setDraft(String(min));
          onValueChange(min);
        } else {
          setDraft(String(parsed));
        }
        onBlur?.(event);
      }}
    />
  );
}
