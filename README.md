# WildCards Go

Have your Savage Worlds characters with you anywhere!

## Offline-first

The browser is the source of truth. Characters live in IndexedDB and MongoDB is the sync target, so the app keeps working without a connection.

- Every edit is written to IndexedDB at once and the character is marked as changed. About 600 ms after the last edit, the sync engine pushes it to the server.
- Each character carries a version that only the server assigns. A push sends the version it was based on. If another device saved first, the server answers `409` and the sheet asks **Keep mine** or **Use theirs**.
- The client pulls characters changed since its last pull: on startup, when the tab regains focus or comes back online, and every 30 seconds.
- Deletes are versioned writes too, so other devices learn about them.
- Portraits are stored as blobs and synced through their own endpoint, so editing a character never re-sends image bytes.
- If the server is unreachable or returns 5xx, sync backs off (5 s, 15 s, 30 s, 60 s). If the server rejects a character with another 4xx, only that character is marked, and it is retried after its next edit or with the badge's sync button.
- Only one tab syncs at a time (Web Locks).
- A service worker built by [Serwist](https://serwist.pages.dev/) precaches the app shell, so pages load offline. It is registered in production builds; set `NEXT_PUBLIC_ENABLE_SW=1` to register it under `next dev` after a `bun run build`.

### API

| Method      | Path                                     | Purpose                                           |
| ----------- | ---------------------------------------- | ------------------------------------------------- |
| `GET`       | `/api/characters?since=<ms>`             | Characters changed at or after the cursor         |
| `PUT`       | `/api/characters/:id`                    | Versioned write: `{ baseVersion, deleted, data }` |
| `GET`/`PUT` | `/api/characters/:id/portrait?rev=<rev>` | Portrait bytes, up to 2 MiB                       |

## Development

```bash
bun install
bun run start:mongo   # MongoDB in Docker
bun run dev
```

`.env.local` needs `MONGODB_URI` and `MONGODB_DB`. While MongoDB is down the API answers `503` and the client keeps retrying; edits are safe in the browser meanwhile.

Other scripts:

```bash
bun test        # unit tests; the server tests need MongoDB running
bun run build   # production build plus service worker
bun run check   # Biome lint + format
```

The server tests connect to `MONGODB_URI` (default `mongodb://localhost:27017`) and use, then drop, a `wcg_test` database.
