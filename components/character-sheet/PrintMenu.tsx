import { Printer } from 'lucide-react';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { printSheet } from '../../helpers/print-mode';
import { characterHasReference } from '../../helpers/print-reference';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';

const item =
  'flex cursor-default select-none items-center gap-2 rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-60';

export function PrintMenu({ labelClassName }: { labelClassName?: string }) {
  const { t } = useTranslation();
  const { wildcardData } = useWildcard();
  const label = t('sheet.header.print');
  return (
    // Non-modal: no scroll lock to distort the printout.
    <Menu.Root modal={false}>
      <Menu.Trigger render={<Button variant="outline" size="sm" />} title={label}>
        <Printer size={13} />
        <span className={labelClassName}>{label}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50 print:hidden">
          <Menu.Popup className="ui-popup min-w-48 rounded-[var(--radius)] border border-line-strong bg-surface p-1 shadow-xl">
            <Menu.Item className={item} onClick={() => printSheet(false)}>
              {t('print.sheet')}
            </Menu.Item>
            <Menu.Item
              className={item}
              disabled={!characterHasReference(wildcardData)}
              onClick={() => printSheet(true)}
            >
              {t('print.sheetWithReference')}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
