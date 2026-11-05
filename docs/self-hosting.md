# Self-hosting Wild Cards Go

Run your own copy of Wild Cards Go for your table, or just for yourself. It's one container. Characters, accounts and sessions live in a single SQLite file in a `/data` volume, and it needs no outside services: no database server and no email provider.

Players still keep working offline. The server is only where their characters sync.

## Quick start

```bash
docker run -d --name wildcards \
  -p 3000:3000 \
  -v wildcards-data:/data \
  -e BETTER_AUTH_URL=https://wildcards.example.com \
  -e AUTH_PASSWORD=1 \
  -e SIGNUP_INVITE_CODE=pick-something \
  --restart unless-stopped \
  registry.gitlab.com/arnonram/wildcards-go:<version>
```

- `BETTER_AUTH_URL` is the address players type, exactly: `https://…`, or `http://<LAN IP>:3000` on a home network (next section).
- `AUTH_PASSWORD=1` turns on username and password accounts.
- `SIGNUP_INVITE_CODE` is the code you give your players. Anyone with it can create an account; change it to stop new sign-ups. Existing accounts keep working.

Then open the address. Players choose **New here? Create an account** and enter the invite code.

## Simplest: share the address on your network

For a table on one home network, you can skip HTTPS. Start the container with the server's LAN address:

```bash
-e BETTER_AUTH_URL=http://192.168.1.20:3000
```

and give players `http://192.168.1.20:3000`. (Find the address in your router, or with `ip addr` / `ipconfig` on the server. Ask the router to always give the server the same one.)

Everything works on that address: accounts, editing, and syncing between devices. If the Wi-Fi drops, a sheet that's already open keeps working and syncs when it's back. Two things don't, because browsers keep them for HTTPS sites:

- **No installed app and no offline start.** The app can't be added to the home screen, and opening it without a connection to the server shows nothing.
- **Passwords cross the network unencrypted.** Fine on your own Wi-Fi; not on a shared or public one.

If players want the installable offline app, or you want to reach it from outside your home, add HTTPS with one of the options below.

## HTTPS: the installable offline app

Image tags: `:<version>` (e.g. `:1.2.0`) for a release, `:latest` for the newest `main`. Pin a version.

Browsers only install the app for offline use on `https://` addresses (or on `localhost`). Set `BETTER_AUTH_URL` to the `https://` address players use.

### With a public domain: Caddy

The easiest way is [Caddy](https://caddyserver.com/), which gets and renews certificates by itself. It needs a domain name pointing at the machine, with ports 80 and 443 reachable.

`compose.yaml`:

```yaml
services:
  app:
    image: registry.gitlab.com/arnonram/wildcards-go:<version>
    restart: unless-stopped
    environment:
      BETTER_AUTH_URL: https://wildcards.example.com
      AUTH_PASSWORD: "1"
      SIGNUP_INVITE_CODE: pick-something
    volumes:
      - data:/data

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data

volumes:
  data:
  caddy-data:
```

`Caddyfile`:

```
wildcards.example.com {
	reverse_proxy app:3000
}
```

Start it with `docker compose up -d`.

### On a home network

Running it on a home server or NAS and want HTTPS? The catch is the address. Browsers only trust certificates for real domain names, and nobody issues one for a LAN address like `192.168.1.20`. Caddy pointed at a bare IP makes its own certificate, which phones and browsers reject: you get warnings, and the app won't install or work offline. Pick one of these instead, and set `BETTER_AUTH_URL` to the `https://` address it gives you.

#### Cloudflare Tunnel: a real address, no open ports

If your domain's DNS is on Cloudflare, a tunnel gives the app an address like `https://wildcards.example.com` with a trusted certificate. No ports are opened on your router, there's no Caddy, and it also works away from home. It is reachable from the internet, so keep sign-up behind an invite code.

1. In the Cloudflare dashboard, open **Zero Trust → Networks → Tunnels**, create a tunnel (type _Cloudflared_), and copy its token.
2. Under the tunnel's **Public hostnames**, add `wildcards.example.com` with service `http://app:3000`.
3. Run the tunnel next to the app:

```yaml
services:
  app:
    image: registry.gitlab.com/arnonram/wildcards-go:<version>
    restart: unless-stopped
    environment:
      BETTER_AUTH_URL: https://wildcards.example.com
      AUTH_PASSWORD: "1"
      SIGNUP_INVITE_CODE: pick-something
    volumes:
      - data:/data

  tunnel:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: <token from step 1>

volumes:
  data:
```

#### Tailscale: private to your group

[Tailscale](https://tailscale.com/) gives the server an address like `https://nas.tail1234.ts.net` with a trusted certificate. Only devices in your tailnet can reach it: nothing is on the internet, but every player has to install Tailscale and be given access (share the machine with them from the admin console).

1. Install Tailscale on the server, and in the admin console turn on **MagicDNS** and **HTTPS certificates**.
2. Start the app with the quick-start command, publishing port 3000.
3. On the server: `tailscale serve --bg 3000`. It prints the `https://…ts.net` address; use it as `BETTER_AUTH_URL` (restart the container after changing it).

#### Your own domain, LAN only

If you want a real certificate but no access from outside, point a name like `wildcards.home.example.com` at the server's LAN IP and have Caddy get the certificate through your DNS provider instead of over the internet (the DNS challenge). That needs a Caddy build with your provider's [DNS plugin](https://github.com/caddy-dns) and an API token; see the plugin's README. Some home routers block DNS answers that point at LAN addresses ("DNS rebinding protection"); allow the name there if it doesn't resolve.

## Settings

| Variable                                     | Needed             | Purpose                                                                                                        |
| -------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`                            | yes                | Public address, e.g. `https://wildcards.example.com`                                                           |
| `AUTH_PASSWORD=1`                            | one sign-in method | Username and password accounts                                                                                 |
| `AUTH_PASSWORD_MIN_LENGTH`                   | no                 | Shortest password for new accounts; default 8. A lower minimum is easier for a home table, and easier to guess |
| `SMTP_URL`, `EMAIL_FROM`                     | one sign-in method | Email sign-in links over any SMTP provider, e.g. `smtp://login:key@smtp.example.com:587`                       |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`   | one sign-in method | Google sign-in; redirect URL `<BETTER_AUTH_URL>/api/auth/callback/google`                                      |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | one sign-in method | Discord sign-in; redirect URL `<BETTER_AUTH_URL>/api/auth/callback/discord`                                    |
| `SIGNUP_INVITE_CODE`                         | no                 | New accounts, by any method, need this code                                                                    |
| `SIGNUP_OPEN=1`                              | no                 | Anyone who reaches the server may create an account                                                            |
| `BETTER_AUTH_SECRET`                         | no                 | Session-signing secret. If unset, one is generated on first start and kept in `/data/auth-secret`              |
| `DATABASE_PATH`                              | set in the image   | The SQLite file; `/data/wcg.db` in the image. Required when running from the source                            |
- **At least one sign-in method** must be on, or the server refuses to start and says so.
- **Without an invite code or `SIGNUP_OPEN=1`, no one can create an account.** That keeps a server you just started from being open to anyone who finds it.
- If the container exits with `Cannot open SQLite database at …`, the volume isn't writable. The app runs as the `node` user (uid 1000); for a host folder instead of a named volume, `chown 1000:1000` it.

### Accounts and deleting them

- Password accounts need no email. There is **no password reset**: a player who forgets theirs can't get back in. As the host you can delete their account so they can sign up again (see below); export characters first if you can reach them.
- Players delete their own account from the account menu. Password accounts confirm with their password. Google and Discord accounts confirm with the emailed link when email is set up, and otherwise by having signed in within the last 5 minutes.

To delete an account by hand, stop the container and run, against a copy of the file first:

```bash
sqlite3 wcg.db "SELECT id, username, name FROM user;"
```

Then, with that id: delete its characters and portraits, its sessions and accounts and the user, and record the id as deleted so the player's devices remove their copies:

```sql
DELETE FROM portraits WHERE id IN (SELECT id FROM characters WHERE owner_id = '<id>');
DELETE FROM characters WHERE owner_id = '<id>';
DELETE FROM session WHERE userId = '<id>';
DELETE FROM account WHERE userId = '<id>';
DELETE FROM user WHERE id = '<id>';
INSERT INTO deleted_users (id, deleted_at) VALUES ('<id>', unixepoch() * 1000);
```

## Backups

Everything is in the volume: `wcg.db` (plus its `-wal` and `-shm` files while running) and `auth-secret`.

A consistent copy while the server runs, using the app's own container (named `wildcards` in the quick start; with compose, use `docker compose exec app` and `docker compose cp app:/data/backup.db …` instead):

```bash
docker exec wildcards node -e \
  "new (require('node:sqlite').DatabaseSync)('/data/wcg.db').exec(\"VACUUM INTO '/data/backup.db'\")"
docker cp wildcards:/data/backup.db ./wcg-$(date +%F).db
docker exec wildcards rm /data/backup.db
```

Or stop the container and copy the volume. Keep `auth-secret` with your backups: without it, everyone is signed out after a restore (their characters are safe).

Run the backup on a schedule (cron, a systemd timer) and keep copies off the machine.

## Updating

```bash
docker pull registry.gitlab.com/arnonram/wildcards-go:<new version>
docker compose up -d   # or: docker rm -f wildcards, then the docker run above with the new tag
```

The database is updated at start, so there is nothing to migrate by hand. Back up first.

## Running from the source

Without Docker, with [Bun](https://bun.sh) and Node 24:

```bash
git clone https://gitlab.com/arnonram/wildcards-go.git
cd wildcards-go
bun install
bun run build
DATABASE_PATH=./data/wcg.db BETTER_AUTH_URL=https://wildcards.example.com \
  AUTH_PASSWORD=1 SIGNUP_INVITE_CODE=pick-something bun run start
```

`DATABASE_PATH` is required here: the server won't start without a database setting. You can also put the settings in a `.env.local` file.

## Limits

- One server process per database file. Don't run two containers on one volume.
- No password reset, and no admin page: account management beyond what players do themselves is by hand, as above.
- The app's privacy page describes the official site. On your server, you're the one who decides how players' data is handled.
