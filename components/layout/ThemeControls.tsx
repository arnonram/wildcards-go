import { Check, Moon, Palette, Sun } from 'lucide-react';
import { type Skin, useTheme } from '../../helpers/context/theme-context';
import { Menu } from '../ui/Menu';

const options: Array<{ skin: Skin; label: string; hint: string }> = [
  { skin: 'classic', label: 'Classic', hint: 'Warm serif' },
  { skin: 'modern', label: 'Modern', hint: 'Clean sans' },
];

export function SkinMenu() {
  const { skin, setSkin } = useTheme();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Change theme"
        title="Change theme"
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Palette size={18} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="ui-popup min-w-56 rounded-[var(--radius)] border border-line-strong bg-surface p-1 shadow-xl">
            <Menu.Group>
              <Menu.GroupLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Theme
              </Menu.GroupLabel>
              {options.map((option) => {
                const active = option.skin === skin;
                return (
                  <Menu.Item
                    key={option.skin}
                    onClick={() => setSkin(option.skin)}
                    className="flex cursor-default select-none items-center gap-2 rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-2"
                  >
                    <span className="flex w-3.5 shrink-0 justify-center text-accent">
                      {active && <Check size={12} />}
                    </span>
                    <span>{option.label}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-faint">
                      {option.hint}
                    </span>
                  </Menu.Item>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function ModeToggle() {
  const { mode, toggleTheme } = useTheme();
  const dark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
