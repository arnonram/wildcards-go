import { describe, expect, test } from 'bun:test';
import { isSortedByName, sortByName } from './sort-by-name';

const named = (...names: string[]) => names.map((name) => ({ name }));
const names = (items: { name: string }[]) => items.map((item) => item.name);

describe('sortByName', () => {
  test('orders case-insensitively and numerically', () => {
    expect(names(sortByName(named('stealth', 'Athletics', 'Item 10', 'Item 2')))).toEqual([
      'Athletics',
      'Item 2',
      'Item 10',
      'stealth',
    ]);
  });

  test('puts unnamed items last, keeping their order', () => {
    const items = [{ name: '', id: 1 }, { name: 'Bow' }, { name: '  ', id: 2 }, { name: 'Axe' }];
    expect(sortByName(items)).toEqual([
      { name: 'Axe' },
      { name: 'Bow' },
      { name: '', id: 1 },
      { name: '  ', id: 2 },
    ]);
  });

  test('does not mutate the input', () => {
    const items = named('b', 'a');
    sortByName(items);
    expect(names(items)).toEqual(['b', 'a']);
  });
});

describe('isSortedByName', () => {
  test('is true for sorted and trivial lists', () => {
    expect(isSortedByName(named('Axe', 'bow', ''))).toBe(true);
    expect(isSortedByName(named('Axe'))).toBe(true);
    expect(isSortedByName([])).toBe(true);
  });

  test('is false when out of order', () => {
    expect(isSortedByName(named('Bow', 'Axe'))).toBe(false);
    expect(isSortedByName(named('', 'Axe'))).toBe(false);
  });
});
