# Sync Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close five gaps in the offline sync: pulls that skip late-committed writes, tombstones that keep full data, orphaned portraits (server and client), a racy MongoDB connection cache, and a collection scan on every pull.

**Architecture:** All server changes stay in `server/character-store.ts` (store logic) and `helpers/db-util.ts` (connection). The route handlers only pass new arguments and map new results to status codes. The one client change is in `applyPulled` in `helpers/offline/sync.ts`.

**Tech Stack:** Next 16 pages API routes, MongoDB driver 7, Dexie 4, `bun test` (server tests need MongoDB running: `bun run start:mongo`).

**Spec:** Review items #3–7 from the 2026-10-25 repo review (no separate spec doc); summarized per task below.

## Global Constraints

- The app is not deployed: no data migrations or compatibility shims for old documents.
- Branch `sync-hardening`, in a worktree.
- Every task ends green on `bun test`, `bunx tsc --noEmit -p .`, `bun run check`.
- Match existing style: JSDoc comment explaining *why* on exported functions, `bun:test` with `describe`/`test`, single quotes.

## Review Focus

1. **A write that commits after a pull already ran.** Its `modifiedAt` is older than the cursor that pull returned. It must still reach every device. Covered by Task 1's lag; the race itself can't be reproduced deterministically, so the reviewer should check the reasoning in the JSDoc.
2. **Server clock steps backwards.** The cursor must never go below `since`, or devices would re-pull a widening window forever. Task 1 test `cursor never moves backwards`.
3. **"Keep mine" against a tombstone that no longer has data.** The push must restore the character with full data. Task 2 test `edit on a tombstone restores data`.
4. **Portrait upload for a character deleted on another device.** It must not recreate an orphan on the server. Task 3 test `putPortrait refuses a deleted character`.
5. **MongoDB down on the first request, then back.** Later requests must connect; a rejected connection must not be cached. Task 5 test `failed connect is not cached`.

---

### Task 1: Pull cursor lags behind server time

Problem: `listChangedSince` returns `cursor = max(modifiedAt)`. A write stamped at t=99 that commits after a pull returned cursor 100 is never pulled by that device.

**Files:**
- Modify: `server/character-store.ts` (`listChangedSince`)
- Modify: `pages/api/characters/index.ts` (pass `Date.now()`)
- Modify: `README.md` (the "client pulls characters changed since its last pull" bullet: say the cursor trails server time by 30 s, so recent writes are re-sent and applying them twice is harmless)
- Test: `server/character-store.test.ts`

**Interfaces:**
- Produces: `export const CURSOR_LAG_MS = 30_000;` and `listChangedSince(db: Db, since: number, now: number): Promise<PullResponse>`

- [ ] **Step 1: Write the failing tests** in the `listChangedSince` describe. Add a `const FAR_FUTURE = 1e12;` at the top and pass it as `now` in the three existing tests. They then keep their current expectations.

```ts
test('cursor lags behind now so late commits are re-pulled', async () => {
  const a = character('A');
  const b = character('B');
  await putCharacter(db, a.id, { baseVersion: 0, deleted: false, data: a.data }, 1000);
  await putCharacter(db, b.id, { baseVersion: 0, deleted: false, data: b.data }, 50_000);
  const result = await listChangedSince(db, 0, 60_000);
  expect(result.characters).toHaveLength(2);
  expect(result.cursor).toBe(60_000 - CURSOR_LAG_MS);
});

test('cursor never moves backwards', async () => {
  expect(await listChangedSince(db, 40_000, 50_000)).toEqual({ characters: [], cursor: 40_000 });
});
```

- [ ] **Step 2: Run, expect FAIL** — `bun test server/character-store.test.ts`. Expect a missing `CURSOR_LAG_MS` export and the cursor mismatch.

- [ ] **Step 3: Implement.** `cursor = Math.max(since, Math.min(maxSeen, now - CURSOR_LAG_MS))`. Extend the JSDoc: `modifiedAt` is stamped before the write commits, so a slow write can land below a cursor already handed out; trailing by 30 s re-sends recent rows, which the client ignores by version. Route passes `Date.now()`.

- [ ] **Step 4: Run, expect PASS** — `bun test server/character-store.test.ts`

- [ ] **Step 5: Commit** — `fix(sync): trail pull cursor behind server time`

---

### Task 2: Tombstones carry no character data

Problem: a deleted character keeps its full `data` forever, and every new device downloads it.

**Files:**
- Modify: `dtos/sync.ts` (`ServerCharacter`)
- Modify: `server/character-store.ts` (`CharacterDoc`, `putCharacter`, `toServerCharacter`)
- Modify: any client code `tsc` flags after the type change (expected: none, or only `sameContent` in `helpers/offline/sync.ts`; every other reader already checks `deleted` first)
- Test: `server/character-store.test.ts`

**Interfaces:**
- Produces:

```ts
interface ServerCharacterBase { id: string; version: number; modifiedAt: number }
export type ServerCharacter = ServerCharacterBase &
  ({ deleted: false; data: WildCardCharacter } | { deleted: true; data?: undefined });
```

  `CharacterDoc.data` becomes optional. When `body.deleted`, `putCharacter` `$unset`s `data` (and the insert path omits it). `toServerCharacter` emits `data` only for live docs.

- [ ] **Step 1: Write the failing tests.** Extend `delete is a versioned write` with `expect(characters[0].data).toBeUndefined();`, then add:

```ts
test('edit on a tombstone restores data', async () => {
  const { id, data } = character('Ana');
  await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
  await putCharacter(db, id, { baseVersion: 1, deleted: true, data }, 2000);
  const result = await putCharacter(db, id, { baseVersion: 2, deleted: false, data }, 3000);
  expect(result).toEqual({ ok: { version: 3, modifiedAt: 3000 } });
  const { characters } = await listChangedSince(db, 0, FAR_FUTURE);
  expect(characters[0]).toEqual({ id, version: 3, modifiedAt: 3000, deleted: false, data });
});
```

- [ ] **Step 2: Run, expect FAIL** — `bun test server/character-store.test.ts`
- [ ] **Step 3: Implement** the type and store changes above. Then run `bunx tsc --noEmit -p .` and fix what it flags.
- [ ] **Step 4: Run, expect PASS** — `bun test` (whole suite: the client sync tests build `ServerCharacter` values)
- [ ] **Step 5: Commit** — `fix(sync): drop character data from tombstones`

---

### Task 3: Server portraits follow their character's lifecycle

Problem: deleting a character leaves its `portraits` doc. A portrait PUT for a deleted character recreates one.

**Files:**
- Modify: `server/character-store.ts` (`putCharacter`, `putPortrait`)
- Modify: `pages/api/characters/[id]/portrait.ts` (PUT: `404 { message: 'No such character' }` when `putPortrait` returns false)
- Test: `server/character-store.test.ts`

**Interfaces:**
- Consumes: Task 2's `putCharacter`.
- Produces: `putPortrait(db, id, rev, contentType, bytes): Promise<boolean>`. Returns false, and writes nothing, when the character is missing or deleted. A successful `putCharacter` with `deleted: true` deletes the `portraits` doc for that id.

- [ ] **Step 1: Write the failing tests** in the `portraits` describe. The existing portrait tests must first create the character with `putCharacter`, since `putPortrait` now requires one; add a small `async function live(id)` helper for that.

```ts
test('deleting a character deletes its portrait', async () => {
  const { id, data } = character('Ana');
  await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
  await putPortrait(db, id, 'r1', 'image/webp', new Uint8Array([1]));
  await putCharacter(db, id, { baseVersion: 1, deleted: true, data }, 2000);
  expect(await getPortrait(db, id)).toBeNull();
});

test('putPortrait refuses a deleted character', async () => {
  const { id, data } = character('Ana');
  await putCharacter(db, id, { baseVersion: 0, deleted: false, data }, 1000);
  await putCharacter(db, id, { baseVersion: 1, deleted: true, data }, 2000);
  expect(await putPortrait(db, id, 'r1', 'image/webp', new Uint8Array([1]))).toBe(false);
  expect(await getPortrait(db, id)).toBeNull();
});

test('putPortrait refuses an unknown character', async () => {
  expect(await putPortrait(db, crypto.randomUUID(), 'r1', 'image/webp', new Uint8Array([1]))).toBe(false);
});
```

- [ ] **Step 2: Run, expect FAIL** — `bun test server/character-store.test.ts`
- [ ] **Step 3: Implement.** In `putPortrait`, a `findOne({ _id: id, deleted: false })` check before the upsert is enough. A delete landing between the check and the upsert leaves a rare orphan; accept that and note it in the JSDoc rather than adding a transaction. The client treats the 404 as permanent and logs it; the same run's pull then removes the local row (Task 4).
- [ ] **Step 4: Run, expect PASS** — `bun test server/character-store.test.ts`
- [ ] **Step 5: Commit** — `fix(sync): delete portraits with their character`

---

### Task 4: Client drops the portrait when a pull deletes the character

Problem: `applyPulled` (`helpers/offline/sync.ts:243-245`) deletes the character row but leaves its blob in `portraits`.

**Files:**
- Modify: `helpers/offline/sync.ts` (`applyPulled`: add `database.portraits` to the transaction and delete it next to the character)
- Test: `helpers/offline/sync.test.ts`

**Interfaces:**
- Consumes: Task 2's `ServerCharacter` (a deleted one has no `data`).

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run, expect FAIL** — `bun test helpers/offline/sync.test.ts`. The portrait assertion fails.
- [ ] **Step 3: Implement** as described under Files.
- [ ] **Step 4: Run, expect PASS** — `bun test helpers/offline/sync.test.ts`
- [ ] **Step 5: Commit** — `fix(offline): drop local portrait on pulled delete`

---

### Task 5: Single shared MongoDB connection, with indexes

Problem: concurrent first requests each create a `MongoClient`, and `next dev` HMR resets the module cache and leaks clients. Separately, there is no index on `modifiedAt`, so every pull scans the whole collection.

**Files:**
- Modify: `helpers/db-util.ts`
- Modify: `server/character-store.ts` (add `ensureIndexes`)
- Test: create `helpers/db-util.test.ts`, extend `server/character-store.test.ts`

**Interfaces:**
- Produces:
  - `connectToDb(): Promise<{ client: MongoClient; db: Db }>` (unchanged signature). Reads `MONGODB_URI`/`MONGODB_DB` per call, not at module load, so tests can set them. Caches the connect *promise* on `globalThis` (key `__wcgMongo`). Clears the cache if the promise rejects. Calls `ensureIndexes(db)` once, before resolving.
  - `ensureIndexes(db: Db): Promise<void>` in `server/character-store.ts`: `characters` gets `{ modifiedAt: 1 }`. Idempotent (`createIndex`).

- [ ] **Step 1: Write the failing tests.**

`server/character-store.test.ts`:

```ts
test('ensureIndexes indexes modifiedAt', async () => {
  await ensureIndexes(db);
  const names = (await db.collection('characters').indexes()).map((i) => i.name);
  expect(names).toContain('modifiedAt_1');
});
```

`helpers/db-util.test.ts`. The tests depend on order, sharing one `globalThis` cache; say so in a comment.

```ts
test('failed connect is not cached', async () => {
  delete process.env.MONGODB_URI;
  await expect(connectToDb()).rejects.toThrow('MONGODB_URI');
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = 'wcg_test_dbutil';
  const { db } = await connectToDb();
  expect(db.databaseName).toBe('wcg_test_dbutil');
});

test('concurrent callers share one client', async () => {
  const [a, b] = await Promise.all([connectToDb(), connectToDb()]);
  expect(a.client).toBe(b.client);
});
```

  `uri` is `process.env.MONGODB_URI ?? 'mongodb://localhost:27017'`, captured at the top. `afterAll` closes the client and drops `wcg_test_dbutil`.

- [ ] **Step 2: Run, expect FAIL** — `bun test helpers/db-util.test.ts server/character-store.test.ts`
- [ ] **Step 3: Implement** per the Interfaces block. Keep `serverSelectionTimeoutMS: 5_000` and its comment.
- [ ] **Step 4: Run, expect PASS** — `bun test`, then `bunx tsc --noEmit -p .` and `bun run check`
- [ ] **Step 5: Commit** — `fix(db): share one Mongo connection and index modifiedAt`

---

### Task 6: Manual smoke check

- [ ] `bun run build && bun run start` with Mongo up. In two browser profiles: create a character with a portrait in A and confirm it appears in B; delete it in A; within 30 s confirm it is gone in B. In DevTools → Application → IndexedDB `wcg` → `portraits`, confirm no row for that id.
- [ ] In `mongosh`, check that `db.characters.findOne({deleted: true})` has no `data` field and that `db.portraits.countDocuments({_id: <id>})` is 0.
