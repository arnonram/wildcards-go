# Self-hosted Wild Cards Go Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone run Wild Cards Go from one Docker image with a SQLite file. Sign-in methods and an invite code are set by env, and the hosted Vercel + MongoDB site doesn't change.

**Architecture:** The character store becomes an interface with a MongoDB implementation (today's code) and a SQLite implementation (`node:sqlite`), and one test suite runs against both. A backend module picks Mongo or SQLite from env and hands the same database to Better Auth (Mongo adapter, or Kysely on `DatabaseSync` with migrations at startup). Sign-in options, invite gating and account-deletion confirmation are server-side rules in `server/`. The sign-in page reads the options at runtime.

**Tech Stack:** Next 16.3 (Pages Router), Better Auth 1.7.13 (+ `username` plugin), MongoDB driver 7, `node:sqlite` (Node 24 / Bun 1.4), Bun test, Docker, GitLab CI.

**Spec:** `docs/superpowers/specs/2026-11-02-self-hosted-design.md`

## Global Constraints

- The hosted site (Vercel + Atlas) must behave the same: same env vars, Mongo document shapes (`characters`, `portraits`, `deletedUsers`), API answers and email-link flow. No migration.
- The sync API and client protocol don't change. Older cached clients keep working against either store.
- Env names: `MONGODB_URI`/`MONGODB_DB` (Mongo wins when `MONGODB_URI` is set), `DATABASE_PATH` (default `./data/wcg.db`, `/data/wcg.db` in Docker), `AUTH_PASSWORD=1`, `SIGNUP_INVITE_CODE`, `SIGNUP_OPEN=1`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SMTP_URL`, `EMAIL_FROM`, Google/Discord ids and secrets (unchanged).
- No new runtime dependencies except Better Auth's own `username` plugin. SQLite is `node:sqlite` `DatabaseSync`.
- Sessions store no IP or user agent, and magic-link tokens stay hashed, on both stores.
- Password accounts' email is `<lowercased username>@users.invalid`. It's never shown and never mailed.
- A recent sign-in for deletion means one no older than **5 minutes**.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` before touching `next.config.js`.
- Use Biome formatting (`bun run check`). Tests use `bun test`. Mongo-backed tests need `MONGODB_URI` or a local `mongodb://localhost:27017`, as today.

## Review Focus

1. **Hosted Mongo data written before this change** must still read back the same way. Pinned by the `reads documents in the pre-refactor shape` test (Task 1).
2. **Two creates racing on one id in SQLite:** exactly one gets `ok` and the other gets a conflict carrying the first one's copy, never two rows or a thrown error. Pinned by the shared `second create on same id conflicts` case, which already exists, run against SQLite in Task 2. Plus `create inside a held transaction still conflicts` (Task 2).
3. **Container restart:** the same secret, and migrations that run twice without error or data loss. Pinned by `secret is reused on second start` and `migrations are idempotent` (Task 3).
4. **Usernames that differ only in case** ("Bob" vs "bob") must not create two accounts or two placeholder emails. Pinned by `username sign-up is case-insensitive` (Task 5).
5. **An unwritable or missing data directory** should give a clear startup error that names the path, not a crash on the first request. Pinned by `unwritable data dir fails with the path in the message` (Task 3).

---

## File Structure

| File                                                                                                                                                 | Responsibility                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `server/store/types.ts` (new)                                                                                                                        | `CharacterStore` interface, `PutResult`, `Portrait`, `CURSOR_LAG_MS`, `isPortraitType`, `nextCursor` |
| `server/store/mongo.ts` (new, from `server/character-store.ts`)                                                                                      | `createMongoStore(db)`, `ensureMongoIndexes(db)`                                                     |
| `server/store/sqlite.ts` (new)                                                                                                                       | `openSqlite(path)`, `createSqliteStore(db)`                                                          |
| `server/store/store.test.ts` (new, from `server/character-store.test.ts`)                                                                            | One suite, run per backend                                                                           |
| `server/character-store.ts`, `.test.ts`                                                                                                              | deleted (moved)                                                                                      |
| `server/backend.ts` (new, replaces `helpers/db-util.ts`)                                                                                             | `storageFromEnv`, `getBackend()` cache                                                               |
| `server/auth-secret.ts` (new)                                                                                                                        | `resolveAuthSecret`                                                                                  |
| `server/sign-in-options.ts` (replaces `server/providers.ts`)                                                                                         | `signInOptions(env)`                                                                                 |
| `server/invite.ts` (new)                                                                                                                             | `inviteMatches`, `INVITE_COOKIE`                                                                     |
| `server/auth.ts`                                                                                                                                     | build on either backend, password, invite, deletion hooks                                            |
| `server/account-deletion.ts` (new)                                                                                                                   | `deletionMethod`, `RECENT_SIGN_IN_MS`, `handleAccountDeletion`                                       |
| `server/startup-check.ts`, `server/email.ts`                                                                                                         | new rules                                                                                            |
| `pages/api/providers.ts`, `pages/api/account/delete.ts` (new)                                                                                        | HTTP                                                                                                 |
| `pages/sign-in.tsx`, `components/layout/DeleteAccountDialog.tsx`, `pages/delete-account.tsx`, `helpers/offline/account.ts`, `helpers/auth-client.ts` | UI and client                                                                                        |
| `Dockerfile`, `.dockerignore`, `next.config.js`, `.gitlab/.gitlab-ci.yml`, `.gitignore`                                                              | packaging                                                                                            |
| `docs/self-hosting.md`, `README.md`, `pages/privacy.tsx`                                                                                             | docs                                                                                                 |

---

### Task 1: Store interface, MongoDB store moved behind it

Behaviour and document shapes stay identical. This is a pure refactor with one new guard test.

**Files:**
- Create: `server/store/types.ts`, `server/store/mongo.ts`, `server/store/store.test.ts`
- Delete: `server/character-store.ts`, `server/character-store.test.ts`
- Modify: `helpers/db-util.ts` → move to `server/backend.ts` (Mongo only for now); `helpers/db-util.test.ts` → `server/backend.test.ts`; `server/session.ts:7-14`; `server/auth.ts`; `pages/api/characters/index.ts`, `pages/api/characters/[id]/index.ts`, `pages/api/characters/[id]/portrait.ts`

**Interfaces:**
- Produces (`server/store/types.ts`):

  ```ts
  export type PutResult = { ok: PutCharacterOk } | { conflict: ServerCharacter | null } | { notFound: true };
  export type Portrait = { rev: string; contentType: string; bytes: Uint8Array };
  export interface CharacterStore {
    putCharacter(ownerId: string, id: string, body: PutCharacterBody, now: number): Promise<PutResult>;
    listChangedSince(ownerId: string, since: number, now: number): Promise<PullResponse>;
    putPortrait(ownerId: string, id: string, rev: string, contentType: string, bytes: Uint8Array): Promise<boolean>;
    getPortrait(ownerId: string, id: string): Promise<Portrait | null>;
    deleteOwnerData(ownerId: string): Promise<void>;
    markUserDeleted(userId: string, now: number): Promise<void>;
    isUserDeleted(userId: string): Promise<boolean>;
  }
  export const CURSOR_LAG_MS = 30_000;
  export const PORTRAIT_TYPES: readonly string[];
  export function isPortraitType(contentType: string): boolean;
  /** max(since, min(max modifiedAt seen, now - CURSOR_LAG_MS)) — today's rule. */
  export function nextCursor(modifiedAts: number[], since: number, now: number): number;
  ```
- Produces (`server/store/mongo.ts`): `createMongoStore(db: Db): CharacterStore`, `ensureMongoIndexes(db: Db): Promise<void>`
- Produces (`server/backend.ts`): `type Backend = { kind: 'mongo'; db: Db; store: CharacterStore }` (Task 3 adds the sqlite variant) and `getBackend(): Promise<Backend>`, keeping today's `globalThis` cache and retry-after-failure behaviour (cache key `__wcgBackend`).

- [ ] **Step 1: Turn the store test into a per-backend suite.** Move every existing case from `server/character-store.test.ts` into `server/store/store.test.ts`, inside:

  ```ts
  type Harness = { name: string; fresh(): Promise<CharacterStore>; close(): Promise<void> };
  const harnesses: Harness[] = [mongoHarness]; // Task 2 adds sqliteHarness
  for (const h of harnesses) describe(h.name, () => { /* existing cases, calling store.x(...) without db */ });
  ```

  `mongoHarness.fresh()` drops `wcg_test` and returns `createMongoStore(db)` after `ensureMongoIndexes`. Keep the `ensureIndexes indexes owner and modifiedAt` case Mongo-only, outside the loop, renamed to `ensureMongoIndexes …`. Keep the `isPortraitType` case outside the loop.
- [ ] **Step 2: Add the guard test (Mongo-only, outside the loop):**

  ```ts
  test('reads documents in the pre-refactor shape', async () => {
    await db.collection('characters').insertOne({ _id: 'c1', ownerId: A, version: 3, modifiedAt: 500, deleted: false, data: { name: 'Old' } });
    await db.collection('characters').insertOne({ _id: 'c2', ownerId: A, version: 2, modifiedAt: 600, deleted: true });
    await db.collection('deletedUsers').insertOne({ _id: 'gone', deletedAt: new Date(1) });
    const { characters } = await store.listChangedSince(A, 0, FAR_FUTURE);
    expect(characters).toEqual([
      { id: 'c1', version: 3, modifiedAt: 500, deleted: false, data: { name: 'Old', _id: 'c1' } },
      { id: 'c2', version: 2, modifiedAt: 600, deleted: true },
    ]);
    expect(await store.isUserDeleted('gone')).toBe(true);
  });
  ```
- [ ] **Step 3: Run it and confirm it fails.** Run `bun test server/store`. Expected: FAIL, because `./mongo` cannot be resolved.
- [ ] **Step 4: Implement `types.ts` and `mongo.ts`** by moving today's functions into a closure over `db`, with no behaviour change. `listChangedSince` uses `nextCursor`. Delete the old files. Point `server/session.ts` (`(await getBackend()).store.isUserDeleted`), the three character routes, and `server/auth.ts` (`deleteOwnerData`/`markUserDeleted` via `store`, Mongo `db` for the adapter) at `getBackend()`. Move `helpers/db-util.ts` to `server/backend.ts`, and its test to `server/backend.test.ts` (same two cases, against `getBackend`).
- [ ] **Step 5: Run the full suite and typecheck.** Run `bun test && bunx tsc --noEmit -p .`. Expected: all pass. The store case count equals the old count plus 1.
- [ ] **Step 6: Commit** with message `refactor: character store behind CharacterStore interface`.

---

### Task 2: SQLite store

**Files:**
- Create: `server/store/sqlite.ts`
- Modify: `server/store/store.test.ts`

**Interfaces:**
- Consumes: `CharacterStore`, `PutResult`, `nextCursor`, `isPortraitType` from Task 1.
- Produces:
  - `openSqlite(path: string): DatabaseSync`. It creates the parent directory, opens the file, sets `PRAGMA journal_mode = WAL`, `PRAGMA foreign_keys = ON` and `PRAGMA busy_timeout = 5000`, and runs the schema. If `path` is `':memory:'`, it skips the directory.
  - `createSqliteStore(db: DatabaseSync): CharacterStore`
- Schema (`CREATE … IF NOT EXISTS`):
  - `characters(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL, modified_at INTEGER NOT NULL, deleted INTEGER NOT NULL, data TEXT)` with `data` holding JSON and NULL on tombstones.
  - Index `characters_owner_modified ON characters(owner_id, modified_at)`.
  - `portraits(id TEXT PRIMARY KEY, rev TEXT NOT NULL, content_type TEXT NOT NULL, data BLOB NOT NULL)`
  - `deleted_users(id TEXT PRIMARY KEY, deleted_at INTEGER NOT NULL)`
- Write rules:
  - Create: `INSERT … ON CONFLICT(id) DO NOTHING`. If `changes === 0`, answer as a rejection (same rules as Mongo's `rejection`).
  - Update: `UPDATE … SET …, version = version + 1 WHERE id=? AND owner_id=? AND version=?`. If `changes === 0`, answer as a rejection.
  - Tombstone: sets `data = NULL`, and the store deletes the portrait.
  - `markUserDeleted`: `INSERT … ON CONFLICT DO NOTHING`.
  - `deleteOwnerData`: one transaction (`BEGIN`/`COMMIT`, `ROLLBACK` on throw) deleting portraits, then characters.

- [ ] **Step 1: Add `sqliteHarness` to `harnesses`.** `fresh()` returns `createSqliteStore(openSqlite(':memory:'))`. Every shared case now runs twice.
- [ ] **Step 2: Add SQLite-only tests:**

  ```ts
  test('2 MiB portrait round-trips byte-for-byte', …) // bytes = crypto.getRandomValues(new Uint8Array(2 * 1024 * 1024)); getPortrait(...).bytes equals bytes, instanceof Uint8Array
  test('create inside a held transaction still conflicts', …) // db.exec('BEGIN'); store.putCharacter(A,id,create,1); then a second create via same store → { conflict: { version: 1, … } }; db.exec('COMMIT')
  test('openSqlite on a file creates the directory and reopens the same data', …) // temp dir /x/y/wcg.db; write; close; reopen; listChangedSince returns it
  ```
- [ ] **Step 3: Run them and confirm they fail.** Run `bun test server/store`. Expected: FAIL, because `./sqlite` cannot be resolved.
- [ ] **Step 4: Implement `server/store/sqlite.ts`.** `node:sqlite` returns BLOBs as `Uint8Array` and accepts `Uint8Array` parameters. Map `deleted` to and from `0`/`1`. Build `ServerCharacter` exactly like `mongo.ts` does: tombstones have no `data`, and live rows get `data._id = id`.
- [ ] **Step 5: Run the suite.** Run `bun test server/store`. Expected: every shared case passes on both `mongo` and `sqlite`, and the SQLite-only cases pass.
- [ ] **Step 6: Commit** with message `feat: SQLite character store`.

---

### Task 3: Backend selection, Better Auth on SQLite, auth secret

**Files:**
- Create: `server/auth-secret.ts`, `server/auth-secret.test.ts`, `server/auth-sqlite.test.ts`
- Modify: `server/backend.ts`, `server/backend.test.ts`, `server/auth.ts`, `.gitignore` (add `/data/`)

**Interfaces:**
- Consumes: `openSqlite`, `createSqliteStore`, `createMongoStore`, `ensureMongoIndexes`.
- Produces:
  - `type Storage = { kind: 'mongo'; uri: string; dbName: string } | { kind: 'sqlite'; path: string }`
  - `storageFromEnv(env: NodeJS.ProcessEnv): Storage`. It returns mongo when `MONGODB_URI` is set, and throws `MONGODB_DB environmental variable missing` if the db name is absent, as today. Otherwise it returns sqlite at `env.DATABASE_PATH ?? './data/wcg.db'`.
  - `type Backend = { kind: 'mongo'; db: Db; store: CharacterStore } | { kind: 'sqlite'; db: DatabaseSync; path: string; store: CharacterStore }`
  - `getBackend(): Promise<Backend>`. It logs once: `[wcg] storage: mongo (<dbName>)` or `[wcg] storage: sqlite (<path>)`.
  - `resolveAuthSecret(env: NodeJS.ProcessEnv, dataDir: string): string`. It returns the env var if it's set. Otherwise it reads `<dataDir>/auth-secret`, or creates it with 32 random bytes as base64 and mode `0o600`.
  - `buildAuthOptions(backend: Backend, env: NodeJS.ProcessEnv): BetterAuthOptions`, exported so tests and migrations share it. `getAuth()` builds the options, runs `getMigrations(options).runMigrations()` from `better-auth/db/migration` when `backend.kind === 'sqlite'`, then calls `betterAuth(options)`. The secret comes from `resolveAuthSecret(env, dataDir)`, where `dataDir` is `dirname(path)` for sqlite and `./data` for mongo.

- [ ] **Step 1: Write the tests.**

  ```ts
  // backend.test.ts
  test('MONGODB_URI selects mongo', () => expect(storageFromEnv({ MONGODB_URI: 'mongodb://x', MONGODB_DB: 'd' })).toEqual({ kind: 'mongo', uri: 'mongodb://x', dbName: 'd' }));
  test('no MONGODB_URI selects sqlite at default path', () => expect(storageFromEnv({})).toEqual({ kind: 'sqlite', path: './data/wcg.db' }));
  test('DATABASE_PATH overrides', …);
  test('mongo wins when both set', …);
  test('unwritable data dir fails with the path in the message', …); // openSqlite('/proc/wcg-nope/x.db') rejects; message contains '/proc/wcg-nope'
  // auth-secret.test.ts
  test('env secret wins and no file is written', …);
  test('secret is generated once with mode 600', …); // stat mode & 0o777 === 0o600, length >= 32
  test('secret is reused on second start', …);
  // auth-sqlite.test.ts — real Better Auth on ':memory:' backend
  test('migrations create Better Auth tables', …); // after migrate, sqlite_master has user, session, account, verification, rateLimit
  test('migrations are idempotent', …); // run twice; a user created between runs is still there
  test('session rows keep no IP or user agent', …); // ctx = await auth.$context; user = await ctx.internalAdapter.createUser({ email: 'a@x.com', name: 'a' }); await ctx.internalAdapter.createSession(user.id); SELECT "ipAddress", "userAgent" FROM session → both ''
  ```
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test server/backend server/auth-secret server/auth-sqlite`. Expected: FAIL.
- [ ] **Step 3: Implement it.** `openSqlite` wraps directory creation and open failures in `Error(\`Cannot open SQLite database at ${path}: ${cause.message}\`)`. For sqlite, Better Auth gets `database: backend.db`(Kysely detects`DatabaseSync`). For mongo, it gets `mongodbAdapter(backend.db)`as today.`rateLimit: { storage: 'database' }` stays for both.
- [ ] **Step 4: Run the full suite and typecheck.** Run `bun test && bunx tsc --noEmit -p .`. Expected: all pass.
- [ ] **Step 5: Smoke-test against SQLite.** Run `MONGODB_URI= DATABASE_PATH=/tmp/wcg-smoke/wcg.db bun run dev`. Then sign in with an email link printed to the console, create a character, and reload. Expected: the character syncs (badge "Synced"), and `/tmp/wcg-smoke/` holds `wcg.db` and `auth-secret`.
- [ ] **Step 6: Commit** with message `feat: select MongoDB or SQLite backend; Better Auth on SQLite`.

---

### Task 4: Sign-in options, startup check, email guard

**Files:**
- Create: `server/sign-in-options.ts`, `server/sign-in-options.test.ts`
- Delete: `server/providers.ts`
- Modify: `pages/api/providers.ts`, `server/startup-check.ts`, `server/startup-check.test.ts`, `server/email.ts`, `server/email.test.ts`, `server/auth.ts`

**Interfaces:**
- Produces:

  ```ts
  export type SignUp = 'open' | 'invite' | 'closed';
  export type SignInOptions = { google: boolean; discord: boolean; email: boolean; password: boolean; signUp: SignUp };
  export function signInOptions(env: NodeJS.ProcessEnv): SignInOptions;
  ```

  The rules:
  - `email`: true when `SMTP_URL && EMAIL_FROM`, or when `NODE_ENV !== 'production'` (console links).
  - `password`: `AUTH_PASSWORD === '1'`.
  - `signUp`:
    - `'invite'` if `SIGNUP_INVITE_CODE` is set.
    - Otherwise `'open'` if `MONGODB_URI` is set or `SIGNUP_OPEN === '1'`.
    - Otherwise `'closed'`.
  - `GET /api/providers` answers `signInOptions(process.env)`, which never includes the code itself.
  - `server/auth.ts` only configures `magicLink` and `sendDeleteAccountVerification` when `email` is true.
  - `checkServerConfig()` throws `No sign-in method is enabled…` in production when every method is false. It still validates `SMTP_URL` format and `EMAIL_FROM` when `SMTP_URL` is set. It no longer requires SMTP in production.
  - The `createEmailSender(...)` returned sender throws `Refusing to email a placeholder address` when `to` ends with `.invalid` (case-insensitive). With no SMTP in production it now returns a sender that throws `Email is not configured`, instead of throwing at creation.

- [ ] **Step 1: Write the tests.**
  - `sign-in-options.test.ts`: the hosted env (Mongo + SMTP + Google) gives `{ google: true, discord: false, email: true, password: false, signUp: 'open' }`. SQLite with no code gives `signUp: 'closed'`. A code gives `'invite'`. `SIGNUP_OPEN=1` gives `'open'`. Production without SMTP gives `email: false`. Development without SMTP gives `email: true`.
  - `startup-check.test.ts`: replace `refuses production without email settings` with `refuses production with no sign-in method`. Add `production with only AUTH_PASSWORD starts` and `invalid SMTP_URL still refuses`.
  - `email.test.ts`: `placeholder addresses are never mailed` (transport `sendMail` not called; the call rejects).
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test server/sign-in-options server/startup-check server/email`. Expected: FAIL.
- [ ] **Step 3: Implement it.** Update every importer of `enabledProviders`/`Providers` (`pages/sign-in.tsx` keeps compiling: switch its types to `SignInOptions`; Task 6 reworks the page).
- [ ] **Step 4: Run the full suite and typecheck.** Run `bun test && bunx tsc --noEmit -p .`. Expected: all pass.
- [ ] **Step 5: Commit** with message `feat: sign-in methods from env; startup needs at least one`.

---

### Task 5: Password accounts and invite code (server)

**Files:**
- Create: `server/invite.ts`, `server/invite.test.ts`
- Modify: `server/auth.ts`, `server/auth-sqlite.test.ts`, `helpers/auth-client.ts`

**Interfaces:**
- Consumes: `signInOptions`, `buildAuthOptions`, and a backend on `':memory:'` for tests.
- Produces:
  - `INVITE_COOKIE = 'wcg-invite'`
  - `inviteMatches(given: string | undefined, expected: string): boolean`, which compares SHA-256 digests with `timingSafeEqual`.
  - `placeholderEmail(username: string): string`, which returns `${username.toLowerCase()}@users.invalid`.
  - Better Auth error codes `INVITE_REQUIRED` (403, "An invite code is needed to create an account.") and `SIGN_UP_CLOSED` (403, "This server isn't accepting new accounts.").
  - The client `authClient` adds `usernameClient()`.
- Behaviour in `buildAuthOptions` when `options.password`:
  - `emailAndPassword: { enabled: true }` plus the `username()` plugin.
  - A `hooks.before` on `/sign-up/email` that rejects a missing username with 400, then overwrites `body.email = placeholderEmail(username)` and `body.name = body.username`.
- Invite rules (`databaseHooks.user.create.before(user, ctx)`):
  - `'open'`: allow.
  - `'closed'`: throw `SIGN_UP_CLOSED`.
  - `'invite'`: allow if `ctx?.path === '/magic-link/verify'` (gated at send). Otherwise read the `wcg-invite` cookie from `ctx.headers` and require `inviteMatches`, or throw `INVITE_REQUIRED`.
  - A `hooks.before` on `/sign-in/magic-link`: when no user has `body.email`, apply the same `'closed'`/`'invite'` rule using the request's cookie.

- [ ] **Step 1: Write the tests** (`auth-sqlite.test.ts`, real `auth.api` on an in-memory SQLite backend, with env built per test):

  ```ts
  test('password sign-up stores a placeholder email and the username as name', …); // auth.api.signUpEmail({ body: { username: 'Bob', password: 'correct horse 1', email: 'real@x.com', name: 'x' } }) → user.email === 'bob@users.invalid', user.name === 'Bob'
  test('username sign-up is case-insensitive', …); // 'Bob' then 'bob' → second rejects; one user row
  test('password sign-in by username works', …); // auth.api.signInUsername
  test('closed sign-up rejects new accounts', …); // signUp 'closed' → SIGN_UP_CLOSED
  test('invite sign-up needs the cookie', …); // no cookie → INVITE_REQUIRED; wrong → INVITE_REQUIRED; headers: { cookie: 'wcg-invite=<code>' } → ok
  test('invite does not block existing users signing in', …);
  test('magic link to an unknown email is gated by invite', …); // signInMagicLink without cookie → INVITE_REQUIRED; existing user → ok
  test('hosted options are unchanged', …); // Mongo-like env (MONGODB_URI set, SMTP set, no AUTH_PASSWORD): no emailAndPassword, no username plugin, magicLink present, signUp open
  ```

  `invite.test.ts`: matching, mismatching, undefined, and different-length codes.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test server/auth-sqlite server/invite`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the full suite and typecheck.** Run `bun test && bunx tsc --noEmit -p .`. Expected: all pass.
- [ ] **Step 5: Commit** with message `feat: password accounts and invite-gated sign-up`.

---

### Task 6: Sign-in page

**Files:**
- Modify: `pages/sign-in.tsx`
- Create: `helpers/invite-cookie.ts`, `helpers/invite-cookie.test.ts`

**Interfaces:**
- Consumes: `GET /api/providers` → `SignInOptions`, `INVITE_COOKIE`, and `authClient.signIn.username` / `authClient.signUp.email` (username plugin).
- Produces:
  - `setInviteCookie(code: string): void`, which writes `wcg-invite=<encoded>; Path=/; Max-Age=600; SameSite=Lax` plus `; Secure` on https.
  - `clearInviteCookie(): void`

Behaviour:
- Remove `getStaticProps`. Until `/api/providers` answers, show a quiet loading line ("Loading sign-in options…"). The offline branch stays as it is.
- Sections in this order, each shown only if enabled:
  1. Google and Discord buttons.
  2. Email link form.
  3. Username and password form, with **Sign in** and **Create account** modes.
- When `signUp === 'invite'`, an "Invite code" field appears in Create-account mode. It also appears as a small "New here? Enter your invite code" field above the social and email options, since those can create accounts too. Its value is written with `setInviteCookie` before any sign-in call.
- When `signUp === 'closed'`, Create-account mode is hidden, and a line reads "This server isn't accepting new accounts."
- Map `INVITE_REQUIRED` and `SIGN_UP_CLOSED` to their messages. Show other errors as today.
- On a successful sign-in, call `clearInviteCookie()` and navigate to `next`, as with today's flows.

- [ ] **Step 1: Write the test.** `invite-cookie.test.ts` sets and clears the cookie, and checks the attributes in the written string (stub `document.cookie` with a setter capture).
- [ ] **Step 2: Run it and confirm it fails, then implement it, then confirm it passes.** Run `bun test helpers/invite-cookie`.
- [ ] **Step 3: Implement the page.**
- [ ] **Step 4: Check it in a browser.** Use the `run` skill or `bun run dev` with Playwright. Check three configurations:
  - SQLite + `AUTH_PASSWORD=1` + `SIGNUP_INVITE_CODE=table`: create an account with the wrong code and see the error, then the right code and get signed in. Sign out and back in by username.
  - The same without the code (`closed`): no Create option is shown.
  - Mongo dev env: the page looks like it does today (email form + configured socials), apart from the brief loading line.
- [ ] **Step 5: Run `bun test && bunx tsc --noEmit -p . && bun run check`. Then commit** with message `feat: sign-in page reads options at runtime; password and invite UI`.

---

### Task 7: Account deletion without email

**Files:**
- Create: `server/account-deletion.ts`, `server/account-deletion.test.ts`, `pages/api/account/delete.ts`
- Modify: `server/auth.ts`, `helpers/offline/account.ts`, `helpers/offline/account.test.ts`, `components/layout/DeleteAccountDialog.tsx`

**Interfaces:**
- Produces:

  ```ts
  export const RECENT_SIGN_IN_MS = 5 * 60_000;
  export type DeletionMethod = 'email' | 'password' | 'recent-sign-in';
  export function deletionMethod(a: { hasPassword: boolean; emailEnabled: boolean }): DeletionMethod; // password wins; else email if enabled; else recent-sign-in
  ```
- `GET /api/account/delete` answers 200 `{ method: DeletionMethod }`, or 401 with no session.
- `POST /api/account/delete`, body `{ password?: string }`:
  - `email`: calls `auth.api.deleteUser({ headers, body: { callbackURL: '/' } })` → 202 `{ result: 'email-sent' }`.
  - `password`: a wrong or missing password → 400 `{ code: 'INVALID_PASSWORD' }`.
  - `recent-sign-in`: a session older than `RECENT_SIGN_IN_MS` → 403 `{ code: 'SIGN_IN_AGAIN' }`.
  - Otherwise it mints a one-minute delete token (`internalAdapter.createVerificationValue({ identifier: \`delete-account-${token}\`, value: userId, expiresAt })`), calls `auth.api.deleteUser({ headers, body: { token }, returnHeaders: true })`, forwards its `set-cookie`headers, and answers 200`{ result: 'deleted' }`. Deletion runs Better Auth's own token path, so `beforeDelete`/`afterDelete` (app data first, then the deleted-id marker) stay the single deletion order.
- `server/auth.ts` gains a `hooks.before` on `/delete-user`. A request **without** `body.token` is allowed only when `emailEnabled && !hasPassword`. Otherwise it throws 403 `USE_ACCOUNT_DELETE`. Token requests (the email link, and the minted token above) pass.
- Client (`helpers/offline/account.ts`):
  - `getDeletionMethod(): Promise<DeletionMethod>`
  - `requestAccountDeletion(password?: string, request = …): Promise<'offline' | 'sent' | 'deleted' | 'wrong-password' | 'sign-in-again'>`. On `'deleted'` it calls `forgetDeletedAccount(owner)`, as `confirmAccountDeletion` does.

- [ ] **Step 1: Write the tests.**
  - `account-deletion.test.ts`, unit tests: `password account always confirms by password` (both email flags) and `oauth account uses email when enabled, recent sign-in otherwise`.
  - `account-deletion.test.ts`, integration on SQLite with `auth.api` and a handler invoked with mock req/res as in `server/session.test.ts`:
    - `password delete with wrong password keeps the account`
    - `password delete with right password removes user, characters and marks deleted` (seed a character via the store; after: `isUserDeleted` true, `listChangedSince` empty)
    - `oauth delete with a 6-minute-old session answers SIGN_IN_AGAIN` (create the session via `internalAdapter.createSession`, then set `created_at` back with SQL)
    - `oauth delete with a fresh session deletes`
    - `direct /delete-user without token is refused when email is off`
    - `password account cannot trigger an email link` (email on, direct `/delete-user` → 403)
  - `account.test.ts`: `requestAccountDeletion` maps 202→`sent`, 200→`deleted` (and wipes the store), 400→`wrong-password`, 403→`sign-in-again`, offline→`offline`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test server/account-deletion helpers/offline/account`. Expected: FAIL.
- [ ] **Step 3: Implement the server and client.**
- [ ] **Step 4: Update the dialog.**
  - `DeleteAccountDialog.tsx` fetches the method when it opens.
  - `password` shows a password field. "Delete account" is disabled until the field is filled.
  - `recent-sign-in` with `sign-in-again` shows "For safety, sign in again, then delete within 5 minutes." and a button to `/sign-in?next=<current path>`.
  - `email` works exactly as today.
  - `deleted` navigates home, using the same post-deletion notice that `pages/delete-account.tsx` shows.
- [ ] **Step 5: Run `bun test && bunx tsc --noEmit -p .`, then check in a browser.** On SQLite + password, delete a throwaway account: the characters go and the notice shows. On Mongo dev, the email-link flow is unchanged.
- [ ] **Step 6: Commit** with message `feat: delete accounts by password or recent sign-in when email is off`.

---

### Task 8: Docker image, CI, docs

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docs/self-hosting.md`
- Modify: `next.config.js`, `.gitlab/.gitlab-ci.yml`, `README.md`, `pages/privacy.tsx` (only if a statement is false for self-hosted)

**Decisions:**
- `next.config.js`: `output: 'standalone'`. Vercel builds this fine. Confirm with the MR's Vercel preview build before merging.
- `Dockerfile`:
  - Builder stage: `oven/bun:1.4.2`, `bun install --frozen-lockfile`, `bun run build`.
  - Runtime stage: `node:24-slim`, `WORKDIR /app`. Copy `.next/standalone/` → `/app`, `.next/static` → `/app/.next/static`, and `public` → `/app/public`. `public` includes `sw.js` and `icons/icon-192.png`, which `server/email.ts` reads via `process.cwd()`.
  - Set `ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DATABASE_PATH=/data/wcg.db`.
  - `RUN mkdir /data && chown node:node /data`, `USER node`, `VOLUME /data`, `EXPOSE 3000`, `CMD ["node", "server.js"]`.
- `.dockerignore`: `node_modules`, `.next`, `.git`, `data`, `screenshots`, `.env*`, `coverage`.
- CI:
  - `workflow.rules` gains `- if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/`.
  - Existing jobs get `rules: [{ if: $CI_COMMIT_TAG, when: never }, { when: on_success }]` (in a shared `.not-on-tags` and via `extends`, or `.bun`).
  - The `test` job runs the store suite on both backends. It does already: the SQLite harness needs no service.
  - A new `image` job:
    - `docker:27` with `docker:27-dind` service.
    - Logs in with `$CI_REGISTRY_USER`/`$CI_REGISTRY_PASSWORD`.
    - Builds once, then pushes `$CI_REGISTRY_IMAGE:latest` and `:$CI_COMMIT_SHA` on the default branch, and `:${CI_COMMIT_TAG#v}` on tags.
    - Rules: the default branch or a version tag only.
- `docs/self-hosting.md` sections:
  - Quick start: `docker run -p 3000:3000 -v wcg-data:/data -e BETTER_AUTH_URL=… -e AUTH_PASSWORD=1 -e SIGNUP_INVITE_CODE=… registry.gitlab.com/<project>/wild-cards-go:<version>`
  - Compose with Caddy: an `app` + `caddy` compose file and a two-line Caddyfile `wildcards.example.com { reverse_proxy app:3000 }`.
  - HTTPS required (why: the offline app and secure cookies; `localhost` is the exception; Tailscale and Cloudflare Tunnel also work).
  - Env table: required `BETTER_AUTH_URL`. Sign-in methods. Invite and `SIGNUP_OPEN`. `DATABASE_PATH`. Optional `BETTER_AUTH_SECRET`, and that the generated one lives in `/data/auth-secret`.
  - Backups: `sqlite3 /data/wcg.db ".backup /backup/wcg-$(date +%F).db"`, or `VACUUM INTO`, on a schedule. Back up `auth-secret` too.
  - Updating: pull the new tag and restart. Tables are migrated at startup.
  - Running from a clone: `bun install && bun run build && bun run start`, with data in `./data`.
  - Limits: no password reset (the host can delete the account so the user can re-register); one instance per SQLite file.
- `README.md`: add a "Self-hosting" line linking to the doc, and a line to the env table for `AUTH_PASSWORD`, `SIGNUP_INVITE_CODE` and `SIGNUP_OPEN`.
- `pages/privacy.tsx`: read it. If it states that email is always collected, or names the hosted operator as the only operator, add one sentence: "Self-hosted instances are run by whoever hosts them; this policy covers the official site."

- [ ] **Step 1: Make the config and Dockerfile changes, then build.** Run `bun run build && docker build -t wcg:local .`. Expected: both succeed.
- [ ] **Step 2: Smoke-test the container.**

  ```bash
  docker run -d --name wcg-smoke -p 3100:3000 -v wcg-smoke:/data \
    -e BETTER_AUTH_URL=http://localhost:3100 -e AUTH_PASSWORD=1 -e SIGNUP_INVITE_CODE=table wcg:local
  ```

  Expected:
  - Logs show `[wcg] storage: sqlite (/data/wcg.db)`, and the server listens on 3000.
  - In a browser at `http://localhost:3100`: create an account with invite `table`, create a character, and see it sync.
  - `docker restart wcg-smoke`. You're still signed in (same secret), and the character is still there.
  - Run `docker run --rm wcg:local` with no env. It exits with the "No sign-in method is enabled" message, unless dev-mode email applies, which it doesn't because `NODE_ENV=production`.
  - Clean up the container and volume.
- [ ] **Step 3: Write the CI changes.** Run `docker run --rm -v "$PWD":/w -w /w registry.gitlab.com/gitlab-org/cli:latest ci lint .gitlab/.gitlab-ci.yml` if the GitLab CLI is available. Otherwise use the project's CI Lint page. Expected: valid.
- [ ] **Step 4: Write `docs/self-hosting.md`, the README lines and the privacy check.** Run `bun run check`. Expected: clean.
- [ ] **Step 5: Commit** with message `feat: Docker image, CI publishing and self-hosting docs`.

---

## Final verification

- [ ] `bun run ci && bunx tsc --noEmit -p . && bun test && bun run build`, all green.
- [ ] Mongo dev (`bun run dev` with `.env.local` as today): email-link sign-in, sync, delete via email link. All unchanged.
- [ ] The MR's Vercel preview build succeeds with `output: 'standalone'`.
