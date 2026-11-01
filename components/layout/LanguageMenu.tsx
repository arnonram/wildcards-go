import { Check, Languages } from 'lucide-react';
import { useTranslation } from '../../helpers/context/locale-context';
import { LOCALE_NAMES, LOCALES } from '../../helpers/i18n';
import { Menu } from '../ui/Menu';

export function LanguageMenu() {
  const { locale, setLocale, t } = useTranslation();
  const label = t('language.label');

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        title={label}
        className="inline-flex size-9 items-center justify-center rounded-[var(--radius)] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Languages size={18} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="ui-popup min-w-48 rounded-[var(--radius)] border border-line-strong bg-surface p-1 shadow-xl">
            <Menu.Group>
              <Menu.GroupLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {label}
              </Menu.GroupLabel>
              {LOCALES.map((option) => (
                <Menu.Item
                  key={option}
                  onClick={() => setLocale(option)}
                  className="flex cursor-default select-none items-center gap-2 rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-2"
                >
                  <span className="flex w-3.5 shrink-0 justify-center text-accent">
                    {option === locale && <Check size={12} />}
                  </span>
                  <span lang={option}>{LOCALE_NAMES[option]}</span>
                </Menu.Item>
              ))}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
