export type PrintWindow = {
  document: { documentElement: { dataset: DOMStringMap } };
  print: () => void;
};

/**
 * Reference pages print while `<html data-print="reference">` is set. The pick
 * stays until the next one, so browser print-event timing can't drop it.
 */
export function printSheet(withReference: boolean, win: PrintWindow = window) {
  const { dataset } = win.document.documentElement;
  if (withReference) dataset.print = 'reference';
  else delete dataset.print;
  win.print();
}
