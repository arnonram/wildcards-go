import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { useId } from 'react';
import { cn } from '../../helpers/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  id,
  name,
  label,
  placeholder,
  disabled,
  className,
  triggerClassName,
  size = 'md',
  'aria-label': ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          {label}
        </label>
      )}
      <BaseSelect.Root
        items={options.map((option) => ({ label: option.label, value: option.value }))}
        value={value}
        onValueChange={(next) => onValueChange(next ?? '')}
        name={name}
        disabled={disabled}
      >
        <BaseSelect.Trigger
          id={selectId}
          aria-label={ariaLabel ?? label}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-[var(--radius)] border border-line bg-surface px-2.5 text-left text-sm text-ink transition-colors hover:border-line-strong data-[popup-open]:border-accent data-[popup-open]:ring-2 data-[popup-open]:ring-accent/15',
            size === 'sm' ? 'h-8 text-xs' : 'h-[var(--row-h)]',
            triggerClassName,
          )}
        >
          <BaseSelect.Value>
            {(selected) => {
              const current = options.find((option) => option.value === selected);
              return (
                <span className={cn('truncate', !current && 'text-faint')}>
                  {current?.label ?? placeholder ?? 'Select…'}
                </span>
              );
            }}
          </BaseSelect.Value>
          <BaseSelect.Icon className="shrink-0 text-faint">
            <ChevronDown size={14} />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>

        <BaseSelect.Portal>
          <BaseSelect.Positioner sideOffset={4} alignItemWithTrigger={false} className="z-50">
            <BaseSelect.Popup className="ui-popup max-h-[min(20rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-[var(--radius)] border border-line-strong bg-surface p-1 shadow-xl">
              <BaseSelect.List>
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="flex cursor-default select-none items-center gap-2 rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2 data-[selected]:text-accent"
                  >
                    <BaseSelect.ItemIndicator className="flex w-3.5 shrink-0 justify-center">
                      <Check size={12} />
                    </BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  );
}
