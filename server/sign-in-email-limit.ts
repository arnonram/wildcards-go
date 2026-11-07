import { createHmac } from 'node:crypto';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 3;

type RateLimitRow = { id: string; key: string; count: number; lastRequest: number };
type Where = { field: string; value: string }[];

/** The slice of Better Auth's database adapter this needs. */
export type LimitAdapter = {
  findOne<T>(args: { model: string; where: Where }): Promise<T | null>;
  create<T extends Record<string, unknown>>(args: { model: string; data: T }): Promise<unknown>;
  update<T>(args: {
    model: string;
    where: Where;
    update: Record<string, unknown>;
  }): Promise<T | null>;
};

/**
 * One inbox, however it's spelled: case and a `+tag` don't make a new
 * address, so they don't get new slots.
 */
export function inboxOf(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  return domain === undefined ? local : `${local.split('+')[0]}@${domain}`;
}

/**
 * Better Auth limits sign-in requests per IP only, so anyone rotating IPs
 * could flood one inbox with sign-in emails and use up the daily sending
 * quota. This allows a few emails per address per window, counted in Better
 * Auth's own `rateLimit` table. The key is an HMAC of the address, so the
 * table never holds an email address.
 *
 * `lastRequest` holds when the window ENDS. Better Auth's limiter prunes
 * every row whose `lastRequest` is older than its longest window (a minute),
 * so a row holding the window's start would vanish long before it expired.
 *
 * Returns the seconds to wait when the address is over its limit, else null
 * (and counts this send). Two racing requests can both pass; that's fine.
 */
export async function takeSignInEmailSlot(
  adapter: LimitAdapter,
  secret: string,
  email: string,
  now: number,
): Promise<number | null> {
  const digest = createHmac('sha256', secret).update(inboxOf(email)).digest('hex');
  const key = `sign-in-email|${digest}`;
  const where = [{ field: 'key', value: key }];
  const read = () => adapter.findOne<RateLimitRow>({ model: 'rateLimit', where });

  let row = await read();
  if (!row) {
    try {
      await adapter.create({
        model: 'rateLimit',
        data: { key, count: 1, lastRequest: now + WINDOW_MS },
      });
      return null;
    } catch (error) {
      // A racing first send created it (SQLite's key is unique): count on it.
      // MongoDB has no unique index here, so a race there makes a second row
      // instead; that lets through one extra email at most.
      row = await read();
      if (!row) throw error;
    }
  }
  if (now >= row.lastRequest) {
    await adapter.update({
      model: 'rateLimit',
      where,
      update: { count: 1, lastRequest: now + WINDOW_MS },
    });
    return null;
  }
  if (row.count >= MAX_PER_WINDOW) return Math.ceil((row.lastRequest - now) / 1000);
  await adapter.update({ model: 'rateLimit', where, update: { count: row.count + 1 } });
  return null;
}
