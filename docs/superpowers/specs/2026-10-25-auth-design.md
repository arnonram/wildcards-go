# Accounts and Sign-in — Design

## Why

Today the sync API has no auth: `GET /api/characters` returns every character in the database, and anyone can overwrite or delete any character whose id they see. The app is about to be opened to anyone, so each character needs an owner, and the server needs to enforce it.

The app stays offline-first. Signing in is what turns sync on. It is never what lets you use the app.

## Goals

- Anyone can create an account in seconds, at the table, on a phone.
- Sign-in options: **Google**, **Discord**, and an **email link** (passwordless). Google was the user's choice; Discord and email link are the designer's call, because not everyone has Google and most tabletop players have Discord.
- A signed-out person can use the app fully: create and edit characters offline, as today. Their characters are attached to their account the first time they sign in.
- A character is visible to and writable by its owner only. The server decides who the owner is, from the session. The client never claims ownership.
- Several people can share one browser. Each account's characters live in their own local store. On sign-out they stay on the device but are **hidden until that account signs in again** (user's choice).
- Offline play doesn't log people out. Sessions last **30 days and renew on use**.

## Non-goals

- Groups, or a GM viewing shared characters. Possible later as "owner, or shared with me" on the same check. This design adds no hooks for it beyond the owner field.
- Email and password sign-in: no passwords stored on our server.
- Account deletion and data-export UI. Needed before a public launch, but a separate piece of work.
- Picking a hosting provider. Everything is configured through environment variables.
- Migrating existing server data. The app is not deployed; the dev database is dropped (see Rollout).

## Anti-goals (a failure even if it works)

- An account being required before someone can try the app.
- Losing local characters at sign-in, at sign-out, or when a session expires.
- One account's characters showing up for, or being uploaded by, another account on the same device.
- The server ever returning another user's character, even inside a 409 conflict body.

## Constraints

- Next 16 pages router, React 19, MongoDB driver 7, Dexie 4, Bun. Biome for lint and format. `bun test` with MongoDB running.
- The local MongoDB (`docker-compose.yml`) is a standalone server, so there are no transactions.
- The service worker already serves `/api/**` from the network only, so `/api/auth/**` needs no service-worker change.

## Decided: library and server

**Better Auth**, with the official MongoDB adapter (`@better-auth/mongo-adapter`), configured _without_ the `client` option (standalone Mongo, no transactions).

- **Handler:** `pages/api/auth/[...all].ts` with `toNodeHandler(auth.handler)` and `bodyParser: false`, per the Better Auth Next.js docs.
- **One instance:** a single `auth` instance in `server/auth.ts`, built on the same `Db` from `connectToDb()`.
  - **Builder:** `connectToDb()` is async while Better Auth wants its config up front; choose how to bridge that, for example a lazily built instance. Pick one approach, use it everywhere, and say why.
- **Session:** `expiresIn` 30 days, `updateAge` 1 day. Leave the cookie cache **off**, so revoking a session takes effect at once (low traffic, so the DB lookup is fine).
- **Email link:** the `magicLink` plugin with the default 5-minute expiry.
  - **Sending:** through **Resend** when `RESEND_API_KEY` is set.
  - **Development:** when it isn't set, the link is logged to the server console (development only; refuse to start without it in production).
- **Social providers:** Google and Discord. A provider is enabled only when both its client id and secret are set, so development works with email links alone.
  - The sign-in page shows only enabled providers. How the client learns which are enabled is the builder's call.
- **Account linking:** on (Better Auth's default), for verified emails only: no `trustedProviders`, because that option skips the verification check and would let an unverified Discord email take over an account. Google and email links always verify, so someone who uses Google one day and an email link to the same address the next lands in the same account.
- **Rate limiting:** Better Auth's built-in limiter, at its defaults.

**Environment variables** (documented in README, with a `.env.example`):

| Variable                                     | Purpose                                   |
| -------------------------------------------- | ----------------------------------------- |
| `BETTER_AUTH_SECRET`                         | session signing                           |
| `BETTER_AUTH_URL`                            | public base URL                           |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | optional provider                         |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | optional provider                         |
| `RESEND_API_KEY`, `EMAIL_FROM`               | email links; console fallback in dev only |

README gets short steps for registering the Google and Discord apps: the callback URL is `<BETTER_AUTH_URL>/api/auth/callback/<provider>`.

## Decided: ownership on the server

- **`CharacterDoc.ownerId: string`**, the Better Auth user id.
  - Every function in `server/character-store.ts` that touches characters or portraits takes the owner id.
  - Each API route gets it from the session (`auth.api.getSession` with the request headers converted from Node form). No session means **401**.
- **Create** (`baseVersion 0`) stores `ownerId`.
- **Duplicate id owned by someone else:**
  - It answers **404 `{ message: 'No such character' }`** with no body copy. It never returns a 409 holding another user's data.
  - Ids are random UUIDs, so this only happens to a malicious or broken client.
  - The client treats it as a permanent per-row rejection, as today.
- **Update and delete:** the filter includes `ownerId`. When nothing matches:
  - Your own character with a version mismatch: 409 with your server copy, as today.
  - The id doesn't exist at all: 409 with `server: null`, as today.
  - The id exists under another owner: the same 404 as above.
- **Pull:** `GET /api/characters` filters by `ownerId`. The index becomes `{ ownerId: 1, modifiedAt: 1 }`, replacing `{ modifiedAt: 1 }` in `ensureIndexes`.
- **Portraits:**
  - GET and PUT both require the session user to own the character; otherwise 404.
  - Also in this branch (designer's call, from the same review): PUT accepts only `image/jpeg`, `image/png` and `image/webp` (415 otherwise). GET sends `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'`. This closes a stored-XSS path through SVG portraits.

## Decided: the client

**Local stores, one per account:**

- **Signed out:** the IndexedDB database `wcg`, the existing name. Existing dev data is therefore signed-out data and gets attached on first sign-in.
- **Signed in:** `wcg-u-<userId>`.
- **Ownership of the active store:** exactly one module owns "which store is active". `characters.ts`, `hooks.ts` and the sync engine all go through it instead of the fixed `db` export they import today.
- **On a switch:**
  - live hooks re-bind to the new store
  - the sync engine for the old store is disposed and one for the new store is started
  - an open character sheet for a character that isn't in the new store navigates home
- **The pull cursor** lives in each store's `meta` table, so it is already per account.

**Remembered account:**

- The app keeps the last signed-in account (`userId`, display name, avatar URL) in `localStorage`, so it can open the right store at startup, including offline.
- **Online at startup:**
  - The app asks Better Auth for the session.
  - If that user differs from the remembered one, it switches stores.
  - If there is a session but nothing remembered, it switches to the session user.
  - If there is no session, the remembered account stays and sync shows "Sign in to sync" (see 401 below). It does _not_ fall back to the signed-out store: that would hide someone's characters because their session lapsed.

**Sign-in and adding signed-out characters:**

1. Whenever an account store opens, the app checks the signed-out store for characters. That covers a fresh sign-in, a startup with a session, and another tab signing in. Sign-in often finishes in a new tab or the mail app's browser, so "just signed in" can't be told apart reliably.
2. If there are characters, it asks: **"Add N characters made on this device while signed out to your account?"** with **Add** and **Not now** (user's choice).
   - **Not now** leaves them in the signed-out store. The question comes back the next time an account store opens in a new app start, not on every render or tab focus.
3. **Add** moves every character and its portrait from the signed-out store into the account store. Per character:
   - Write the row to the target, reset to "not on the server yet": `version 0`, `dirty 1`, `syncError` and `conflict` cleared, a new `localUpdatedAt`. The portrait is marked dirty.
   - Then delete it from the source.
   - Rows marked deleted in the source are dropped, not moved.
   - If the target already has that id, keep the target copy and still delete the source copy. That way an interrupted move, run again, finishes cleanly and never duplicates.
   - The source's `meta` (pull cursor) is never copied.
4. The next sync creates the moved characters on the server under this owner. That is the whole "attach later" mechanism: there is no claim endpoint.
   - The reset is what makes characters that synced with the old auth-less server upload again. That covers the existing `wcg` dev data, whose server copy is being dropped.

**Sign-out:**

1. **Offline, sign-out is blocked**, with "Signing out needs a connection" (user's choice). A local-only sign-out would leave a live session cookie, and the next online start would silently sign the person back in.
2. Online:
   - If the account has unsynced changes, first confirm: "N changes on this device haven't synced yet. They'll sync next time you sign in here." This is a confirm, not a blocker.
   - Then call Better Auth sign-out. Only once that succeeds, clear the remembered account and switch to the signed-out store.
3. The account's store stays on the device, untouched and hidden, until that account signs in again.

**Same browser, several tabs:**

The session cookie is shared by every tab, but each tab has its own active store.

- **Server-side guard:**
  - Every sync request carries `X-WCG-Store-Owner: <userId>`, the owner of the store it comes from.
  - The server answers **401** when that doesn't equal the session user.
  - This isn't the client claiming ownership. Ownership still comes only from the session; the header only stops a store from syncing under the wrong account.
  - A tab whose store no longer matches the session therefore stops syncing (the 401 handling below) and never uploads under the wrong account. The same covers startup before the session check has run.
- **Tabs follow:** when the remembered account changes in `localStorage` (the `storage` event), the other tabs switch stores the same way.

**Sync engine:**

- **Signed out:** the engine doesn't run (no requests).
- **A 401 on any request:** a new, store-wide state, not a per-row error.
  - Stop the run, don't schedule a backoff retry, and set status `signedOut: true`.
  - The current `isPermanent` would wrongly mark every dirty row with `syncError` on a 401. Exclude 401 there.
  - The badge shows **"Sign in to sync"** and links to the sign-in page. A successful sign-in clears the state and runs a sync.

**UI:**

- **Header:** an account control next to `SyncStatus` in `components/layout/Layout.tsx`.
  - Signed out: "Sign in".
  - Signed in: avatar or initial, opening a menu with the name and "Sign out".
- **New page `/sign-in`:**
  - provider buttons (enabled providers only)
  - an email field that sends a link and then says "Check your email"
  - when offline: "Signing in needs a connection. You can keep playing; your characters will sync after you sign in."
  - After sign-in it returns to where the person came from.
- **Styling:** follows the existing components in `components/ui/`. Exact layout is the builder's call.

## Testing (what must be proven)

- **Server store** (Mongo, extends `server/character-store.test.ts`):
  - owner A cannot read, update, delete or upload a portrait for owner B's character
  - a create on B's id answers 404, never a conflict holding B's data
  - pull returns only the caller's characters
  - the portrait content-type allowlist works
- **API routes:**
  - no session means 401
  - an `X-WCG-Store-Owner` that differs from the session user means 401
  - a thin test with a stubbed session lookup is enough; Better Auth itself isn't re-tested
- **Sync engine:** a 401 sets `signedOut`, marks no row with `syncError`, schedules no retry, and a later successful run clears it.
- **Store switching and the move:**
  - after **Add**, signed-out characters and portraits are in the account store, reset to `version 0` and dirty, and then push with `baseVersion 0`
  - **Not now** moves nothing
  - deleted rows are dropped
  - a move interrupted after the write and run again leaves no copy in the signed-out store
  - sign-out leaves the account store intact and the signed-out store active
  - switching accounts never shows the previous account's characters in `useCharacterList`
- **Manual:**
  - Sign in with an email link (console link in dev) on two browser profiles as two users. Each sees only their own characters.
  - Sign out, then sign back in: the characters reappear.
  - Create characters signed out, sign in and choose **Add**: they upload.
  - Two tabs: sign out in one and in as another user. The other tab switches and uploads nothing under the new account.
  - Offline: sign-out shows "Signing out needs a connection".

## Rollout

- **Dev data:** drop the dev `characters` and `portraits` collections. They have no `ownerId`, so nothing would ever return them. README says so.
- **Not deployed:** no compatibility shims.

## Left to the builder

- Module and file names on the client, beyond those named here.
- How the client learns which providers are enabled.
- How `server/auth.ts` gets its `Db` (see above).
- Visual design of the sign-in page and account menu.
- The email template text: plain, one link, says it expires in 5 minutes.
