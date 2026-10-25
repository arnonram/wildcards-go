# Offline-First Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Wild Cards Go fully usable offline by making IndexedDB the source of truth and syncing each character with MongoDB using server-assigned versions.

**Architecture:** The browser holds every character in Dexie (IndexedDB). Edits write the local row at once and mark it `dirty`. A sync engine pushes dirty rows with `PUT /api/characters/:id` and `baseVersion`; the server applies the write only if the version matches, otherwise it answers 409 and the UI asks "keep mine / use theirs". A pull (`GET /api/characters?since=`) fetches rows changed on other devices. Portraits are Blobs in their own table and endpoint. Serwist builds the service worker from Next's build output.

**Tech Stack:** Next.js 16 (Pages Router), React 19, TypeScript, MongoDB driver 7, Dexie 4.4.7, dexie-react-hooks 4.4.0, Serwist 9.5.13 (`@serwist/next`, `@serwist/cli`, `serwist`), `bun test`, fake-indexeddb 6.2.6.

**Spec:** No separate spec. The design was agreed in chat on 2026-10-25 and is captured in Architecture, Global Constraints and the Interfaces blocks below. The `offline-mode` branch is a reference only; nothing from it is merged.

## Global Constraints

- Start a new branch `offline-first` from `main`. Do not merge or rebase `offline-mode`.
- The app is in development with no users: no data migration and no compatibility code. Old `characters` documents in the dev DB are discarded (Task 1, Step 1, asks the user first).
- Character ids are `crypto.randomUUID()` strings. MongoDB `_id` is that string, not an ObjectId.
- Versions and the pull cursor come from the server only. The client clock is used only for local `localUpdatedAt` stamps.
- Network timings: request timeout `12_000` ms, push debounce `600` ms, retry delays `[5_000, 15_000, 30_000, 60_000]` ms, background sync interval `30_000` ms.
- Portrait upload limit: `2 * 1024 * 1024` bytes; larger → 413. Portraits stay 512px WebP from `fileToPortraitDataUrl` (changed to return a Blob).
- Pin exact dependency versions in `package.json` (no `^`).
- Biome must pass: `bun run check`.

## Review Focus

1. **Tab closed right after an edit.** Expect the edit to survive a reload. The local write happens on every change, not after the 600 ms debounce. Test: Task 4, `saveCharacter persists without waiting for sync`.
2. **Two tabs open on the same character.** Expect no false conflict. Pushes run under `navigator.locks.request('wcg-sync', …)` so one tab syncs at a time, and a 409 whose server data equals the local data is treated as success. Test: Task 5, `409 with identical data clears dirty instead of conflicting`.
3. **Edit made while a push is in flight.** Expect the new edit to stay dirty and be pushed next, with the version updated from the first push. Test: Task 5, `edit during push stays dirty with new baseVersion`.
4. **Two server writes in the same millisecond.** Expect the pull not to skip one. The cursor uses `modifiedAt >= since` and applying a row is idempotent. Test: Task 2, `listChangedSince includes rows equal to the cursor`.
5. **Server down (503) or offline.** Expect edits to keep working locally, the badge to show "Offline" or "Sync failed", and retries to back off. 4xx other than 408/409/429 marks the row `syncError` and does not block other rows. Test: Task 5, `503 stops the run and schedules a retry` and `400 on one row does not block the next`.

---

## File Structure

| File                                                   | Responsibility                                                                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dtos/sync.ts` (new)                                   | Wire types shared by client and server                                                                                                                                       |
| `dtos/WildCardCharacter.dto.ts` (modify)               | Replace `imageUrl?: string` with `portraitRev?: string`                                                                                                                      |
| `server/character-store.ts` (new)                      | Mongo logic: versioned put, pull since cursor, portrait get/put. Takes `Db` as a parameter so tests can pass a test DB                                                       |
| `pages/api/characters/index.ts` (new)                  | `GET ?since=`                                                                                                                                                                |
| `pages/api/characters/[id].ts` (new)                   | `PUT`                                                                                                                                                                        |
| `pages/api/characters/[id]/portrait.ts` (new)          | `GET`, `PUT` raw image                                                                                                                                                       |
| `helpers/api-error.ts` (new, copy from `offline-mode`) | 503 for Mongo connectivity errors                                                                                                                                            |
| `helpers/offline/db.ts` (new)                          | Dexie schema and row types                                                                                                                                                   |
| `helpers/offline/characters.ts` (new)                  | Local writes: create, save, delete, set portrait, resolve conflict                                                                                                           |
| `helpers/offline/api.ts` (new)                         | `fetch` with timeout, `ApiError`                                                                                                                                             |
| `helpers/offline/sync.ts` (new)                        | Push, pull, retry, status store                                                                                                                                              |
| `helpers/offline/hooks.ts` (new)                       | `useCharacterList`, `useCharacter`, `usePortraitUrl`, `useSyncStatus`                                                                                                        |
| `helpers/context/wildcard-context.tsx` (modify)        | Sheet state backed by the local row                                                                                                                                          |
| `components/character-sheet/ConflictBanner.tsx` (new)  | Keep mine / use theirs                                                                                                                                                       |
| `components/layout/SyncStatus.tsx` (new)               | Sync badge                                                                                                                                                                   |
| `sw/sw.ts`, `serwist.config.js` (new)                  | Service worker                                                                                                                                                               |
| Delete                                                 | `pages/api/character.ts`, `pages/api/character/[characterId].ts`, `helpers/db-actions.ts`, `helpers/api-actions.ts`, `helpers/save-action.ts`, `helpers/wildcard-reducer.ts` |

Tests live next to code as `*.test.ts`. Client tests import `fake-indexeddb/auto` first. Server tests need the Docker Mongo (`bun run start:mongo`): they open their own `MongoClient` on `process.env.MONGODB_URI ?? 'mongodb://localhost:27017'`, use DB `wcg_test`, and drop it in `beforeEach`.

---

### Task 1: Server — versioned character store and API

**Files:**
- Create: `dtos/sync.ts`, `server/character-store.ts`, `server/character-store.test.ts`, `pages/api/characters/index.ts`, `pages/api/characters/[id].ts`, `helpers/api-error.ts`
- Modify: `package.json` (add `"test": "bun test"`)
- Delete: `pages/api/character.ts`, `pages/api/character/[characterId].ts`, `helpers/db-actions.ts`

**Interfaces:**
- Produces (`dtos/sync.ts`):

  ```ts
  export interface ServerCharacter { id: string; version: number; modifiedAt: number; deleted: boolean; data: WildCardCharacter }
  export interface PutCharacterBody { baseVersion: number; deleted: boolean; data: WildCardCharacter }
  export interface PutCharacterOk { version: number; modifiedAt: number }
  export interface ConflictBody { server: ServerCharacter | null }
  export interface PullResponse { characters: ServerCharacter[]; cursor: number }
  ```
- Produces (`server/character-store.ts`):
  - `putCharacter(db: Db, id: string, body: PutCharacterBody, now: number): Promise<{ ok: PutCharacterOk } | { conflict: ServerCharacter | null }>`
  - `listChangedSince(db: Db, since: number): Promise<PullResponse>`. `cursor` = max `modifiedAt` returned, or `since` when nothing is returned.
- HTTP:
  - `PUT /api/characters/:id` → 200 `PutCharacterOk` | 409 `ConflictBody` | 400 `{message}` for an invalid id or body | 503 when Mongo is down.
  - `GET /api/characters?since=<number>` (default 0) → 200 `PullResponse`.

- [ ] **Step 1: Branch and dev data.** Run `git switch -c offline-first main`. Ask the user before dropping the dev `characters` collection (`docker exec wildcards-mongo mongosh <MONGODB_DB> --eval 'db.characters.drop()'`). Add the dev dependencies `fake-indexeddb@6.2.6` and `@types/bun`, plus the `test` script.
- [ ] **Step 2: Write failing tests** in `server/character-store.test.ts`:
  - `create with baseVersion 0 stores version 1`: `putCharacter(db, id, {baseVersion:0, deleted:false, data}, 1000)` → `{ ok: { version: 1, modifiedAt: 1000 } }`.
  - `create on existing id conflicts`: the second `baseVersion: 0` put → `{ conflict: { id, version: 1, … } }`.
  - `update with matching baseVersion increments`: base 1 → `{ ok: { version: 2 } }`; the stored `data` equals the new data.
  - `stale baseVersion conflicts with server copy`: base 1 after version is 2 → `conflict.version === 2`.
  - `update of missing id conflicts with null`: base 3 on an unknown id → `{ conflict: null }`.
  - `delete is a versioned write`: `deleted: true` → stored `deleted === true`, still returned by the pull.
  - `listChangedSince includes rows equal to the cursor`: two rows at `modifiedAt` 1000 → `listChangedSince(db, 1000)` returns both, `cursor === 1000`.
  - `listChangedSince excludes older rows`: rows at 900 and 1100, since 1000 → only 1100.
- [ ] **Step 3: Run** `bun test server/` → FAIL (module not found).
- [ ] **Step 4: Implement `server/character-store.ts`.** Document shape: `{ _id: id, version, modifiedAt, deleted, data }`. Create: `insertOne`, catching duplicate key (`code === 11000`) → read the doc → conflict. Update: `updateOne({ _id: id, version: baseVersion }, { $set: { data, deleted, modifiedAt: now }, $inc: { version: 1 } })`. If `matchedCount === 0` → read the doc → conflict (`null` if missing). Pull: `find({ modifiedAt: { $gte: since } })`. Strip `_id` from `data` before storing.
- [ ] **Step 5: Implement the API routes.** Id must match `/^[0-9a-f-]{36}$/`. Body checks: `baseVersion` is a non-negative integer, `deleted` is a boolean, `data` is a plain object. Use `Date.now()` for `now`. Wrap errors with `respondWithApiError` (copied from `offline-mode:helpers/api-error.ts`). Return 405 for other methods.
- [ ] **Step 6: Run** `bun test server/` → PASS, then `bunx tsc --noEmit` and `bun run check` → clean. The old client still calls `/api/character` and will 404 at runtime until Task 6; that is expected on this branch.
- [ ] **Step 7: Commit** `feat(api): versioned character sync endpoints`.

### Task 2: Server — portraits

**Files:**
- Modify: `server/character-store.ts`, `server/character-store.test.ts`
- Create: `pages/api/characters/[id]/portrait.ts`

**Interfaces:**
- Produces:
  - `putPortrait(db: Db, id: string, rev: string, contentType: string, bytes: Uint8Array): Promise<void>`
  - `getPortrait(db: Db, id: string): Promise<{ rev: string; contentType: string; bytes: Uint8Array } | null>`
- HTTP:
  - `PUT /api/characters/:id/portrait?rev=<uuid>` with raw body (`export const config = { api: { bodyParser: false } }`) → 204. 413 above 2 MiB. 400 if `Content-Type` is not `image/*` or `rev` is missing.
  - `GET` → 200 bytes with headers `Content-Type` and `X-Portrait-Rev`. 404 if none.

- [ ] **Step 1: Write failing tests:** `putPortrait then getPortrait returns same bytes and rev`; `putPortrait overwrites previous rev`; `getPortrait of unknown id is null`.
- [ ] **Step 2: Run** `bun test server/` → FAIL.
- [ ] **Step 3: Implement.** Collection `portraits`, doc `{ _id: id, rev, contentType, data: Binary }`, upsert with `replaceOne`. The route reads the request stream into a buffer and stops with 413 once it passes 2 MiB.
- [ ] **Step 4: Run** `bun test server/` → PASS.
- [ ] **Step 5: Commit** `feat(api): portrait upload and download`.

### Task 3: Local database (Dexie)

**Files:**
- Create: `helpers/offline/db.ts`, `helpers/offline/db.test.ts`
- Modify: `package.json` (add `dexie@4.4.7`, `dexie-react-hooks@4.4.0`), `dtos/WildCardCharacter.dto.ts` (`imageUrl` → `portraitRev?: string`)

**Interfaces:**
- Produces:

  ```ts
  export interface LocalCharacter {
    id: string; data: WildCardCharacter; version: number; // 0 = never pushed
    dirty: 0 | 1; deleted: 0 | 1; localUpdatedAt: number;
    syncError?: string; conflict?: ServerCharacter | null; // undefined = no conflict
  }
  export interface LocalPortrait { id: string; rev: string; blob: Blob; dirty: 0 | 1 }
  export interface MetaRow { key: 'pullCursor'; value: number }
  export class WcgDb extends Dexie { characters; portraits; meta }
  export const db: WcgDb;
  export function openTestDb(name: string): WcgDb; // for tests
  ```

  Schema v1: `characters: 'id, dirty, deleted'`, `portraits: 'id, dirty'`, `meta: 'key'`. The flags are `0 | 1` because IndexedDB cannot index booleans.

- [ ] **Step 1: Write failing test** `round-trips a character and queries dirty rows`: put two rows (`dirty` 1 and 0) → `characters.where('dirty').equals(1).count() === 1`.
- [ ] **Step 2: Run** `bun test helpers/offline/db.test.ts` → FAIL.
- [ ] **Step 3: Implement `db.ts`.** On first open in the browser, call `navigator.storage?.persist?.()` once.
- [ ] **Step 4: Run** → PASS. **Commit** `feat(offline): dexie schema`.

### Task 4: Local character operations

**Files:**
- Create: `helpers/offline/characters.ts`, `helpers/offline/characters.test.ts`
- Modify: `helpers/image-helpers.ts` (`fileToPortraitBlob(file: File): Promise<Blob>`, same crop and quality via `canvas.toBlob`)

**Interfaces:**
- Consumes: `db`, `LocalCharacter`, `LocalPortrait` (Task 3).
- Produces (all take an optional `database = db` last parameter for tests):
  - `createCharacter(): Promise<string>`: new id, `new WildCardCharacter()` with `_id = id`, version 0, dirty 1.
  - `saveCharacter(data: WildCardCharacter): Promise<number>`: writes `data`, sets dirty 1, clears `syncError`, sets `localUpdatedAt = Date.now()`, returns that stamp.
  - `deleteCharacter(id: string): Promise<void>`: deleted 1, dirty 1.
  - `setPortrait(id: string, blob: Blob): Promise<void>`: in one transaction, a new `rev = crypto.randomUUID()`, portrait row dirty 1, and `data.portraitRev = rev` via the same path as `saveCharacter`.
  - `resolveConflict(id: string, choice: 'mine' | 'theirs'): Promise<void>`:
    - `mine`: `version = conflict?.version ?? 0`, dirty 1, conflict cleared.
    - `theirs`: `data`, `version` and `deleted` from the conflict, dirty 0, conflict cleared. If the conflict is `null` (deleted on the server), delete the local row.
  - `onLocalChange: (() => void) | null`: called after every write, so sync can debounce a push (set by Task 5).

- [ ] **Step 1: Write failing tests:**
  - `createCharacter makes a dirty version-0 row`.
  - `saveCharacter persists without waiting for sync`: after `await saveCharacter(x)`, reading the row in a fresh `openTestDb` handle with the same name returns `x`.
  - `saveCharacter clears syncError`.
  - `deleteCharacter keeps a dirty tombstone`.
  - `setPortrait sets matching rev on character and portrait`.
  - `resolveConflict mine adopts server version and stays dirty`.
  - `resolveConflict theirs replaces data and clears dirty`.
  - `resolveConflict theirs with null conflict removes row`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(offline): local character operations`.

### Task 5: Sync engine

**Files:**
- Create: `helpers/offline/api.ts`, `helpers/offline/sync.ts`, `helpers/offline/sync.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4 wire types and operations.
- Produces:
  - `class ApiError extends Error { status: number; body: unknown }`
  - `export interface SyncStatus { online: boolean; syncing: boolean; pending: number; conflicts: number; lastError: string | null }`
  - `syncNow(options?: { force?: boolean }): Promise<void>`. `force` also retries rows that have a `syncError`.
  - `startSync(): void`: idempotent. Listens to online, offline, focus and visibility; runs every 30 s; sets `onLocalChange` to a 600 ms debounced `syncNow()`.
  - `subscribeSync(listener): () => void`, `getSyncStatus(): SyncStatus`.

**Algorithm (pins the decisions the tests rely on):**
```
syncNow: navigator.locks.request('wcg-sync', run)   // one tab at a time
run:
  if offline → status.online=false, return
  push each dirty character (skip syncError unless force), oldest localUpdatedAt first:
    stamp = row.localUpdatedAt
    PUT {baseVersion: row.version, deleted, data}
    200 → txn: row.version = res.version; if row.localUpdatedAt === stamp → dirty=0
    409 → if server && ((server.deleted && row.deleted) ||
                         (deepEqual(server.data, row.data) && server.deleted === !!row.deleted))
             → row.version = server.version, dirty=0 (same rule as 200)
          else row.conflict = server (null when missing); skip row
    5xx / 408 / 429 / network / timeout → stop run, scheduleRetry
    other 4xx → row.syncError = message; continue
  push each dirty portrait whose character row has version > 0: PUT bytes; on 204 dirty=0 if rev unchanged
  pull: GET ?since=meta.pullCursor → for each server row, in a txn:
    local missing → insert (dirty 0), unless server.deleted
    !local.dirty && server.version > local.version → replace data/version/deleted, localUpdatedAt = now
    otherwise leave (a dirty row will 409 on its push)
    if data.portraitRev && local portrait rev !== data.portraitRev → GET portrait;
       store only if X-Portrait-Rev matches, else retry next run
    save cursor
  rows with version > 0 and deleted 1 and dirty 0 → delete the local row
  success → clear lastError, reset retry; failure → lastError = message
```

- [ ] **Step 1: Write failing tests** with a fake `fetch`, fake `navigator.onLine` and `navigator.locks`, and `openTestDb`:
  - `pushes dirty rows and clears dirty with server version`.
  - `edit during push stays dirty with new baseVersion`: the fake `fetch` calls `saveCharacter` before resolving 200 → the row stays dirty, `version === 1`, and the next push sends `baseVersion: 1`.
  - `409 with different data records conflict and keeps dirty`.
  - `409 with identical data clears dirty instead of conflicting`.
  - `409 with null server records null conflict`.
  - `503 stops the run and schedules a retry`: two dirty rows → exactly one PUT, `lastError` set.
  - `400 on one row does not block the next`: both PUTs sent, the first row gets `syncError`; the next non-forced run skips it, a forced run retries it.
  - `pull inserts unknown rows and replaces clean older rows`.
  - `pull does not insert rows already deleted on the server`.
  - `pull leaves dirty rows untouched`.
  - `pull fetches portrait when rev differs`.
  - `offline run makes no requests`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(offline): sync engine`.

### Task 6: UI wiring

**Files:**
- Create: `helpers/offline/hooks.ts`, `components/character-sheet/ConflictBanner.tsx`
- Modify: `pages/index.tsx`, `components/load-characters/LoadCharacterGrid.tsx`, `pages/character/[characterId].tsx`, `helpers/context/wildcard-context.tsx`, `components/character-sheet/SheetHeader.tsx`, `components/character-sheet/CharacterSheet.tsx`, `components/home/CharacterCard.tsx`, `dtos/CharToLoad.ts` (`imageUrl` → `portraitRev?: string`), `pages/_app.tsx` (`startSync()` in an effect)
- Delete: `helpers/api-actions.ts`, `helpers/save-action.ts`, `helpers/wildcard-reducer.ts`

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces (`hooks.ts`, all built on `useLiveQuery`):
  - `useCharacterList(): CharToLoad[] | undefined`: rows with `deleted === 0`, sorted by name. `undefined` while loading.
  - `useCharacter(id: string | undefined): LocalCharacter | null | undefined`: `null` if missing or deleted.
  - `usePortraitUrl(id: string | undefined): string | undefined`: object URL, revoked on change or unmount.
  - `useSyncStatus(): SyncStatus` (`useSyncExternalStore`).

**Sheet state rule (`WildCardProvider`):**
- Local React state drives the inputs.
- Each change calls `saveCharacter` right away (no debounce) and remembers the returned stamp in `lastWrite`.
- When `useCharacter` yields a row with `localUpdatedAt > lastWrite` and `dirty === 0`, adopt `row.data`. This means it came from a pull or another tab.
- `saveState`: `'saved'` (clean), `'pending'` (dirty, online), `'offline'`, `'saving'` (status syncing and row dirty), `'error'` (`row.syncError` or `lastError`), `'conflict'` (`row.conflict !== undefined`).

- [ ] **Step 1: Replace data access in pages.** Home and load-character use `useCharacterList()`. Create uses `createCharacter()` then `router.push`. Delete uses `deleteCharacter(id)`. The character page uses `useCharacter(router.query.characterId)`; a missing row shows "Character not found" with a link home. Remove `getStaticPaths` and `getStaticProps`.
- [ ] **Step 2: Rewrite `WildCardProvider`** per the rule above. Its props become `{ characterId: string; children }`.
- [ ] **Step 3: Portraits.** `SheetHeader` upload calls `setPortrait(id, await fileToPortraitBlob(file))`. `SheetHeader` and `CharacterCard` render `usePortraitUrl(id)`.
- [ ] **Step 4: `ConflictBanner`** at the top of the sheet when `saveState === 'conflict'`.
  - Text: "This character changed on another device." When the conflict is `null` or `conflict.deleted`: "This character was deleted on another device."
  - Buttons: "Keep mine" and "Use theirs" → `resolveConflict`.
- [ ] **Step 5: Verify.** `bunx tsc --noEmit`, `bun run check` and `bun test` → clean. `bun run dev`, then in a browser:
  - Create a character, edit it and add a portrait.
  - Reload: the data is still there.
  - Stop Mongo (`docker stop wildcards-mongo`): edits still work and the badge shows "Sync failed".
  - Start Mongo: the badge clears and the document is in Mongo with `version > 1`.
  - Edit the same character in two browser profiles and push both: the second profile shows the banner, and both buttons work.
- [ ] **Step 6: Commit** `feat(offline): wire UI to local database`.

### Task 7: PWA shell and sync badge

**Files:**
- Create: `sw/sw.ts`, `serwist.config.js`, `components/layout/SyncStatus.tsx`, `pages/offline.tsx`
- Copy from `offline-mode` (`git checkout offline-mode -- <paths>`): `public/manifest.webmanifest`, `public/icons/`, and the manifest/theme-color/icon tags in `pages/_document.tsx`
- Modify: `package.json` (`@serwist/next@9.5.13`, `@serwist/cli@9.5.13`, `serwist@9.5.13`; `"build": "next build && serwist build"`), `components/layout/Layout.tsx` (render `<SyncStatus />`), `.gitignore` (`public/sw.js*`)

**Interfaces:**
- Consumes: `useSyncStatus`, `syncNow` (Task 5).
- Badge labels:
  - Hidden when online with nothing pending and no error.
  - Offline: "Offline — saved locally".
  - Syncing: "Syncing…".
  - Error: "Sync failed — saved locally" (tooltip shows `lastError`).
  - Conflicts: "`n` conflict(s)".
  - Otherwise: "`n` change(s) waiting".
  - A refresh button calls `syncNow({ force: true })`.

- [ ] **Step 1: Serwist configurator mode.**
  - `serwist.config.js` exports `serwist({ swSrc: 'sw/sw.ts', swDest: 'public/sw.js', precachePrerendered: true })` from `@serwist/next/config`.
  - `sw/sw.ts` uses `Serwist` from `serwist` with `precacheEntries: self.__SW_MANIFEST`, `runtimeCaching: defaultCache` from `@serwist/next/worker`, and `fallbacks` mapping documents to `/offline`.
  - A navigation route serves the cached `/character/[characterId]` page for any `/character/*` URL.
  - API routes are `NetworkOnly`.
  - Confirm the exact option names against https://serwist.pages.dev/docs/next before writing this.
- [ ] **Step 2: Register** in `pages/_app.tsx` with `navigator.serviceWorker.register('/sw.js')`, in production or when `NEXT_PUBLIC_ENABLE_SW === '1'`.
- [ ] **Step 3: Verify.** Run `bun run build`; it must succeed under Turbopack (if Serwist fails there, use `next build --webpack` and note it in the README). Then `bun run start`:
  - Load `/`, then open a character.
  - DevTools → Offline → reload `/` and the character page: both render.
  - An unknown route renders `/offline`.
  - Lighthouse PWA "installable" passes.
- [ ] **Step 4: Commit** `feat(pwa): serwist service worker and sync badge`.

### Task 8: Docs and CI

**Files:**
- Modify: `README.md`, `.gitlab/.gitlab-ci.yml`

- [ ] **Step 1: README.** Cover:
  - How offline works (local-first, versions, conflicts).
  - Dev setup (`bun run start:mongo`, `.env.local` with `MONGODB_URI` and `MONGODB_DB`).
  - `bun test` needs Mongo running for the server tests.
  - `NEXT_PUBLIC_ENABLE_SW=1`.
- [ ] **Step 2: CI.** Add a `test` job in stage `quality`: image `oven/bun:1.4.2`, service `mongo:6`, variables `MONGODB_URI=mongodb://mongo:27017`, `MONGODB_DB=wcg_test`, script `bun install --frozen-lockfile && bun test`, same `rules` as `lint`. Keep the biome image on `latest`.
- [ ] **Step 3: Verify.** `bun run check` and `bun test` → clean.
- [ ] **Step 4: Commit** `docs: offline-first setup; ci: run tests`.
