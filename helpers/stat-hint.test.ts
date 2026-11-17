import { expect, test } from 'bun:test';
import { statHint } from './stat-hint';

const t = (key: string, vars?: Record<string, string | number>) =>
  `${vars?.value} ${key.replace('stat.hint.', '')}`;

test('base plain, other parts signed', () => {
  expect(
    statHint(
      [
        ['base', 5],
        ['armor', 2],
        ['mod', 1],
      ],
      t,
    ),
  ).toBe('5 base, +2 armor, +1 mod');
});

test('zero parts are left out, base always shown', () => {
  expect(
    statHint(
      [
        ['base', 0],
        ['size', 0],
        ['mod', -1],
      ],
      t,
    ),
  ).toBe('0 base, −1 mod');
});
