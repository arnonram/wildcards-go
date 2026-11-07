import { expect, test } from 'bun:test';
import { inboxOf, type LimitAdapter, takeSignInEmailSlot } from './sign-in-email-limit';

type Row = { id: string; key: string; count: number; lastRequest: number };

/** Better Auth's `rateLimit` table, with its unique key and its pruning. */
function fakeTable() {
  const rows = new Map<string, Row>();
  const adapter: LimitAdapter = {
    async findOne<T>({ where }: { where: { value: string }[] }) {
      return (rows.get(where[0].value) ?? null) as T | null;
    },
    async create({ data }) {
      const row = data as unknown as Row;
      if (rows.has(row.key)) throw new Error('UNIQUE constraint failed: rateLimit.key');
      rows.set(row.key, { ...row, id: row.key });
      return row;
    },
    async update<T>({ where, update }: { where: { value: string }[]; update: object }) {
      const row = rows.get(where[0].value);
      if (row) Object.assign(row, update);
      return (row ?? null) as T | null;
    },
  };
  /** What Better Auth's limiter does whenever an IP window resets. */
  const prune = (now: number, longestWindowMs = 60_000) => {
    for (const [key, row] of rows) if (row.lastRequest < now - longestWindowMs) rows.delete(key);
  };
  return { adapter, rows, prune };
}

const SECRET = 'test-secret';
const MINUTE = 60_000;

test('three per address per 15 minutes, then the wait in seconds', async () => {
  const { adapter } = fakeTable();
  const take = (now: number) => takeSignInEmailSlot(adapter, SECRET, 'a@example.com', now);
  expect(await take(0)).toBeNull();
  expect(await take(MINUTE)).toBeNull();
  expect(await take(2 * MINUTE)).toBeNull();
  expect(await take(5 * MINUTE)).toBe(600);
  expect(await take(15 * MINUTE)).toBeNull();
});

test("Better Auth's pruning does not reset an open window", async () => {
  const { adapter, prune } = fakeTable();
  const take = (now: number) => takeSignInEmailSlot(adapter, SECRET, 'a@example.com', now);
  for (let i = 0; i < 3; i++) await take(i);
  prune(10 * MINUTE);
  expect(await take(10 * MINUTE)).not.toBeNull();
});

test('a racing first send counts on the row the other one created', async () => {
  const { adapter, rows } = fakeTable();
  const racing: LimitAdapter = { ...adapter, findOne: async () => null };
  await takeSignInEmailSlot(adapter, SECRET, 'a@example.com', 0);
  // findOne missed the row, so create collides; the retry must re-read it.
  let reads = 0;
  racing.findOne = async (args) => (reads++ === 0 ? null : adapter.findOne(args));
  expect(await takeSignInEmailSlot(racing, SECRET, 'a@example.com', 1)).toBeNull();
  expect([...rows.values()][0].count).toBe(2);
});

test('case and +tags share one inbox', () => {
  expect(inboxOf(' Ann+Spam@Example.com ')).toBe('ann@example.com');
  expect(inboxOf('ann@example.com')).toBe('ann@example.com');
});
