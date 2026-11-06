# Wild Cards Go

Have your Savage Worlds characters with you anywhere!

A character sheet app that works offline and syncs across devices once you sign in. It is a Savage Worlds fan product under Pinnacle's Fan License: the footer carries the required notice and the Fan License logo, which must stay unaltered in size.

## Offline-first

The browser is the source of truth. Characters live in IndexedDB and MongoDB is the sync target, so the app keeps working without a connection.

- Every edit is written to IndexedDB at once and the character is marked as changed. About 600 ms after the last edit, the sync engine pushes it to the server.
- Each character carries a version that only the server assigns. A push sends the version it was based on. If another device saved first, the server answers `409` and the sheet asks **Keep mine** or **Use theirs**.
- The client pulls characters changed since its last pull: on startup, when the tab regains focus or comes back online, and every 30 seconds.
- The pull cursor trails server time by 30 seconds, so a write that commits late is never skipped. Recent rows are re-sent, and the client ignores ones it already has.
- Deletes are versioned writes too, so other devices learn about them.
- Portraits are stored as blobs and synced through their own endpoint, so editing a character never re-sends image bytes.
- If the server is unreachable or returns 5xx, sync backs off (5 s, 15 s, 30 s, 60 s). If the server rejects a character with another 4xx, only that character is marked, and it is retried after its next edit or with the badge's sync button.
- Only one tab syncs at a time (Web Locks).
- A service worker built by [Serwist](https://serwist.pages.dev/) precaches the app shell, so pages load offline. It is registered in production builds; set `NEXT_PUBLIC_ENABLE_SW=1` to register it under `next dev` after a `bun run build`. Otherwise `next dev` unregisters any worker left from an earlier production run.

### API

| Method      | Path                                     | Purpose                                           |
| ----------- | ---------------------------------------- | ------------------------------------------------- |
| `GET`       | `/api/characters?since=<ms>`             | Characters changed at or after the cursor         |
| `PUT`       | `/api/characters/:id`                    | Versioned write: `{ baseVersion, deleted, data }` |
| `GET`/`PUT` | `/api/characters/:id/portrait?rev=<rev>` | Portrait bytes (JPEG, PNG or WebP), up to 2 MiB   |

Every `/api/characters` request needs a session and an `X-WCG-Store-Owner` header naming the account whose local store it syncs. A missing session, or a header that doesn't match the signed-in user, answers `401`. Another user's character answers `404`. A store whose account was deleted answers `410`, and the client wipes it.

## Accounts

Sign-in uses [Better Auth](https://www.better-auth.com/) with Google, Discord and email links. Users and sessions live in the same MongoDB. Signing in only turns sync on: the app works fully signed out, and characters made signed out can be added to an account later.

**Deleting an account** (account menu → _Delete account…_) emails a link to `/delete-account`, which confirms with one more click in a browser signed in to that account, offering sign-in first if needed. Confirming deletes the account's characters and portraits, then the user, sessions and linked logins. Only the deleted user's random id is kept, in `deletedUsers`, so the account's other devices get `410` on their next sync and wipe their local copy. Hidden account stores on a device (signed out, or another account open) are checked the same way once per app start.

Each account has its own local store (`wcg-u-<userId>`); signed-out characters live in `wcg`. Signing out hides the account's characters on that device until it signs in again.

| Variable                                     | Purpose                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`                         | Session signing (`openssl rand -base64 32`)                               |
| `BETTER_AUTH_URL`                            | Public base URL, e.g. `http://localhost:3000`                             |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | Optional; Google sign-in shows only when both are set                     |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Optional; Discord sign-in shows only when both are set                    |
| `SMTP_URL`, `EMAIL_FROM`                     | Email links over SMTP; off in production without them                     |
| `AUTH_PASSWORD=1`                            | Username and password accounts (no email needed)                          |
| `AUTH_PASSWORD_MIN_LENGTH`                   | Shortest password for new accounts; default 8                             |
| `SIGNUP_INVITE_CODE`                         | New accounts need this code, by any sign-in method                        |
| `SIGNUP_OPEN=1`                              | Self-hosted only: anyone may create an account                            |
| `DATABASE_PATH`                              | SQLite file, used when `MONGODB_URI` is unset; one of the two is required |

Each sign-in method is on when its settings are, and the server refuses to start in production when none is. Sign-up stays open on MongoDB; with SQLite it needs `SIGNUP_INVITE_CODE` or `SIGNUP_OPEN=1`.

Sign-in and account-deletion emails are HTML with a plain-text part, sent over SMTP, so any provider works: `SMTP_URL=smtp://<login>:<key>@<host>:587` (URL-encode `@` in the login as `%40`). `EMAIL_FROM` must use a domain verified with that provider. In development without `SMTP_URL`, sign-in links print to the server console; in production, email sign-in is off without both.

Password accounts store a placeholder address (`<username>@users.invalid`) because Better Auth needs one; it is never shown or mailed. They confirm deleting their account with their password. Accounts without a password confirm by emailed link, or, with email off, by a sign-in from the last 5 minutes.

To enable a social provider, register an OAuth app ([Google](https://console.cloud.google.com/apis/credentials), [Discord](https://discord.com/developers/applications)) with the redirect URL `<BETTER_AUTH_URL>/api/auth/callback/google` or `.../callback/discord`.

Better Auth rate-limits its endpoints with counters stored in the database, so limits hold across server instances.

Characters written before accounts existed have no owner and are never returned. Drop the dev `characters` and `portraits` collections once.

See [docs/deployment.md](docs/deployment.md) for the hosting plan.

## Self-hosting

Anyone can run their own copy from the Docker image, with a SQLite file instead of MongoDB and no outside services: see [docs/self-hosting.md](docs/self-hosting.md). Storage is MongoDB when `MONGODB_URI` is set and SQLite when `DATABASE_PATH` is (the server refuses to start with neither); both pass the same store tests.

## Export and import

Characters can be saved to a `.json` file and loaded back, to keep a backup or move characters between accounts or devices without syncing.

- **Export all** on _Load a Character_ (also offered in the delete-account dialog) saves every character in the open store as `wild-cards-go-<date>.json`. It is disabled while there are none.
- The download button on a character sheet saves just that character as `<name>.wildcards.json`.
- Portraits are embedded as data URLs, so one file holds everything.
- **Import** adds every character in the file as a new one with a fresh id, so it never overwrites or conflicts with an existing character. It is all or nothing: a damaged file imports nothing. Imported characters sync like any other edit.

## Privacy and feedback

`/privacy` explains what the app stores and why; questions go to `privacy@orderofthenuts.club`. The footer's _Feedback_ link opens an email to `feedback@orderofthenuts.club` for bug reports and feature requests.

## Development

```bash
bun install
bun run start:mongo   # MongoDB in Docker
bun run dev
```

Copy `.env.example` to `.env.local` and fill in at least `MONGODB_URI`, `MONGODB_DB` and `BETTER_AUTH_SECRET`. While MongoDB is down the API answers `503` and the client keeps retrying; edits are safe in the browser meanwhile.

Other scripts:

```bash
bun test        # unit tests; the server tests need MongoDB running
bun run build   # production build plus service worker
bun run check   # Biome lint + format
```

The server tests connect to `MONGODB_URI` (default `mongodb://localhost:27017`) and use, then drop, a `wcg_test` database. The store tests run against both MongoDB and an in-memory SQLite.

To run locally on SQLite instead: `MONGODB_URI= DATABASE_PATH=./data/wcg.db bun run dev`.

## License

The code is licensed under the [GNU AGPL v3.0 or later](LICENSE). The Savage Worlds material and the Fan License logo are not covered by it; they are used under Pinnacle's Fan License. See [NOTICE.md](NOTICE.md) for details and what forks must keep.
