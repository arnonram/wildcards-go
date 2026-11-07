# Deploying to Vercel

How to run Wild Cards Go the way the official instance runs: Vercel for the app, MongoDB Atlas for data, an SMTP provider for sign-in emails. Everything fits free tiers. For a single container with SQLite and no outside services, see [self-hosting.md](self-hosting.md) instead.

Below, `app.example.com` stands for your address. Prices, free-tier limits and console menu names change; check them as you go.

## The setup

| Part        | Choice                                               | Cost |
| ----------- | ---------------------------------------------------- | ---- |
| App hosting | Vercel Hobby, deploying from the Git repo            | free |
| Database    | MongoDB Atlas M0                                     | free |
| Email       | Any SMTP provider (the official instance uses Brevo) | free |
| Sign-in     | Email links, plus Google and Discord (optional)      | free |

**Why it fits:**

- The app is offline-first: players keep working when the server is slow or down, so free-tier limits and cold starts hurt little.
- Everything is configured through environment variables, so moving to a VPS later (Docker Compose with MongoDB and Caddy) means a plain `next build` plus `MONGODB_URI`.
- Cloudflare Workers won't work: the MongoDB driver needs raw TCP and Node APIs.

**Vercel Hobby limits:**

- Non-commercial use only. Charging or showing ads means Vercel Pro.
- Preview deployments get their own URLs. Email and password sign-in work there: on a preview, Better Auth accepts exactly that deployment's own addresses (`VERCEL_URL`, `VERCEL_BRANCH_URL`), with `BETTER_AUTH_URL` as the fallback. Google and Discord sign-in won't work unless each URL is registered.

## Email

Any SMTP provider works. Add your sending domain with **individual DNS records** (DKIM CNAMEs, a DMARC TXT, and the provider's verification TXT), not by delegating the whole subdomain to the provider, which would take it away from Vercel. Keep those records **DNS only** if your DNS host can proxy them: proxied DKIM records break DKIM. Turn off click tracking for transactional email, or sign-in links get routed through the provider.

```bash
SMTP_URL="smtp://<login, with @ as %40>:<smtp-key>@<provider's SMTP host>:587"
EMAIL_FROM="Wild Cards Go <signin@app.example.com>"
```

URL-encode any `@` in the login as `%40`. The app refuses an `SMTP_URL` that isn't an `smtp://` or `smtps://` URL. Without an MX record, replies to sign-in emails bounce; add one, or a `Reply-To`, if replies should reach someone.

Check one real email before going live: it arrives, isn't in spam, its link points straight at the app, and the original message shows SPF, DKIM and DMARC **PASS**.

## Database: MongoDB Atlas

- Create an **M0** cluster. Match the major version to local development and CI (`docker-compose.yml`, the CI config), or change those to match and run `bun test` against it.
- Create a database user with a strong generated password and access only to this app's database.
- **Network access:** Vercel's outgoing IPs aren't fixed, so on the free tier you have to allow `0.0.0.0/0`, and the password is the protection.
- Put the connection string in `MONGODB_URI` and pick a database name for `MONGODB_DB`.
- **Backups:** M0 has no managed backups. Schedule a regular `mongodump` and keep it somewhere other than Atlas.

The app creates its own indexes on first connect and needs no migration. Portraits are downscaled to 512px WebP (roughly 30–60 KB each), so 512 MB holds thousands of characters. Deleted-character tombstones (about 150 bytes each) are kept on purpose; see [the auth design](design/2026-10-25-auth-design.md).

## App: Vercel

Create a project from the Git repo. Vercel detects Bun from `bun.lock`; the build command is `bun run build`, which also builds the service worker. Better Auth's rate limiter keeps its counters in MongoDB, so every Vercel instance shares them.

Environment variables, for **Production** and **Preview** (previews run in production mode and refuse to start without a sign-in method):

| Variable                                     | Value                                                      |
| -------------------------------------------- | ---------------------------------------------------------- |
| `MONGODB_URI`, `MONGODB_DB`                  | from Atlas                                                 |
| `BETTER_AUTH_SECRET`                         | new, `openssl rand -base64 32`; never reuse the dev secret |
| `BETTER_AUTH_URL`                            | `https://app.example.com`                                  |
| `SMTP_URL`, `EMAIL_FROM`                     | as above                                                   |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | optional; the Google button shows only when both are set   |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | optional; the Discord button shows only when both are set  |

Keep Vercel's system variables exposed (the default): sign-in on previews needs `VERCEL_ENV` and `VERCEL_URL`, and the rate limiter relies on `VERCEL` to know Vercel's edge sets the client IP.

## Address

Add the domain under **Domains** in Vercel and point DNS at it. If the name also carries a TXT record (an email provider's verification, say), use an **A record**, not a CNAME: DNS doesn't allow a CNAME beside other records. Don't put a CDN proxy in front; Vercel handles TLS and caching.

## Sign-in providers

Add each production redirect URL, and keep the `localhost` ones for development.

- **Google** ([Cloud Console](https://console.cloud.google.com/) → Google Auth Platform):
  - **Clients:** origin `https://app.example.com`, redirect `https://app.example.com/api/auth/callback/google`.
  - **Branding:** app name, support email, home page, privacy policy (`/privacy`), authorized domain. Skip the logo: it triggers Google's brand verification.
  - **Audience:** publish the app; while it's in Testing, only listed test users can sign in. It asks only for name, email and picture, so publishing shouldn't need full verification.
- **Discord** ([Developer Portal](https://discord.com/developers/applications) → OAuth2): redirect `https://app.example.com/api/auth/callback/discord`.

Accounts link by **verified** email only, so the same address through Google and an email link lands in one account.

## Smoke test

- Sign in with an email link, with Google, and with Discord if enabled.
- Two devices, one account: an edit on one appears on the other within about 30 seconds.
- Install the PWA and open it offline: the characters are there.
- Delete a throwaway account through the account menu: the confirmation email arrives, `/delete-account` deletes it, and the notice shows.

## Moving to another address later

Each browser's local data belongs to the address it was saved on. After a move, players sign in again to pull their synced characters, and installed apps need reinstalling. Signed-out players' characters and unsynced edits exist only on the old address, so keep it serving the app for a few weeks with a notice pointing at the export, before redirecting it.

Review `/privacy` (`pages/privacy.tsx`) whenever what the app stores changes.
