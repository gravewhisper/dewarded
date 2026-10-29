<p align="center">
  <img src="public/medals/rank_icon_8b.png" alt="" width="96" height="96">
</p>

<h1 align="center">Dewarded</h1>

<p align="center">
  <strong>Prove your Dota 2 medal on Reddit.</strong><br>
  Sign in with Steam, get a page that shows your verified rank, and link it from your Reddit profile.
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
  <img src="docs/cards.png" alt="Three Dewarded cards: Legend 3 on purple, Immortal #16 on red with a self-reported MMR of 9,200, and Crusader 2 on teal" width="860">
</p>

## Why a screenshot is not enough

Dota subreddits have a lot of confident gameplay advice, and some of it works only in the adviser's own bracket. Dewarded lets a player show their real medal with one link, instead of a screenshot anyone can fake.

## Get a page in four steps

1. Sign in with Steam at [dewarded.com](https://dewarded.com). Steam confirms which account you own.
2. Dewarded reads your medal, Immortal leaderboard rank, and main region from OpenDota.
3. Type your Reddit username. You get a page at `/p/<id>` with a card for your medal.
4. Link the page from your Reddit profile. Only the owner of a Reddit account can edit its profile, so a reader who doubts the name checks for that link.

That is backlink mode, the default. An optional reddit mode replaces the typed name with a Reddit login.

## What the card shows

| Field | Source | Status |
| --- | --- | --- |
| Medal and stars | OpenDota `rank_tier` | Verified |
| Immortal leaderboard rank | OpenDota `leaderboard_rank` | Verified |
| Reddit name | Typed by the player, backed by the link on their Reddit profile. Reddit mode takes it from a Reddit login instead. | Claimed, or verified in reddit mode |
| Region | The server region with the most ranked games | Inferred |
| Est. MMR | The usual range for the medal, from Liquipedia | Estimate |
| MMR | Typed by the player. Immortal only, from 5,620 to 20,000. Valve does not publish MMR numbers. | Self-reported |

## Dewarded keeps a hash, not your Steam ID

- The database stores a keyed hash of your Steam ID, never the ID itself.
- No page shows your Steam ID, not even your own `/me` page.
- In backlink mode, Dewarded never connects to your Reddit account.
- You can delete your record and your page at any time from `/me`.

The [privacy page](https://dewarded.com/privacy) has the full list, and the [FAQ](https://dewarded.com/faq) answers common questions.

## Docs

- [Develop Dewarded locally](docs/development.md) covers the dev server, environment variables, scripts, and code layout.
- [Deploy and run Dewarded on Fly.io](docs/deployment.md) covers the first deploy, the pepper, DNS, mail, and backups.
- [How Dewarded works](docs/architecture.md) explains the two modes, the Steam ID hash and its limits, sessions, the OpenDota guards, and the security headers.

## License and credits

The code is under the [MIT license](LICENSE). The data and images come from these sources.

- Rank data comes from the [OpenDota API](https://docs.opendota.com).
- MMR estimates come from [Liquipedia](https://liquipedia.net/dota2/Matchmaking/Seasonal_Rankings), under CC BY-SA 3.0. The Immortal floor of 5,620 is not a Liquipedia number. Dewarded infers it from Liquipedia's Divine 5 value.
- The medal images in `public/medals/` belong to Valve and come from [OpenDota's web repo](https://github.com/odota/web). The MIT license does not cover them.
- The Barlow and Barlow Condensed fonts in `public/fonts/` are by the Barlow Project Authors and come from [Google Fonts](https://fonts.google.com/specimen/Barlow). They are under the SIL Open Font License 1.1, in [`public/fonts/OFL.txt`](public/fonts/OFL.txt).

Dewarded is not affiliated with Valve. Dota 2 is a trademark of Valve Corporation.
