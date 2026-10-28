# Deployment plan

The plan for the first public deployment of Wild Cards Go, as agreed on 2026-10-28. Prices, free-tier limits and console menu names were current at the time of writing; check them when you do each step.

## Target setup

| Part        | Choice                                                        | Cost |
| ----------- | ------------------------------------------------------------- | ---- |
| App hosting | Vercel Hobby, deploying from the GitLab repo                  | free |
| Address     | `wildcards.orderofthenuts.club`, DNS on Cloudflare            | —    |
| Database    | MongoDB Atlas M0, EU region                                   | free |
| Email       | Brevo, over SMTP, from `signin@wildcards.orderofthenuts.club` | free |
| Sign-in     | Email links, plus Google and Discord (optional, free)         | free |

**Why this setup:**

- It's a hobby project with unknown traffic, so the setup should cost nothing and need no ops.
- The app is offline-first: players keep working when the server is slow or down, so free-tier limits and cold starts hurt little.
- Everything is configured through environment variables, so moving to a VPS later (e.g. Hetzner with Docker Compose) means a plain `next build` plus `MONGODB_URI`.

**Considered and set aside:**

- **Cloud providers:** overkill for now.
- **Supabase:** isn't an app host, would mean leaving MongoDB, its auth duplicates Better Auth, and free projects pause after about a week of inactivity.
- **The home Proxmox server:** fine for staging or a private instance, but a public app there exposes the home network and keeps the only server copy on one laptop disk.
- **Cloudflare Workers:** the MongoDB driver needs raw TCP and Node APIs.

**Vercel Hobby limits to keep in mind:**

- Non-commercial use only. Charging or showing ads means Vercel Pro (about $20/month).
- Preview deployments get their own URLs, where Google and Discord sign-in won't work unless each URL is registered. Sign in on production only.

## Before the first deploy

- [ ] **Run the browser checklist** from the auth work on `bun run dev`, and merge `auth` into `main`:
  1. Signed in, reload a character sheet: it stays on the sheet.
  2. Two browser profiles, two users: each sees only their own characters.
  3. Sign out and back in: the characters come back.
  4. Signed out, create 2 characters, then sign in: **Not now** leaves them; after a reload, **Add** uploads them.
  5. Two tabs: sign in as someone else in one; the other tab switches.
  6. Offline: sign-out shows "Signing out needs a connection".
  7. Delete the session cookie: the badge shows "Sign in to sync".
- [x] **Better Auth's rate limiter keeps its counters in MongoDB** (`rateLimit: { storage: 'database' }`), shared by every Vercel instance; in memory each instance would count alone. It only runs in production.
- [ ] **Send a real email from dev through Brevo:**
  - set `SMTP_URL` and `EMAIL_FROM` in `.env.local` and sign in with your own address
  - check the email arrives, isn't in spam, and its link points straight at the app, not a Brevo tracking domain
  - in the original message (Gmail: ⋮ → **Show original**), SPF, DKIM and DMARC show **PASS**

## Email: Brevo

Done so far: Brevo account created, and the domain `wildcards.orderofthenuts.club` added with **individual DNS records** (not the Brevo-managed NS delegation, which would take the whole subdomain away from Vercel). Its records are in Cloudflare:

| Name                          | Type  | Value                                              | Proxy    |
| ----------------------------- | ----- | -------------------------------------------------- | -------- |
| `wildcards`                   | TXT   | `brevo-code:…`                                     | DNS only |
| `brevo1._domainkey.wildcards` | CNAME | `b1.wildcards-orderofthenuts-club.dkim.brevo.com`  | DNS only |
| `brevo2._domainkey.wildcards` | CNAME | `b2.wildcards-orderofthenuts-club.dkim.brevo.com`  | DNS only |
| `_dmarc.wildcards`            | TXT   | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` | DNS only |

The DKIM CNAMEs must stay **DNS only**: proxied, they break DKIM. No SPF record is needed on the subdomain, because DMARC passes through DKIM alignment. The branded link-tracking subdomain was skipped on purpose: tracking would route sign-in tokens through Brevo.

Remaining:

- [ ] Click **Verify** on the domain in Brevo.
- [ ] Add the sender `signin@wildcards.orderofthenuts.club`, named "Wild Cards Go".
- [ ] If Brevo has a click-tracking setting for transactional email, turn it off.
- [ ] Create a 64-character SMTP key under **SMTP & API → SMTP** (keys start with `xsmtpsib-`; API keys, `xkeysib-`, don't work over SMTP).

The SMTP settings, for both `.env.local` and Vercel:

```bash
SMTP_URL="smtp://<login with @ as %40>:<smtp-key>@smtp-relay.brevo.com:587"
EMAIL_FROM="Wild Cards Go <signin@wildcards.orderofthenuts.club>"
```

The login is the **Login** field on Brevo's SMTP page, which looks like `xxxx@smtp-brevo.com`, not your account email. URL-encode any `@` in it as `%40`. The app refuses an `SMTP_URL` that isn't an `smtp://` or `smtps://` URL.

The subdomain has no MX record, so replies to sign-in emails bounce. That's acceptable; add an MX or a `Reply-To` if replies should ever reach someone.

## Database: MongoDB Atlas

- [ ] Create an **M0** cluster in an **EU region**. Pick the major version to match local development and CI, currently `mongo:9.0.2` in `docker-compose.yml` and `.gitlab/.gitlab-ci.yml`. If Atlas offers a different major, change those two files to match and run `bun test` against it.
- [ ] Create a database user with a strong generated password, with access only to this app's database.
- [ ] **Network access:** allow `0.0.0.0/0`. Vercel's outgoing IPs aren't fixed, so on the free tier the password is the protection.
- [ ] Copy the connection string into `MONGODB_URI` and choose a database name for `MONGODB_DB`.
- [ ] **Backups:** I'm not aware of M0 getting Atlas's managed backups. Schedule a regular `mongodump` export, e.g. a weekly job from the home server or a CI schedule, and store it somewhere other than Atlas.

The app creates its own indexes on first connect, and needs no other setup or migration. Atlas encrypts data at rest on every tier.

**Storage:** portraits are downscaled to 512px WebP before upload, roughly 30–60 KB each, so 512 MB holds thousands of characters with portraits. Deleted-character tombstones are about 150 bytes each and are kept forever on purpose; see the auth design doc.

## App: Vercel

- [ ] Create a Vercel project from the GitLab repo. It should detect Bun from `bun.lock`; the build command is `bun run build`, which also builds the service worker.
- [ ] Set environment variables for **Production**:

| Variable                                     | Value                                                      |
| -------------------------------------------- | ---------------------------------------------------------- |
| `MONGODB_URI`, `MONGODB_DB`                  | from Atlas                                                 |
| `BETTER_AUTH_SECRET`                         | new, `openssl rand -base64 32`; never reuse the dev secret |
| `BETTER_AUTH_URL`                            | `https://wildcards.orderofthenuts.club`                    |
| `SMTP_URL`, `EMAIL_FROM`                     | from Brevo, as above                                       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | optional; the Google button shows only when both are set   |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | optional; the Discord button shows only when both are set  |
- [ ] **Preview deployments** also run in production mode, and the server **refuses to start** without `SMTP_URL` and `EMAIL_FROM`. Either set those (and the rest) for Preview too, or accept that previews fail.

## Address: DNS on Cloudflare

- [ ] In Vercel, under **Domains**, add `wildcards.orderofthenuts.club`.
- [ ] In Cloudflare, add an **A record** for `wildcards` pointing at the IP Vercel gives, set to **DNS only**.
  - **Not a CNAME:** the name already has Brevo's `brevo-code` TXT record, and DNS doesn't allow a CNAME alongside other records. Keep the TXT; Brevo may re-check it.
  - **Not proxied:** Vercel handles TLS and caching, and a Cloudflare proxy in front causes certificate and caching trouble.
- [ ] Wait for Vercel to issue the certificate.

## Sign-in providers

Each provider needs its production redirect URL added. Keep the `localhost` ones for development.

- [ ] **Google** ([Cloud Console](https://console.cloud.google.com/) → Google Auth Platform):
  - **Clients:** add origin `https://wildcards.orderofthenuts.club` and redirect `https://wildcards.orderofthenuts.club/api/auth/callback/google`.
  - **Audience:** publish the app. While it's in Testing, only listed test users can sign in. It only asks for name, email and picture, so publishing shouldn't need Google's full verification.
- [ ] **Discord** ([Developer Portal](https://discord.com/developers/applications) → OAuth2): add redirect `https://wildcards.orderofthenuts.club/api/auth/callback/discord`.

Both are free. Accounts link by **verified** email only, so the same address through Google and an email link lands in one account.

## Smoke test in production

- [ ] Sign in with an email link. The email arrives from `signin@wildcards.orderofthenuts.club` and passes SPF/DKIM/DMARC.
- [ ] Sign in with Google, and with Discord if enabled.
- [ ] Two devices, one account: an edit on one appears on the other within about 30 seconds.
- [ ] Install the PWA and open it offline: the characters are there.
- [ ] Delete a throwaway account through the account menu: the confirmation email arrives, `/delete-account` deletes it, and the notice shows.

## Later

- **Moving to a dedicated domain:**
  - **Config:** about an hour of DNS, Brevo verification, OAuth redirects, `BETTER_AUTH_URL` and `EMAIL_FROM`.
  - **For users:** each browser's local data belongs to the old address. Players sign in again and pull their synced characters, and installed PWAs need reinstalling.
  - **The real risk:** signed-out players' characters and unsynced edits exist only on the old address. Keep the old address serving the app for a few weeks with a "we're moving" banner, ideally with a JSON export and import, before redirecting it.
  - **Cheapest option:** buy the name before launch, if there's one you'd keep.
- **Outgrowing the free tiers, or going commercial:** a small VPS with Docker Compose, Caddy and MongoDB alongside the app (e.g. Hetzner, about €5/month), or Vercel Pro.
- **Before a wider launch:**
  - a privacy policy covering what's stored (see "stored personal data" in `docs/superpowers/specs/2026-10-25-auth-design.md`), Brevo's sending logs and backups
  - the deferred auth review findings
