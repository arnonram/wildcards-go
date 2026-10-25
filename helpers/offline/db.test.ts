import { expect, test } from 'bun:test';
import { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { type LocalCharacter, openTestDb } from './db';

function row(id: string, dirty: 0 | 1): LocalCharacter {
  return {
    id,
    data: { ...new WildCardCharacter('x'), _id: id },
    version: 0,
    dirty,
    deleted: 0,
    localUpdatedAt: 1,
  };
}

test('round-trips a character and queries dirty rows', async () => {
  const db = openTestDb(crypto.randomUUID());
  await db.characters.bulkPut([row('a', 1), row('b', 0)]);
  expect(await db.characters.where('dirty').equals(1).count()).toBe(1);
  expect((await db.characters.get('b'))?.data.name).toBe('x');
});
