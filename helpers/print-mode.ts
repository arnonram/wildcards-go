export type PrintWindow = Pick<
  Window,
  'addEventListener' | 'removeEventListener' | 'dispatchEvent'
> & {
  document: { documentElement: { dataset: DOMStringMap } };
  print: () => void;
};

// Reference pages print only while `<html data-print="reference">` is set.
// One token per menu print, so a stale timer can't disarm a newer print.
const armed = new WeakMap<PrintWindow, object>();

/** A print that never starts (blocked, no-op) must not leave reference on. */
const DISARM_MS = 5000;

export function printSheet(
  withReference: boolean,
  win: PrintWindow = window,
  disarmMs = DISARM_MS,
) {
  const { dataset } = win.document.documentElement;
  if (withReference) dataset.print = 'reference';
  else delete dataset.print;
  const token = {};
  armed.set(win, token);
  win.print();
  if (armed.get(win) !== token) return;
  setTimeout(() => {
    if (armed.get(win) !== token) return;
    armed.delete(win);
    delete dataset.print;
  }, disarmMs);
}

/**
 * Browser-started prints (Ctrl+P, share sheet) get the sheet alone, even when
 * a menu print never fired `afterprint`. Returns the uninstaller.
 */
export function installPrintMode(win: PrintWindow = window): () => void {
  const { dataset } = win.document.documentElement;
  const before = () => {
    if (armed.has(win)) armed.delete(win);
    else delete dataset.print;
  };
  const after = () => {
    armed.delete(win);
    delete dataset.print;
  };
  win.addEventListener('beforeprint', before);
  win.addEventListener('afterprint', after);
  return () => {
    win.removeEventListener('beforeprint', before);
    win.removeEventListener('afterprint', after);
  };
}
