import { expect, test } from 'bun:test';
import { type PrintWindow, printSheet } from './print-mode';

function fakeWindow() {
  const seen: string[] = [];
  const win: PrintWindow = {
    document: { documentElement: { dataset: {} as DOMStringMap } },
    print: () => seen.push(mode(win)),
  };
  return { win, seen };
}

const mode = (win: PrintWindow) => win.document.documentElement.dataset.print ?? 'sheet';

test('the picked mode is set before printing and stays afterwards', () => {
  const { win, seen } = fakeWindow();
  printSheet(true, win);
  expect(seen).toEqual(['reference']);
  expect(mode(win)).toBe('reference');
});

test('picking sheet clears an earlier reference pick', () => {
  const { win, seen } = fakeWindow();
  printSheet(true, win);
  printSheet(false, win);
  expect(seen).toEqual(['reference', 'sheet']);
  expect(mode(win)).toBe('sheet');
});
