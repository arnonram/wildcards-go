import { useEffect, useState } from 'react';
import { Field, type FieldProps } from './Field';

export interface NumberFieldProps extends Omit<FieldProps, 'type' | 'value' | 'onChange'> {
  value: number;
  onValueChange: (value: number) => void;
}

const NUMERIC_PATTERN = /^-?\d*(?:\.\d*)?$/;

/**
 * Numeric input that keeps a text draft while editing so intermediate values
 * like "" or "-" don't get coerced to 0 before the user can finish typing.
 */
export function NumberField({ value, onValueChange, onFocus, onBlur, ...props }: NumberFieldProps) {
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
          setDraft('0');
          onValueChange(0);
        } else {
          setDraft(String(parsed));
        }
        onBlur?.(event);
      }}
    />
  );
}
