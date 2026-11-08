import { Check, Settings } from 'lucide-react';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import type { MessageKey } from '../../helpers/i18n';
import { SHEET_OPTIONS, type SheetOption, sheetOptionState } from '../../helpers/sheet-options';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';

const optionLabels: Record<SheetOption, MessageKey> = {
  conviction: 'stat.conviction',
  customAttributes: 'sheet.traits.customAttributes',
};

export function SheetOptionsMenu() {
  const { wildcardData, setWildcardData } = useWildcard();
  const { t } = useTranslation();
  const label = t('sheet.options.label');

  const setOption = (option: SheetOption, enabled: boolean) => {
    setWildcardData((previous) => ({
      ...previous,
      options: {
        ...Object.fromEntries(
          SHEET_OPTIONS.map((key) => [key, sheetOptionState(previous, key).shown]),
        ),
        [option]: enabled,
      },
    }));
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        render={<Button variant="outline" size="sm" />}
        aria-label={label}
        title={label}
      >
        <Settings size={13} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50">
          <Menu.Popup className="ui-popup min-w-56 rounded-[var(--radius)] border border-line-strong bg-surface p-1 shadow-xl">
            <Menu.Group>
              <Menu.GroupLabel className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {t('sheet.options.settingRules')}
              </Menu.GroupLabel>
              {SHEET_OPTIONS.map((option) => {
                const { shown, inUse } = sheetOptionState(wildcardData, option);
                return (
                  <Menu.CheckboxItem
                    key={option}
                    checked={shown}
                    disabled={inUse}
                    onCheckedChange={(checked) => setOption(option, checked)}
                    className="flex cursor-default select-none items-center gap-2 rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[disabled]:opacity-60 data-[highlighted]:bg-surface-2"
                  >
                    <span className="flex w-3.5 shrink-0 justify-center text-accent">
                      <Menu.CheckboxItemIndicator>
                        <Check size={12} />
                      </Menu.CheckboxItemIndicator>
                    </span>
                    <span>{t(optionLabels[option])}</span>
                    {inUse && (
                      <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-faint">
                        {t('sheet.options.inUse')}
                      </span>
                    )}
                  </Menu.CheckboxItem>
                );
              })}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
