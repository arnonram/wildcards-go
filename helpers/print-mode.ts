export type PrintWindow = Pick<
  Window,
  'addEventListener' | 'removeEventListener' | 'dispatchEvent'
> & {
  document: { documentElement: { dataset: DOMStringMap } };
  print: () => void;
};

// Reference pages print only while `<html data-print="reference">` is set.
let armed = false;

export function printSheet(withReference: boolean, win: PrintWindow = window) {
  const { dataset } = win.document.documentElement;
  if (withReference) dataset.print = 'reference';
  else delete dataset.print;
  armed = true;
  win.print();
}

/**
 * Browser-started prints (Ctrl+P, share sheet) get the sheet alone, even when
 * a menu print never fired `afterprint`. Returns the uninstaller.
 */
export function installPrintMode(win: PrintWindow = window): () => void {
  const { dataset } = win.document.documentElement;
  const before = () => {
    if (armed) armed = false;
    else delete dataset.print;
  };
  const after = () => {
    armed = false;
    delete dataset.print;
  };
  win.addEventListener('beforeprint', before);
  win.addEventListener('afterprint', after);
  return () => {
    win.removeEventListener('beforeprint', before);
    win.removeEventListener('afterprint', after);
  };
}
