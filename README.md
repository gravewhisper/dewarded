<p align="center">
  <img src="public/medals/rank_icon_8b.png" alt="" width="96" height="96">
</p>

<h1 align="center">Medallion</h1>

<p align="center">
  <strong>Prove your Dota 2 medal on Reddit.</strong><br>
  Sign in with Reddit and Steam, get a page that shows your verified rank, and link it in the thread.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-eef2ec?style=flat-square&labelColor=17191e"></a>
  <a href="https://tanstack.com/start"><img alt="TanStack Start" src="https://img.shields.io/badge/TanStack_Start-1.169-eef2ec?style=flat-square&labelColor=17191e"></a>
  <a href="https://react.dev"><img alt="React 19" src="https://img.shields.io/badge/React-19-eef2ec?style=flat-square&logo=react&logoColor=61dafb&labelColor=17191e"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-eef2ec?style=flat-square&logo=typescript&logoColor=3178c6&labelColor=17191e"></a>
  <a href="https://turso.tech/libsql"><img alt="SQLite via libSQL" src="https://img.shields.io/badge/SQLite-libSQL-eef2ec?style=flat-square&logo=sqlite&logoColor=74c3e8&labelColor=17191e"></a>
  <a href="https://fly.io"><img alt="Hosted on Fly.io" src="https://img.shields.io/badge/hosted_on-Fly.io-eef2ec?style=flat-square&labelColor=17191e"></a>
  <a href="https://www.opendota.com"><img alt="Data from OpenDota" src="https://img.shields.io/badge/data-OpenDota-eef2ec?style=flat-square&labelColor=17191e"></a>
</p>

<p align="center">
  <img src="docs/cards.png" alt="Three Medallion cards: Legend 3 on purple, Immortal #16 on red with a self-reported MMR of 9,200, and Crusader 2 on teal" width="860">
</p>

## Why

Dota subreddits are full of confident gameplay advice. Some of it comes from players whose advice only works in their own bracket. Medallion lets a player show their real medal with one link, instead of a screenshot anyone can fake.

## How it works

1. **Reddit login** proves which Reddit username you own. Medallion asks only for the `identity` scope and reads nothing else.
2. **Steam login** proves which Steam account you own. You sign in on `steamcommunity.com`, and Medallion confirms the response with Steam's own server before trusting it.
3. **OpenDota** supplies the medal, the Immortal leaderboard rank and the region you play in most. Medallion asks OpenDota to refresh the account from Valve first.
4. **Your page** lives at `/u/<reddit-name>`, with a card colored by your medal tier and link previews that show the medal.

## What the card shows

| Field | Where it comes from | Verified |
| --- | --- | --- |
| Medal and stars | OpenDota `rank_tier` | Yes |
| Immortal leaderboard rank | OpenDota `leaderboard_rank` | Yes |
| Region | Most ranked games per server, from OpenDota | Inferred |
| Est. MMR | The usual range for the medal, from Liquipedia | Estimate |
| MMR | Typed in by the player, Immortal only, 5,620 and up | Self-reported |

Valve does not publish numeric MMR, so no outside site can verify it. The card labels every unverified number as such.

## Privacy

- Nothing is stored until both logins succeed.
- The Steam account is never shown publicly. Public pages only receive the medal, region, check date and optional self-reported MMR.
- Reddit tokens are used once to read your username and then discarded.
- One button deletes everything. The full list is on the site's `/privacy` page.

## Status

The site works end to end locally. Reddit now requires approval for new API apps, and Medallion's request is pending. Until it is approved, development builds replace Reddit login with a clearly labelled fake form, and production builds compile that form out.

## Running locally

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000. Without `REDDIT_CLIENT_ID`, the dev login form stands in for Reddit. Steam login and OpenDota need no keys.

| Script | What it does |
| --- | --- |
| `pnpm test` | Runs the domain tests with `node --test` |
| `pnpm typecheck` | Runs `tsc`. Run `pnpm dev` or `pnpm build` once after adding a route so the route tree types exist. |
| `pnpm seed <reddit-name> <steamId64>` | Links an account through the same OpenDota fetch the Steam callback uses, with no login |
| `pnpm build && pnpm start` | Builds and runs the production server |
| `scripts/verify-steam-forgery.sh <cookie-jar> <db>` | Sends forged Steam callbacks to a running dev server and prints the row count before and after |

## Project layout

| Path | Role |
| --- | --- |
| `src/domain.ts` | Types and pure functions: medal parsing, tier colors, MMR ranges, region picking. No framework imports. |
| `src/server/opendota.ts` | The only code that sees raw `rank_tier` |
| `src/server/db.ts` | The only code that touches the database |
| `src/server/steam.ts`, `src/server/reddit.ts` | The two login protocols |
| `src/routes/auth.*`, `src/routes/api.*` | Server-only handlers. Cross-site POSTs are rejected by the CSRF middleware in `src/start.ts`. |
| `src/components/` | The medal card, medal badge, copy button and info popover |

## Deploying to Fly.io

The app runs as one machine with the SQLite file on a Fly volume. Edit `app`, `primary_region` and `PUBLIC_URL` in `fly.toml`, then:

```bash
fly apps create <app>
fly volumes create medallion_data --size 1 --region <region>
fly secrets set SESSION_SECRET=$(openssl rand -hex 32) \
  REDDIT_CLIENT_ID=... REDDIT_CLIENT_SECRET=...
fly deploy
```

Set the Reddit app's redirect URI to `<PUBLIC_URL>/auth/reddit/callback`.

## OpenDota limits

The free tier allows 60 calls a minute and 3,000 a day per server IP. Each check costs three calls: a refresh request that asks OpenDota to fetch the medal from Valve again, then the player and the match counts. That is about 1,000 checks a day, so refresh is owner-only with a one-hour cooldown. OpenDota processes the refresh in the background, so a check can still show the previous medal, and the next refresh picks up the new one.

## License and credits

Code is [MIT](LICENSE).

- Rank data comes from the [OpenDota API](https://docs.opendota.com).
- MMR estimates come from [Liquipedia](https://liquipedia.net/dota2/Matchmaking/Seasonal_Rankings) (CC BY-SA 3.0). The Immortal start of 5,620 is Medallion's inference from Liquipedia's Divine 5 value, not a Liquipedia number.
- The medal images in `public/medals/` belong to Valve, come from [OpenDota's web repo](https://github.com/odota/web), and are not covered by the MIT license.

Medallion is not affiliated with Valve. Dota 2 is a trademark of Valve Corporation.
