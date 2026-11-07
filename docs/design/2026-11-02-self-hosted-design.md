# Self-hosted Wild Cards Go: design

Agreed 2026-11-02. A second way to run the app: one Docker container with a SQLite file, which a GM can run for their table or a player for themselves, with no outside services. The hosted site (Vercel + MongoDB Atlas) keeps working exactly as it does now.

A separate, later project, a local-only static build with no server at all, is out of scope here and gets its own design.

## Why

The app is offline-first and already works fully signed out, but sync needs MongoDB, an SMTP provider for email sign-in, and in production the server refuses to start without SMTP. Someone who wants their own instance, on a home server or a small VPS, should get a working, syncing app from one image, one volume and a few settings.

## Goals

- Self-hosters run `docker run` (or compose) with one `/data` volume and get a syncing app with accounts.
- Self-hosters can also run from a clone: `bun install && bun run build && bun run start`.
- Storage is MongoDB **or** SQLite, chosen by configuration. Both are supported for real: the hosted site stays on MongoDB, and self-hosted installs use SQLite.
- Each sign-in method is turned on by its own setting. Self-hosters can run with no email provider.
- A shared invite code controls who can create an account.

## Non-goals

- Moving hosted data from MongoDB to SQLite, or the reverse. JSON export/import already moves characters between servers.
- A hosted SQLite service (libSQL/Turso). The SQLite store may make that easy later, but it isn't built or tested now.
- Personal or one-time invites, or an admin page.
- A "no accounts" single-user mode. A single player creates one password account.
- Shipping HTTPS inside the image. The docs give a Caddy example.
- Built-in scheduled backups. The docs explain how to back up.

## Anti-goals

- **Any change to how the hosted site behaves or stores data.** It's live with real accounts and characters. Its env vars, MongoDB documents, sync API and sign-in flow must all keep working unchanged, with no migration. Installed clients with an older cached service worker must keep syncing.
- Two diverging copies of the sync rules. Versioned writes, conflicts, cursor lag, tombstones and ownership checks must behave identically on both stores, proven by one shared test suite.
- A self-hosted instance that's open to the world by accident. Without an invite code, a self-hosted server must not accept new accounts (see "Invite code").

## Decisions

### Storage: two stores behind one interface

`server/character-store.ts` currently takes a MongoDB `Db` in every function. It becomes an interface with two implementations:

- `putCharacter`, `listChangedSince`, `putPortrait`, `getPortrait`, `deleteOwnerData`, `markUserDeleted` and `isUserDeleted`, with today's signatures minus the `db` argument and today's semantics (the doc comments in that file are the spec).
- A **MongoDB store**: today's code, unchanged in behaviour and document shape.
- A **SQLite store** using Node's built-in `node:sqlite` (`DatabaseSync`), so there's no new native dependency. It's available in Node 24 (production runtime) and Bun 1.4 (tests); both were checked and report SQLite 3.53.4.
  - Tables: `characters` (id PK, owner_id, version, modified_at, deleted, data JSON text), `portraits` (id PK, rev, content_type, data BLOB), `deleted_users` (id PK, deleted_at). Index on `(owner_id, modified_at)`.
  - The versioned write is a conditional `UPDATE … WHERE id=? AND owner_id=? AND version=?`, plus an `INSERT … ON CONFLICT DO NOTHING` for creates, which replaces Mongo's duplicate-key catch. Check rows changed to tell a write from a conflict.
  - Run WAL mode, and `CREATE … IF NOT EXISTS` on open, the same way Mongo's `ensureIndexes` runs on connect.

`helpers/db-util.ts` becomes the place that picks a store from configuration and caches it, keeping today's hot-reload-safe `globalThis` cache.

**Selecting the store:** if `MONGODB_URI` is set, use MongoDB (today's hosted config, unchanged). Otherwise use SQLite at `DATABASE_PATH`, which defaults to `./data/wcg.db` and to `/data/wcg.db` in the Docker image. If both are set, Mongo wins and the server logs which store it chose at startup.

**Tests:** `server/character-store.test.ts` runs the same cases against both stores: Mongo when `MONGODB_URI` is set, as in CI today, and SQLite in memory or in a temp file always. CI runs both.

### Sign-in: Better Auth on either store

- MongoDB keeps `mongodbAdapter(db)`.
- SQLite passes the same `DatabaseSync` instance to Better Auth. Its Kysely adapter detects `DatabaseSync` (checked in `@better-auth/kysely-adapter`), so sign-in data lives in the same file, and backups cover one file.
- Better Auth's tables are created at startup with its programmatic migration API (`better-auth/db/migration`), so a host never runs a CLI. This runs only for SQLite.
- Rate limiting: keep `storage: 'database'` on both. It works on SQLite, and one store means one code path.
- The `databaseHooks` (blanking IP/UA) and `deleteUser` hooks call the store interface, not Mongo.

### Sign-in methods, each on its own setting

| Method                | On when                              |
| --------------------- | ------------------------------------ |
| Email link            | `SMTP_URL` and `EMAIL_FROM` set      |
| Google, Discord       | client id and secret set (unchanged) |
| Username and password | `AUTH_PASSWORD=1`                    |
- **Startup check:** the server refuses to start in production when **no** sign-in method is enabled, and when `SMTP_URL` is set but invalid (as today). The "production requires SMTP" rule goes away. The hosted site sets SMTP, so nothing changes there.
- Password sign-in uses Better Auth's `username` plugin with email-and-password: users sign up with a username and password, and no email is asked for.
  - **Placeholder email (my call):** Better Auth requires a unique, valid email on every user (`/sign-up/email` validates it), so the server fills in `<username>@users.invalid`. `.invalid` is reserved and can never receive mail.
    - The placeholder is never shown in the UI. The account menu shows the username.
    - No email is ever sent to an `.invalid` address. The email sender refuses them, which also blocks magic-link requests for them.
    - Password users can't add a real email (non-goal).
  - Password and email links **may be on together** on one server. Each account is still one kind: a password account or an email/OAuth account. Linking works only through verified real emails, as today, so a placeholder never links.
- In development without SMTP, email links stay on and print to the console, as today.
- **The sign-in page must not depend on build-time env.** `pages/sign-in.tsx` bakes providers in with `getStaticProps` and then overrides them from `/api/providers` at runtime. A CI-built image has no env at build time, so drop the build-time list and rely on the runtime fetch, extended with `email`, `password` and `inviteRequired`. Show a loading state until it answers. While offline, the page already explains that sign-in needs a connection.

### Invite code

- `SIGNUP_INVITE_CODE`: when set, creating a **new** account by any method (password, email link, Google, Discord) needs the code. Existing users sign in as before.
- Enforced on the server, in Better Auth's `user.create.before` hook, so no sign-up path can skip it.
- **Default is closed when self-hosted:** a server using SQLite with no `SIGNUP_INVITE_CODE` refuses new accounts. Hosted MongoDB with no code stays open, as today. A self-hoster who really wants open sign-up sets `SIGNUP_OPEN=1`. _(Builder: the variable name is your call; the closed default is not.)_
- The sign-in page shows an invite code field when sign-up needs one, according to `/api/providers`.
- Changing the code stops new sign-ups with the old one. Accounts already created stay.

### Account deletion without email

Today, deletion is confirmed by an emailed link. Better Auth sends that link whenever `sendDeleteAccountVerification` is configured, even after checking a password. Its fresh-session check accepts any session younger than `session.freshAge`, which defaults to one day, and requires no password. So the rules below are our own server-side checks on top of Better Auth (my call):

- **Password accounts always confirm with their password**, whether or not email is on. The server rejects a deletion for a password account that doesn't carry the correct password, and never sends that account an emailed link.
- **Email and OAuth accounts when email is on:** the emailed link, exactly as today. The hosted site's flow and config, including `freshAge`, don't change.
- **OAuth accounts when email is off:** confirm with a recent sign-in, no older than 5 minutes. `pages/delete-account.tsx` gets a "sign in again, then come back" step when the session is older than that. Implement this as our own check on the session's creation time, not by changing the server-wide `freshAge`, which other endpoints also use.
- Whatever path confirms it, deletion keeps today's order: app data first, then the user, then the deleted-id marker.

### Secrets and URL

- `BETTER_AUTH_URL` is required: the address players use.
- `BETTER_AUTH_SECRET`: if it's unset, the server generates one on first start, stores it in the data directory (`/data/auth-secret`, file mode 600), and reuses it afterwards. If the env var is set, it always wins. Production hosted keeps its env secret.

### Packaging

- **Docker image** is the main path:
  - `next.config.js` gets `output: 'standalone'`.
  - Multi-stage `Dockerfile`: build with Bun (`bun run build`, which also builds the service worker), then run on a Node 24 slim image, copying `.next/standalone`, `.next/static` and `public/`. Run as a non-root user, `VOLUME /data`, `EXPOSE 3000`.
  - GitLab CI builds with Docker-in-Docker and pushes to the project's container registry:
    - On each `main` pipeline: `:latest` and `:<commit-sha>`.
    - On release tags (`vX.Y.Z`): `:X.Y.Z`. The top-level `workflow` rules gain a tag rule. On tag pipelines **only the image job runs**: lint, typecheck, test and build stay limited to merge requests and `main`, since the tagged commit already passed them there.
- **From a clone:** same env vars, and SQLite defaults to `./data/wcg.db` (git-ignored).
- The dev `docker-compose.yml` (Mongo for development) stays. A self-hosting compose example lives in the docs.

### Docs

`docs/self-hosting.md`:

- A quick start with `docker run` and with compose.
- The env var table: required, optional, and per sign-in method.
- **HTTPS is required** for the offline app and secure cookies, except on `localhost`. Include a compose example with Caddy in front, and a short note that Tailscale or Cloudflare Tunnel also work.
- Backups: `sqlite3 /data/wcg.db ".backup …"` or `VACUUM INTO`, run on a schedule, and keep `/data/auth-secret` too.
- Updating: pull the new image and restart. Tables are created and migrated at startup.

Also link it from the README.

## Constraints

- The hosted site's MongoDB document shapes, env vars and API answers stay byte-compatible. No migration.
- The sync API and client are unchanged. Old cached clients keep working against either store.
- Pages Router and Next 16.3 as in the repo. Read the relevant guide in `node_modules/next/dist/docs/` before changing `next.config.js` (standalone output).
- Privacy: sessions keep no IP or user agent, and tokens stay hashed, on both stores. `pages/privacy.tsx` is about the hosted site. Check that it doesn't claim things that a self-hosted instance contradicts, or add a line saying self-hosted instances are run by their host.
- The Fan License notice and logo stay in the footer of every build.

## Left to the builder

- The exact module layout of the store interface and file names.
- The SQLite schema details beyond the columns listed, and how JSON is stored.
- How the invite code reaches the `user.create.before` hook for OAuth and email-link flows (e.g. a short-lived cookie set before redirecting, or a field Better Auth carries through). Server-side enforcement is required; the mechanism is not specified.
- The sign-in page layout for the password form and invite field, within the existing design.
- The variable name for open sign-up.
