import { expect, test } from 'bun:test';
import { safeNext } from './safe-next';

test('safeNext rejects off-site targets', () => {
  expect(safeNext('/character/abc')).toBe('/character/abc');
  expect(safeNext(['/load-character', '/x'])).toBe('/load-character');
  expect(safeNext('https://evil.example')).toBe('/');
  expect(safeNext('//evil.example')).toBe('/');
  expect(safeNext('/\\evil.example')).toBe('/');
  expect(safeNext('javascript:alert(1)')).toBe('/');
  expect(safeNext(undefined)).toBe('/');
});
