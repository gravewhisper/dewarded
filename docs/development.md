# Develop Dewarded locally

This guide covers running Dewarded on your own machine, its settings, its scripts, and where the code lives. To put it online, see [Deploy and run Dewarded on Fly.io](deployment.md). For the reasons behind the design, see [How Dewarded works](architecture.md).

## Start the dev server

The `Dockerfile` builds with Node.js 22 and pnpm 12. Install the dependencies, copy the example environment, and start the dev server.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000. Steam login and OpenDota need no keys, and the dev server starts in backlink mode.

The dev server reads `.env`. `pnpm start` and the seed and verify scripts do not, so export a variable in the shell when one of them needs it.

The dev server keeps its database in `data/dewarded.db`. With no `SESSION_SECRET`, it makes a new secret on each start, so sessions end when it restarts. With no `STEAM_ID_PEPPER`, it uses a pepper of 64 zeros, so dev pages keep their owners across restarts.

A database refuses to open with any pepper other than the one it was first opened with. If you change `STEAM_ID_PEPPER`, point `DATABASE_URL` at a new file.

## Try reddit mode

Set `VERIFY_MODE=reddit` in `.env` and restart `pnpm dev`. If `REDDIT_CLIENT_ID` is empty, a form marked as a dev-only fake login stands in for the Reddit login. A production build never shows that form.

To use a real Reddit login, follow these steps.

1. Create an app of type **web app** in [Reddit's app preferences](https://www.reddit.com/prefs/apps).
2. Set its redirect URI to `<PUBLIC_URL>/auth/reddit/callback`.
3. Put its client ID in `REDDIT_CLIENT_ID` and its secret in `REDDIT_CLIENT_SECRET`.

## Set environment variables

`src/server/config.ts` reads these variables once at startup, and `.env.example` lists them. Production means `NODE_ENV=production`, which `pnpm start` and the `Dockerfile` set.

| Variable | Value | When it is unset |
| --- | --- | --- |
| `VERIFY_MODE` | `backlink` or `reddit`. Any other value stops the server at startup. | `backlink` |
| `PUBLIC_URL` | The origin the site is served from, such as `https://dewarded.com`. Dewarded builds the Steam and Reddit callback URLs, page links, and link-preview image URLs from it, and drops a trailing slash. | `http://localhost:3000`. Production refuses to start. |
| `SESSION_SECRET` | A random secret that signs the session cookie, such as the output of `openssl rand -hex 32`. Dewarded checks only that it is set, not its length. | A new random secret on each start. Production refuses to start. |
| `STEAM_ID_PEPPER` | 32 or more hex characters, such as the output of `openssl rand -hex 32`. It keys the hash that Dewarded stores in place of each Steam ID. Upper-case hex reads as lower case. | 64 zeros. Production refuses to start, and also refuses the 64-zero pepper. |
| `DATABASE_URL` | A libSQL URL. Use a local file such as `file:./data/dewarded.db`, or `libsql://<db>.turso.io` for Turso. | `file:./data/dewarded.db` |
| `DATABASE_AUTH_TOKEN` | The auth token for a remote libSQL database such as Turso. | None |
| `REDDIT_CLIENT_ID` | The client ID of the Reddit app. Reddit mode only. | None |
| `REDDIT_CLIENT_SECRET` | The client secret of the Reddit app. Reddit mode only. | None |

`server.mjs` listens on `PORT`, which srvx reads and which defaults to 3000.

## Run the checks and scripts

Run each command from the repository root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the dev server on port 3000 and keeps `src/routeTree.gen.ts` up to date. |
| `pnpm test` | Runs every `src/**/*.test.ts` file with `node --test`, loading TypeScript through `tsx`. |
| `pnpm typecheck` | Runs `tsc --noEmit`. A new route fails the check until `pnpm generate-routes`, `pnpm dev`, or `pnpm build` updates `src/routeTree.gen.ts`. |
| `pnpm generate-routes` | Regenerates `src/routeTree.gen.ts` from the files in `src/routes/`. |
| `pnpm build` | Builds the app into `dist/`. |
| `pnpm start` | Runs `server.mjs` on the build with `NODE_ENV=production`. Export `PUBLIC_URL`, `SESSION_SECRET`, and `STEAM_ID_PEPPER` first, or it refuses to start. |
| `pnpm seed-claim <reddit-name> <steamId64>` | Creates or renames a backlink-mode claim with no login, through the same code as the claim form, and prints the claim. |
| `pnpm seed <reddit-name> <steamId64>` | Links a reddit-mode account with no login, through the same OpenDota check as the Steam callback, and prints the record. |

Both seed scripts call OpenDota and write to the database that `DATABASE_URL` names.

### Check that forged Steam logins fail

`scripts/verify-steam-forgery.sh` sends seven forged Steam callbacks to a running server and prints the row counts of a local database before and after. It needs `curl`, `node`, and the `sqlite3` CLI.

```bash
BASE=http://localhost:3000 scripts/verify-steam-forgery.sh <cookie-jar> data/dewarded.db
```

In backlink mode, pass `/dev/null` as the cookie jar. In reddit mode, pass a jar that holds a session logged in through Reddit. Each forgery starts its own Steam login first, so it carries a valid nonce, except the two that test a missing nonce and a nonce from another browser.

If the server rejects every forgery, each line shows a `302` to `/link?error=<code>` with no `SIGNED-IN`, and the row counts stay the same. A line ends in `SIGNED-IN` and the last four digits of a Steam ID only when a forgery signed the browser in to an account its jar did not already hold.

### Check that no page shows a Steam ID

`pnpm verify-steam-id-hidden` signs in as one Steam account with a cookie it signs itself, then loads `/`, `/me`, `/link`, `/faq`, `/privacy`, and the account's page. Use it against a backlink-mode server where that account already has a claim, because it finds the page through the `/p/` link on `/me`.

```bash
BASE=http://localhost:3000 SESSION_SECRET=<secret> STEAM_ID_PEPPER=<pepper> STEAM_ID64=<steamId64> pnpm verify-steam-id-hidden
```

`SESSION_SECRET` and `STEAM_ID_PEPPER` must match the server's. The script fails unless `/me` and the page show the owner as signed in. It also fails if any page contains the Steam ID, the Dota account ID, or the hash. It takes the secret and the Steam ID from the environment, so they stay out of the process list.

## Find your way around the code

This table lists the main paths, not every file.

| Path | What it holds |
| --- | --- |
| `src/domain.ts` | Types and pure functions for medals, tier colors, MMR ranges, regions, claim ids, and Reddit names. It imports no framework code. |
| `src/routes/` | The pages, and the server-only handlers in `auth.*` and `api.*` |
| `src/serverFns.ts` | The server functions behind the page loaders |
| `src/server/config.ts` | Reads the environment once |
| `src/server/db.ts` | The only code that touches the database, including the startup migration and the OpenDota call budget |
| `src/server/steamKey.ts` | The keyed scrypt hash of a Steam ID, and the ten-minute cache of recent hashes |
| `src/server/steam.ts`, `src/server/reddit.ts` | The two logins, Steam OpenID 2.0 and Reddit OAuth |
| `src/server/session.ts` | The signed session cookie |
| `src/server/link.ts` | Linking, claiming, and refreshing, with the one-hour refresh cooldown |
| `src/server/opendota.ts` | The only code that calls OpenDota, and the guards that keep Dewarded inside its free tier |
| `src/server/securityHeaders.ts`, `src/start.ts` | The security headers and the CSRF middleware |
| `src/components/` | The medal card, the example cards on the landing page, and the forms for the Reddit name and the MMR |
| `server.mjs` | The production server. It serves `dist/client` and the built app with srvx. |
| `scripts/` | The seed scripts and the two verify scripts |
