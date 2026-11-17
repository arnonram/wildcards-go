import { Printer } from 'lucide-react';
import { useTranslation } from '../../helpers/context/locale-context';
import { Button } from '../ui/Button';
import { Menu } from '../ui/Menu';

/** Reference pages show only while `data-print="reference"` is set, so Ctrl+P prints the sheet alone. */
function printSheet(withReference: boolean) {
  const root = document.documentElement;
  if (withReference) root.dataset.print = 'reference';
  else delete root.dataset.print;
  window.addEventListener('afterprint', () => delete root.dataset.print, { once: true });
  window.print();
}

const item =
  'flex cursor-default select-none items-center gap-2 rounded-[calc(var(--radius)-1px)] px-2 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-surface-2';

export function PrintMenu({ labelClassName }: { labelClassName?: string }) {
  const { t } = useTranslation();
  const label = t('sheet.header.print');
  return (
    <Menu.Root>
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
            <Menu.Item className={item} onClick={() => printSheet(true)}>
              {t('print.sheetWithReference')}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
