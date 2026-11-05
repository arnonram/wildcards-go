import { afterEach, expect, spyOn, test } from 'bun:test';
import { newId } from './new-id';

afterEach(() => {
  // Restores crypto.randomUUID if a test replaced it.
  spyOn(crypto, 'randomUUID').mockRestore();
});

test('ids are version 4 UUIDs, like crypto.randomUUID makes', () => {
  expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('ids do not repeat', () => {
  const ids = new Set(Array.from({ length: 10_000 }, newId));
  expect(ids.size).toBe(10_000);
});

test('ids work where crypto.randomUUID is missing, as on plain http pages', () => {
  const randomUUID = spyOn(crypto, 'randomUUID').mockImplementation(() => {
    throw new TypeError('crypto.randomUUID is not a function');
  });
  expect(newId()).toHaveLength(36);
  expect(randomUUID).not.toHaveBeenCalled();
});
