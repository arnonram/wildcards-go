import { afterEach, beforeEach, expect, test } from 'bun:test';
import type { PutCharacterBody, ServerCharacter } from '../../dtos/sync';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { createCharacter, deleteCharacter, saveCharacter, setPortrait } from './characters';
import { openTestDb, type WcgDb } from './db';
import { createSyncEngine, type SyncEngine } from './sync';

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

let db: WcgDb;
let engine: SyncEngine;
let handler: Handler;
let requests: { method: string; path: string; body?: PutCharacterBody }[];
const realFetch = globalThis.fetch;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** A server that accepts every write and has nothing new to pull. */
const acceptAll: Handler = (url, init) => {
  if (init.method === 'PUT' && url.pathname.endsWith('/portrait')) {
    return new Response(null, { status: 204 });
  }
  if (init.method === 'PUT') {
    const body = JSON.parse(init.body as string) as PutCharacterBody;
    return json(200, { version: body.baseVersion + 1, modifiedAt: 1 });
  }
  return json(200, { characters: [], cursor: 0 });
};

beforeEach(() => {
  db = openTestDb(crypto.randomUUID());
  engine = createSyncEngine(db, 'u1');
  handler = acceptAll;
  requests = [];
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  globalThis.fetch = (async (input: string | URL, rawInit: RequestInit = {}) => {
    const init = { ...rawInit, method: rawInit.method ?? 'GET' };
    const url = new URL(String(input), 'http://test');
    const isCharacterPut = init.method === 'PUT' && !url.pathname.endsWith('/portrait');
    requests.push({
      method: init.method,
      path: url.pathname,
      body: isCharacterPut ? JSON.parse(init.body as string) : undefined,
    });
    return handler(url, init);
  }) as typeof fetch;
});

afterEach(() => {
  engine.dispose();
  globalThis.fetch = realFetch;
});

async function row(id: string) {
  const found = await db.characters.get(id);
  if (!found) throw new Error(`no row ${id}`);
  return found;
}

function puts() {
  return requests.filter((r) => r.method === 'PUT' && !r.path.endsWith('/portrait'));
}

function server(id: string, version: number, data: Partial<WildCardCharacter>): ServerCharacter {
  return {
    id,
    version,
    modifiedAt: 10,
    deleted: false,
    data: { _id: id, ...data } as WildCardCharacter,
  };
}

test('pushes dirty rows and clears dirty with server version', async () => {
  const id = await createCharacter(db);
  await engine.syncNow();
  const pushed = await row(id);
  expect(puts()[0].body?.baseVersion).toBe(0);
  expect(pushed.version).toBe(1);
  expect(pushed.dirty).toBe(0);
  expect(engine.getStatus().pending).toBe(0);
});

test('edit during push stays dirty with new baseVersion', async () => {
  const id = await createCharacter(db);
  handler = async (url, init) => {
    if (init.method === 'PUT') {
      await saveCharacter({ ...(await row(id)).data, name: 'Typed meanwhile' }, db);
      handler = acceptAll;
      return json(200, { version: 1, modifiedAt: 1 });
    }
    return acceptAll(url, init);
  };
  await engine.syncNow();
  const afterFirst = await row(id);
  expect(afterFirst.version).toBe(1);
  expect(afterFirst.dirty).toBe(1);

  await engine.syncNow();
  expect(puts()[1].body?.baseVersion).toBe(1);
  expect(puts()[1].body?.data.name).toBe('Typed meanwhile');
  expect((await row(id)).dirty).toBe(0);
});

test('409 with different data records conflict and keeps dirty', async () => {
  const id = await createCharacter(db);
  handler = (url, init) =>
    init.method === 'PUT'
      ? json(409, { server: server(id, 3, { name: 'Other device' }) })
      : acceptAll(url, init);
  await engine.syncNow();
  const conflicted = await row(id);
  expect(conflicted.conflict?.version).toBe(3);
  expect(conflicted.dirty).toBe(1);
  expect(engine.getStatus().conflicts).toBe(1);

  await engine.syncNow();
  expect(puts()).toHaveLength(1);
});

test('409 with identical data clears dirty instead of conflicting', async () => {
  const id = await createCharacter(db);
  const local = (await row(id)).data;
  handler = (url, init) =>
    init.method === 'PUT'
      ? json(409, { server: { ...server(id, 2, {}), data: JSON.parse(JSON.stringify(local)) } })
      : acceptAll(url, init);
  await engine.syncNow();
  const settled = await row(id);
  expect(settled.conflict).toBeUndefined();
  expect(settled.dirty).toBe(0);
  expect(settled.version).toBe(2);
});

test('409 with null server records null conflict', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { version: 5 });
  handler = (url, init) =>
    init.method === 'PUT' ? json(409, { server: null }) : acceptAll(url, init);
  await engine.syncNow();
  expect((await row(id)).conflict).toBeNull();
});

test('503 stops the run and schedules a retry', async () => {
  await createCharacter(db);
  await createCharacter(db);
  handler = (url, init) =>
    init.method === 'PUT' ? json(503, { message: 'Database unavailable' }) : acceptAll(url, init);
  await engine.syncNow();
  expect(puts()).toHaveLength(1);
  expect(engine.getStatus().lastError).not.toBeNull();
  expect(engine.getStatus().pending).toBe(2);
  expect(engine.retryScheduled()).toBe(true);
});

test('400 on one row does not block the next', async () => {
  const bad = await createCharacter(db);
  const good = await createCharacter(db);
  handler = (url, init) =>
    init.method === 'PUT' && url.pathname.endsWith(bad)
      ? json(400, { message: 'Expected { baseVersion, deleted, data }' })
      : acceptAll(url, init);
  await engine.syncNow();
  expect(puts()).toHaveLength(2);
  expect((await row(bad)).syncError).toBeString();
  expect((await row(good)).dirty).toBe(0);
  expect(engine.retryScheduled()).toBe(false);

  await engine.syncNow();
  expect(puts()).toHaveLength(2);

  await engine.syncNow({ force: true });
  expect(puts()).toHaveLength(3);
});

test('pull inserts unknown rows and replaces clean older rows', async () => {
  const known = await createCharacter(db);
  await db.characters.update(known, { dirty: 0, version: 1 });
  const unknown = crypto.randomUUID();
  handler = (url, init) =>
    init.method === 'GET'
      ? json(200, {
          characters: [server(known, 2, { name: 'Renamed' }), server(unknown, 1, { name: 'New' })],
          cursor: 10,
        })
      : acceptAll(url, init);
  await engine.syncNow();
  expect((await row(known)).data.name).toBe('Renamed');
  expect((await row(known)).version).toBe(2);
  expect((await row(unknown)).data.name).toBe('New');
  expect((await row(unknown)).dirty).toBe(0);
  expect((await db.meta.get('pullCursor'))?.value).toBe(10);
});

test('pull does not insert rows already deleted on the server', async () => {
  const gone = crypto.randomUUID();
  handler = (url, init) =>
    init.method === 'GET'
      ? json(200, { characters: [{ ...server(gone, 2, {}), deleted: true }], cursor: 10 })
      : acceptAll(url, init);
  await engine.syncNow();
  expect(await db.characters.get(gone)).toBeUndefined();
});

test('pull leaves dirty rows untouched', async () => {
  const id = await createCharacter(db);
  await saveCharacter({ ...(await row(id)).data, name: 'Mine' }, db);
  await db.characters.update(id, { version: 1 });
  handler = (_url, init) => {
    if (init.method === 'GET') {
      return json(200, { characters: [server(id, 2, { name: 'Theirs' })], cursor: 10 });
    }
    return json(503, {});
  };
  await engine.syncNow();
  expect((await row(id)).data.name).toBe('Mine');
});

test('pull fetches portrait when rev differs', async () => {
  const id = crypto.randomUUID();
  handler = (url, init) => {
    if (url.pathname.endsWith('/portrait')) {
      return new Response(new Uint8Array([7]), {
        status: 200,
        headers: { 'Content-Type': 'image/webp', 'X-Portrait-Rev': 'rev-9' },
      });
    }
    if (init.method === 'GET') {
      return json(200, { characters: [server(id, 1, { portraitRev: 'rev-9' })], cursor: 10 });
    }
    return acceptAll(url, init);
  };
  await engine.syncNow();
  const portrait = await db.portraits.get(id);
  expect(portrait?.rev).toBe('rev-9');
  expect(portrait?.dirty).toBe(0);
});

test('pushes dirty portraits once the character exists on the server', async () => {
  const id = await createCharacter(db);
  await setPortrait(id, new Blob([new Uint8Array([1])], { type: 'image/webp' }), db);
  await engine.syncNow();
  expect(requests.some((r) => r.method === 'PUT' && r.path.endsWith('/portrait'))).toBe(true);
  expect((await db.portraits.get(id))?.dirty).toBe(0);
});

test('deleted row is removed locally after the server confirms', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { version: 1, dirty: 1, deleted: 1 });
  await engine.syncNow();
  expect(puts()[0].body?.deleted).toBe(true);
  expect(await db.characters.get(id)).toBeUndefined();
});

test('never-pushed deleted row is dropped without a request', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { deleted: 1 });
  await engine.syncNow();
  expect(puts()).toHaveLength(0);
  expect(await db.characters.get(id)).toBeUndefined();
});

test('offline run makes no requests', async () => {
  await createCharacter(db);
  Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });
  await engine.syncNow();
  expect(requests).toHaveLength(0);
  expect(engine.getStatus().online).toBe(false);
});

test('delete that conflicts with a newer edit restores the edited copy', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { version: 1, dirty: 0 });
  await deleteCharacter(id, db);
  handler = (url, init) =>
    init.method === 'PUT'
      ? json(409, { server: server(id, 2, { name: 'Edited elsewhere' }) })
      : acceptAll(url, init);
  await engine.syncNow();
  const restored = await row(id);
  expect(restored.deleted).toBe(0);
  expect(restored.dirty).toBe(0);
  expect(restored.version).toBe(2);
  expect(restored.data.name).toBe('Edited elsewhere');
  expect(restored.conflict).toBeUndefined();
  expect(engine.getStatus().conflicts).toBe(0);
});

test('delete that conflicts with a missing server copy drops the row', async () => {
  const id = await createCharacter(db);
  await db.characters.update(id, { version: 3, dirty: 0 });
  await deleteCharacter(id, db);
  handler = (url, init) =>
    init.method === 'PUT' ? json(409, { server: null }) : acceptAll(url, init);
  await engine.syncNow();
  expect(await db.characters.get(id)).toBeUndefined();
  expect(engine.getStatus().pending).toBe(0);
});

test('pulled delete removes the local portrait too', async () => {
  const id = await createCharacter(db);
  await setPortrait(id, new Blob(['x'], { type: 'image/webp' }), db);
  await engine.syncNow(); // pushes; row and portrait now clean, version 1
  handler = (url, init) =>
    init.method === 'GET' && url.pathname === '/api/characters'
      ? json(200, { characters: [{ id, version: 2, modifiedAt: 20, deleted: true }], cursor: 20 })
      : acceptAll(url, init);
  await engine.syncNow();
  expect(await db.characters.get(id)).toBeUndefined();
  expect(await db.portraits.get(id)).toBeUndefined();
});

test('requests carry the store owner header', async () => {
  await createCharacter(db);
  const owners = new Set<string | null>();
  handler = (url, init) => {
    owners.add(new Headers(init.headers).get('X-WCG-Store-Owner'));
    return acceptAll(url, init);
  };
  await engine.syncNow();
  expect([...owners]).toEqual(['u1']);
});

test('401 sets signedOut without marking rows or scheduling a retry', async () => {
  const id = await createCharacter(db);
  handler = () => json(401, { message: 'Sign in to sync' });
  await engine.syncNow();
  expect(engine.getStatus().signedOut).toBe(true);
  expect(engine.getStatus().lastError).toBeNull();
  expect((await row(id)).syncError).toBeUndefined();
  expect(engine.retryScheduled()).toBe(false);
});

test('a successful run after 401 clears signedOut', async () => {
  await createCharacter(db);
  handler = () => json(401, {});
  await engine.syncNow();
  handler = acceptAll;
  await engine.syncNow();
  expect(engine.getStatus().signedOut).toBe(false);
});
