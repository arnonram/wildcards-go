import { beforeEach, expect, test } from 'bun:test';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { adoptSignedOutCharacters, countSignedOutCharacters } from './adopt';
import { type LocalCharacter, openTestDb, type WcgDb } from './db';

let source: WcgDb;
let target: WcgDb;

beforeEach(() => {
  source = openTestDb(crypto.randomUUID());
  target = openTestDb(crypto.randomUUID());
});

function row(id: string, patch: Partial<LocalCharacter> = {}): LocalCharacter {
  return {
    id,
    data: { _id: id, name: id } as WildCardCharacter,
    version: 0,
    dirty: 1,
    deleted: 0,
    localUpdatedAt: 1,
    ...patch,
  };
}

test('counts only characters that are not deleted', async () => {
  await source.characters.bulkAdd([row('c1'), row('c2', { deleted: 1 })]);
  expect(await countSignedOutCharacters(source)).toBe(1);
});

test('adopted rows are reset to unsynced and portraits marked dirty', async () => {
  await source.characters.add(row('c1', { version: 4, dirty: 0, syncError: 'x', conflict: null }));
  await source.portraits.add({ id: 'c1', rev: 'r', blob: new Blob(['x']), dirty: 0 });
  expect(await adoptSignedOutCharacters(source, target)).toBe(1);
  const moved = await target.characters.get('c1');
  expect(moved).toMatchObject({ version: 0, dirty: 1, deleted: 0 });
  expect(moved?.syncError).toBeUndefined();
  expect(moved?.conflict).toBeUndefined();
  expect(moved?.localUpdatedAt).toBeGreaterThan(1);
  expect((await target.portraits.get('c1'))?.dirty).toBe(1);
  expect(await source.characters.count()).toBe(0);
  expect(await source.portraits.count()).toBe(0);
});

test('deleted rows are dropped, not moved', async () => {
  await source.characters.add(row('c1', { deleted: 1 }));
  await source.portraits.add({ id: 'c1', rev: 'r', blob: new Blob(['x']), dirty: 0 });
  expect(await adoptSignedOutCharacters(source, target)).toBe(0);
  expect(await target.characters.count()).toBe(0);
  expect(await source.characters.count()).toBe(0);
  expect(await source.portraits.count()).toBe(0);
});

test('rerun after an interrupted move leaves no source copy', async () => {
  await source.characters.add(
    row('c1', { data: { _id: 'c1', name: 'source' } as WildCardCharacter }),
  );
  await target.characters.add(
    row('c1', { data: { _id: 'c1', name: 'target' } as WildCardCharacter }),
  );
  expect(await adoptSignedOutCharacters(source, target)).toBe(0);
  expect((await target.characters.get('c1'))?.data.name).toBe('target');
  expect(await source.characters.count()).toBe(0);
});

test('pull cursor is never copied', async () => {
  await source.meta.put({ key: 'pullCursor', value: 99 });
  await source.characters.add(row('c1'));
  await adoptSignedOutCharacters(source, target);
  expect(await target.meta.get('pullCursor')).toBeUndefined();
});
