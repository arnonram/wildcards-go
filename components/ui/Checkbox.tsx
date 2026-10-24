import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../helpers/cn';

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  id,
  name,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BaseCheckbox.Root
        id={id}
        name={name}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="flex size-4 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-surface text-accent-ink transition-colors data-[checked]:border-accent data-[checked]:bg-accent data-[disabled]:opacity-40"
      >
        <BaseCheckbox.Indicator>
          <Check size={11} strokeWidth={3} />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      {label && (
        <label htmlFor={id} className="cursor-pointer select-none text-sm text-ink">
          {label}
        </label>
      )}
    </div>
  );
}
