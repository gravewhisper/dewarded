# Medallion

An opt-in site where a Reddit user links their Steam account and gets a public
page at `/u/<reddit-name>` showing their Dota 2 medal as OpenDota reports it.

```bash
pnpm install
cp .env.example .env   # optional in dev
pnpm dev
```

Without `REDDIT_CLIENT_ID`, dev builds replace Reddit login with a clearly
labelled fake form. Production builds compile that form out.

## Scripts

- `pnpm test` runs the domain tests (`node --test`).
- `pnpm typecheck` runs `tsc`. The route tree types come from the Vite plugin,
  so run `pnpm dev` or `pnpm build` once after adding a route.
- `pnpm seed <reddit-name> <steamId64>` links an account through the same
  OpenDota fetch and upsert the Steam callback uses, with no login.
- `scripts/verify-steam-forgery.sh <cookie-jar> <db>` sends forged Steam
  callbacks to a running dev server and prints the row count before and after.

## Layout

- `src/domain.ts` holds the types and pure functions (medal parsing, region
  picking, labels). No framework imports.
- `src/server/opendota.ts` is the only code that sees raw `rank_tier`.
- `src/server/db.ts` is the only code that touches the database.
- `src/server/steam.ts` and `src/server/reddit.ts` own the login protocols.
- `src/routes/auth.*` and `src/routes/api.*` are server-only handlers.

## Deploying to Fly.io

The app runs as one machine with the SQLite file on a Fly volume. Edit `app`,
`primary_region` and `PUBLIC_URL` in `fly.toml`, then:

```bash
fly apps create <app>
fly volumes create medallion_data --size 1 --region <region>
fly secrets set SESSION_SECRET=$(openssl rand -hex 32) \
  REDDIT_CLIENT_ID=... REDDIT_CLIENT_SECRET=...
fly deploy
```

Set the Reddit app's redirect URI to `<PUBLIC_URL>/auth/reddit/callback`.
`pnpm build && pnpm start` runs the same production server locally.

## OpenDota limits

The free tier allows 60 calls a minute and 3000 a day per server IP. Each check
costs two calls, so refresh is owner-only with a one-hour cooldown.

## License and credits

MIT, see `LICENSE`. Rank data comes from the [OpenDota API](https://docs.opendota.com).

MMR estimates from [Liquipedia](https://liquipedia.net/dota2/Matchmaking/Seasonal_Rankings) (CC BY-SA 3.0). The Immortal start of 5,620 is Medallion's inference from Liquipedia's Divine 5 value, not a Liquipedia number.
Medallion is not affiliated with Valve. Dota 2 is a trademark of Valve Corporation.
The medal images in `public/medals/` belong to Valve, come from [OpenDota's web repo](https://github.com/odota/web), and are not covered by the MIT license.
