import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../helpers/cn';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110 active:brightness-95',
  outline:
    'border border-line-strong bg-transparent text-ink hover:border-accent hover:bg-accent-soft',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3 text-sm',
  icon: 'h-9 w-9 p-0',
  'icon-sm': 'h-7 w-7 p-0',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  label: string;
  children: ReactNode;
  size?: 'sm' | 'md';
}

export function IconButton({ label, size = 'md', children, ...props }: IconButtonProps) {
  return (
    <Button aria-label={label} title={label} size={size === 'sm' ? 'icon-sm' : 'icon'} {...props}>
      {children}
    </Button>
  );
}
