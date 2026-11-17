import { expect, test } from 'bun:test';
import { installPrintMode, type PrintWindow, printSheet } from './print-mode';

function fakeWindow(
  print: (win: PrintWindow) => void = () => {},
): PrintWindow & { seen: string[] } {
  const target = new EventTarget();
  const win = Object.assign(target, {
    document: { documentElement: { dataset: {} as DOMStringMap } },
    seen: [] as string[],
    print: () => print(win),
  });
  return win;
}

const fire = (win: PrintWindow, type: string) => win.dispatchEvent(new Event(type));
const mode = (win: PrintWindow) => win.document.documentElement.dataset.print ?? 'sheet';

function syncPrint(win: PrintWindow & { seen?: string[] }) {
  fire(win, 'beforeprint');
  win.seen?.push(mode(win));
  fire(win, 'afterprint');
}

test('menu print with descriptions shows reference, then clears', () => {
  const win = fakeWindow(syncPrint);
  installPrintMode(win);
  printSheet(true, win);
  expect(win.seen).toEqual(['reference']);
  expect(mode(win)).toBe('sheet');
});

test('browser print never shows reference, even if a flag was left behind', () => {
  const win = fakeWindow();
  installPrintMode(win);
  win.document.documentElement.dataset.print = 'reference';
  fire(win, 'beforeprint');
  expect(mode(win)).toBe('sheet');
});

test('print that starts later (non-blocking print) keeps reference', () => {
  const win = fakeWindow();
  installPrintMode(win);
  printSheet(true, win);
  fire(win, 'beforeprint');
  expect(mode(win)).toBe('reference');
});

test('sheet print clears an old flag', () => {
  const win = fakeWindow(syncPrint);
  installPrintMode(win);
  win.document.documentElement.dataset.print = 'reference';
  printSheet(false, win);
  expect(win.seen).toEqual(['sheet']);
});

test('uninstall removes listeners', () => {
  const win = fakeWindow();
  const uninstall = installPrintMode(win);
  uninstall();
  win.document.documentElement.dataset.print = 'reference';
  fire(win, 'beforeprint');
  expect(mode(win)).toBe('reference');
});
