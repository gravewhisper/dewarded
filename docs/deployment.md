# Deploy and run Dewarded on Fly.io

Dewarded runs as one Fly machine. The SQLite file lives on a Fly volume mounted at `/data`, and the `Dockerfile` points `DATABASE_URL` at `file:/data/dewarded.db`. `fly.toml` lets Fly stop the machine when it is idle and start it again on the next request.

To run Dewarded on your own machine first, see [Develop Dewarded locally](development.md).

## Deploy for the first time

The pepper keys every hash in the database, so it has to exist before the first deploy and never change after it.

1. Edit `app`, `primary_region`, and `PUBLIC_URL` in `fly.toml`.
2. Create the app and its volume. Use your `primary_region` value as `<region>`.

	```bash
	fly apps create <app>
	fly volumes create dewarded_data --size 1 --region <region>
	```

3. Generate a pepper into a file that only you can read.

	```bash
	(umask 077; openssl rand -hex 32 > pepper.txt)
	```

4. Copy the pepper from `pepper.txt` into a password manager. Keep that copy for as long as the database exists.
5. Set the secrets, then delete the file.

	```bash
	printf 'STEAM_ID_PEPPER=%s\n' "$(cat pepper.txt)" | fly secrets import
	printf 'SESSION_SECRET=%s\n' "$(openssl rand -hex 32)" | fly secrets import
	rm pepper.txt
	```

6. Deploy.

	```bash
	fly deploy
	```

7. Add the domain's certificate with `fly certs add <domain>`, then set up DNS as [Point the domain at Fly](#point-the-domain-at-fly) describes.

## Never change the pepper

The database stores a keyed hash in place of each Steam ID and holds no Steam IDs to hash again, so a page finds its owner only with the pepper it was made with.

- The database remembers a check value made from the first pepper it opened with, in the `pepper_check` table. A server started with any other pepper refuses to start, and the log says so without printing either pepper.
- Production also refuses to start with no pepper, with a value that is not 32 or more hex characters, or with the development pepper of 64 zeros.
- If the pepper is lost, the server refuses to start on the old database, and no owner can sign in to their page again.
- Changing `SESSION_SECRET` is safe. It signs everyone out, and nothing else changes.

## Deploy a new version

Run `fly deploy`. At startup, `server.mjs` opens the database before it serves a request. Opening it creates any missing tables, checks the pepper, and replaces any stored Steam IDs with hashes. If any step fails, the server exits and `fly logs` shows the error.

Before a deploy that changes the schema, [back up the database](#back-up-the-database).

## Upgrade a database from before the hash release

If your database came from a version of Dewarded that stored Steam IDs, its `claims` or `verifications` table has a `steam_id64` column. To move it to hashes, follow these steps.

1. [Back up the database](#back-up-the-database).
2. Set `STEAM_ID_PEPPER` as the first deploy describes. Without it, the production server refuses to start.
3. Run `fly deploy`. On startup, Dewarded replaces every Steam ID with its hash in one write transaction, so a bad row leaves the old data untouched. For a local file, it then runs `VACUUM` and a WAL checkpoint, so the file keeps no copy of the old IDs. A remote libSQL database such as Turso gets the hashes but no `VACUUM`.
4. Expect everyone to sign in again. A session from before the release holds no hash, so Dewarded reads it as signed out. Signing in through Steam again finds the same page.
5. Delete the backup from step 1 once the new version works, because it still holds Steam IDs.

## Deploy in reddit mode

1. Set `VERIFY_MODE = "reddit"` under `[env]` in `fly.toml`.
2. Set the Reddit app's credentials as secrets.

	```bash
	fly secrets set REDDIT_CLIENT_ID=<id> REDDIT_CLIENT_SECRET=<secret>
	```

3. Set the Reddit app's redirect URI to `<PUBLIC_URL>/auth/reddit/callback`.
4. Run `fly deploy`.

## Point the domain at Fly

Cloudflare is the registrar and DNS host for dewarded.com. The apex A and AAAA records are DNS only, so browsers connect straight to Fly, and Fly's Let's Encrypt certificate serves the apex. `fly certs setup dewarded.com` prints the values that Fly needs.

| Name | Type | Value | Proxy status |
| --- | --- | --- | --- |
| `dewarded.com` | A | `66.241.124.134`, the shared Fly IPv4 address | DNS only |
| `dewarded.com` | AAAA | `2a09:8280:1::1d5:a555:0`, the app's dedicated Fly IPv6 address | DNS only |
| `_fly-ownership.dewarded.com` | TXT | `app-lzn05py` | DNS only |
| `_acme-challenge.dewarded.com` | CNAME | `dewarded.com.lzn05py.flydns.net` | DNS only |
| `www.dewarded.com` | A | `192.0.2.1`, a placeholder that no request reaches | Proxied |
| `dewarded.com` | MX | `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, and `route3.mx.cloudflare.net` | Not applicable |
| `dewarded.com` | TXT | `v=spf1 include:_spf.mx.cloudflare.net ~all` | Not applicable |

The `_fly-ownership` record proves to Fly that the domain belongs to the app. The `_acme-challenge` record lets Fly renew its certificate through a DNS challenge, so renewal does not depend on Let's Encrypt reaching Fly over HTTP. Both records are harmless with the apex on DNS only. `fly certs check dewarded.com` shows whether the certificate is issued.

To check that the apex reaches Fly directly, run `curl -sI https://dewarded.com/`. The response has `server: Fly` and no `cf-ray` header.

## Keep the apex off Cloudflare's proxy

Do not switch the apex A and AAAA records to Proxied. A proxied hostname ends TLS at Cloudflare, so Cloudflare decrypts every request to it. For the apex, that includes the Steam callback's query string and the session cookie, and both carry the Steam ID. The site promises that only Dewarded's server sees a Steam ID, and a proxied apex breaks that promise.

Repeat visits stay fast without the proxy because browsers cache static files. `server.mjs` marks files under `/assets/`, whose names change with each build, as public for a year and immutable, and other static files as public for 7 days. Pages send `Cache-Control: no-store`.

Only `www.dewarded.com` is proxied, because Cloudflare runs redirect rules only for proxied names. The Cloudflare **SSL/TLS** mode is **Full (strict)** and **Always Use HTTPS** is on. Both settings act only on proxied hostnames, so today they affect `www` alone.

## Redirect www to the apex

Steam sends the browser back to `PUBLIC_URL`, and the session cookie has no `Domain` attribute, so the cookie belongs to the apex alone. A sign-in started on `www` would keep its nonce in a cookie that the apex never sees, and fail. For that reason `www` redirects instead of serving the app, and Fly needs no certificate for it. The redirect never sees a session cookie or a sign-in, so proxying `www` exposes no Steam ID.

1. In Cloudflare DNS, add an A record for `www` with the value `192.0.2.1` and the proxy on. Cloudflare runs redirect rules only for proxied names, and `192.0.2.1` is a reserved documentation address.
2. Add a Cloudflare redirect rule for the hostname `www.dewarded.com`. Make it a 301 to `https://dewarded.com` with the same path, and keep the query string.
3. Check the redirect.

	```bash
	curl -sI 'https://www.dewarded.com/faq?x=1'
	```

	The response is a `301` with `location: https://dewarded.com/faq?x=1`.

## Route mail for privacy@dewarded.com

The privacy page and the FAQ show `privacy@dewarded.com`, which is `PRIVACY_EMAIL` in `src/site.ts`. Cloudflare Email Routing forwards it.

1. Turn on Email Routing for the domain in Cloudflare. It adds the MX and SPF records above.
2. Add a destination address and confirm it from the mail that Cloudflare sends.
3. Add the custom address `privacy` and forward it to that destination.
4. Send a test from another account and check that it arrives.

Write the destination address only in Cloudflare. The repository, the site, and these docs show `privacy@dewarded.com` and no personal address.

## Back up the database

Fly snapshots the volume once a day. For `dewarded_data`, `fly volumes show <volume-id>` reports scheduled snapshots on and a retention of 14 days. `fly volumes snapshots list <volume-id>` lists the snapshots, and `fly volumes create dewarded_data --snapshot-id <snapshot-id> --region <region>` makes a new volume from one.

To keep a copy on your own machine, follow these steps.

1. Wake the machine, because `fly ssh` needs it running and Fly stops it when it is idle.

	```bash
	curl -s -o /dev/null https://dewarded.com/
	```

2. Copy the database file.

	```bash
	fly ssh sftp get /data/dewarded.db ./dewarded-backup.db -a dewarded
	```

3. Check that the copy is complete and readable.

	```bash
	sqlite3 ./dewarded-backup.db 'PRAGMA integrity_check; SELECT count(*) FROM claims;'
	```

	The output is `ok` and the number of claims. If the check fails, take the copy again.

A copy holds hashes, not Steam IDs, and it works only with the pepper it was made with. It still holds every claimed Reddit name and page. A page that its owner deletes on the site stays in older copies and snapshots until they are deleted or expire, so delete a local copy once you no longer need it.

## Restore the database

Nobody has run these steps against dewarded.com yet. Try them on a scratch app before you rely on them.

1. Check the backup with the integrity check in [Back up the database](#back-up-the-database).
2. Wake the machine, then upload the backup next to the live file.

	```bash
	curl -s -o /dev/null https://dewarded.com/
	fly ssh sftp put ./dewarded-backup.db /data/restore.db -a dewarded
	```

3. Replace the live file and restart the app.

	```bash
	fly ssh console -a dewarded -C "mv /data/restore.db /data/dewarded.db"
	fly apps restart dewarded
	```

On start, `docker-entrypoint.sh` gives `/data` back to the `node` user, and the server opens the restored file. The server must run with the pepper that the backup was made with. A restore loses every change after the backup, and a page deleted after the backup comes back.
