import { DiceValues } from '../../dtos/wildcards-consts';
import { cn } from '../../helpers/cn';
import { useTranslation } from '../../helpers/context/locale-context';
import { Select } from '../ui/Select';

const STEPPED_DICE = [DiceValues.d4, DiceValues.d6, DiceValues.d8, DiceValues.d10, DiceValues.d12];

export interface DiePickerProps {
  name: string;
  value: DiceValues;
  onChange: (value: DiceValues) => void;
  allowUntrained?: boolean;
}

export function DiePicker({ name, value, onChange, allowUntrained = false }: DiePickerProps) {
  const { t } = useTranslation();
  const options = allowUntrained ? [DiceValues.untrained, ...STEPPED_DICE] : STEPPED_DICE;

  return (
    <>
      <fieldset
        className="hidden items-center gap-0.5 sm:flex"
        aria-label={t('sheet.die.label', { name })}
      >
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              'cursor-pointer select-none rounded-[var(--radius)] border px-1.5 py-1 text-[11px] font-semibold tabular-nums transition-colors focus-within:ring-2 focus-within:ring-accent/40',
              value === option
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-transparent text-muted hover:border-line hover:bg-surface-2 hover:text-ink',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={`die-${name}`}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </fieldset>

      <Select
        aria-label={t('sheet.die.label', { name })}
        size="sm"
        className="w-24 shrink-0 sm:hidden"
        value={value}
        onValueChange={(next) => onChange(next as DiceValues)}
        options={options.map((option) => ({ value: option, label: option }))}
      />
    </>
  );
}
