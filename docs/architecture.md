# How Dewarded works

This page explains the main design choices in Dewarded and what each one does not protect. To run the code, see [Develop Dewarded locally](development.md). To operate the live site, see [Deploy and run Dewarded on Fly.io](deployment.md).

## Backlink mode needs nothing from Reddit

`VERIFY_MODE` picks how a page ties a medal to a Reddit name. Backlink mode is the default, and `reddit` is the only other value.

In backlink mode, the player signs in with Steam, types a Reddit name, and gets a page at `/p/<id>`. The id is 10 random characters, so it says nothing about the Steam account. Dewarded never contacts Reddit. The name stays a claim, and the page labels it as claimed, until a reader opens the player's Reddit profile and finds a link back to the page. Only the owner of a Reddit account can edit its profile, so that backlink is the proof.

Reddit mode replaces the claim with a login. The player logs in with Reddit first, with the `identity` scope and a temporary token that Dewarded uses once to read the username. Steam login comes second, and the page lives at `/u/<reddit-name>`. Reddit mode needs Reddit API access, which Reddit has to grant.

Backlink mode asks a doubting reader for one extra click, to the Reddit profile. In return, it runs without Reddit's permission and never touches the player's Reddit account. That trade is why it is the default. Pages under `/p/` and `/u/` both keep working in either mode, because the page routes do not check the mode.

## The database keeps a keyed hash in place of each Steam ID

Once Dewarded has fetched the medal, it needs the Steam ID for one thing only, to recognise the same Steam account when it signs in again. A keyed hash does that job. `src/server/steamKey.ts` turns each Steam ID into a 32-byte scrypt hash with N=2^15, r=8, and p=1, using `STEAM_ID_PEPPER` as the salt. The `claims` and `verifications` tables store that hash in a `steam_key` column and have no column for the Steam ID.

These details shape the design.

- **One hash at a time.** At these settings, scrypt needs 32 MiB per hash (128 × N × r bytes), and the machine has 256 MB. The server queues hashes one behind another, so a burst of sign-ins waits instead of running out of memory.
- **A ten-minute cache.** The server keeps up to 1,000 recent hashes in memory for ten minutes, keyed by Steam ID. A refresh or a rename soon after sign-in costs no new hash. The cache is also the reason a Steam ID can stay in server memory for up to ten minutes.
- **Writes hash again.** A read trusts the hash in the signed session cookie. A write that is keyed by Steam account works its hash out again from the Steam ID in the cookie, through `provenSteam`. That covers claiming, refreshing, setting the MMR, and deleting.
- **A pepper check.** The database stores a check value made from the pepper it first opened with. A different pepper would make every lookup miss, so the server refuses to start with one.
- **Zeroed deletes.** Every write transaction turns on `secure_delete`, so SQLite overwrites the bytes of a deleted row in the file.

A database from before the hash release still has a `steam_id64` column. On startup, Dewarded rebuilds those tables with hashes in one write transaction, then runs `VACUUM` and a WAL checkpoint for a local file, so the file keeps no copy of the old IDs.

### What the hash does not protect

The hash protects a copy of the database that leaks without the pepper. It does less against anything else.

- **Guessing with the pepper.** A Steam ID is a fixed base plus a 32-bit account ID, so there are fewer than 2^32 candidates. Anyone who holds both the database and the pepper can hash candidates until one matches. scrypt makes each guess cost a full run with 32 MiB of memory, which raises the price of a search but does not stop it.
- **The pepper's location.** The pepper lives in Fly's secrets and in the operator's password manager, not in the database or its backups. Anyone with a shell on the machine has the pepper and the database together.
- **The session cookie.** The cookie carries the Steam ID, signed but not encrypted. It is `HttpOnly` and stays in the player's own browser.
- **Server memory.** A Steam ID stays in memory for up to ten minutes after its hash is worked out. The hash, with the medal and region of its last check, stays for up to an hour, even after the page is deleted.
- **OpenDota.** Each check that calls OpenDota sends it the Dota account ID, because that is how OpenDota looks up a player.
- **Cloudflare.** Cloudflare hosts the DNS, but the apex is not behind its proxy, so TLS ends at Fly and Cloudflare never sees the Steam callback or the session cookie. Only `www.dewarded.com` is proxied, and it only redirects to the apex, so it never carries a session or a sign-in. Turning the proxy on for the apex would let Cloudflare decrypt every request, Steam ID included.
- **Snapshots and copies.** Fly keeps daily snapshots of the volume for 14 days. A row deleted on the site stays in older snapshots and backups until they expire or are deleted.

## Sessions are signed cookies, and every sign-in carries a one-time nonce

The session is one cookie, `dewarded_session`. It holds base64url JSON and an HMAC-SHA256 signature made with `SESSION_SECRET`, and it expires after 7 days. It is `HttpOnly`, `Secure` in production, and `SameSite=Lax`. Strict would drop the cookie on the redirect back from Steam and Reddit, so Lax is the strictest setting that works. There is no session store on the server, so logging out deletes the cookie, and only a new `SESSION_SECRET` ends every session at once.

Two layers stop cross-site writes. `src/start.ts` runs TanStack Start's CSRF middleware on every request that is not `GET`, `HEAD`, or `OPTIONS`, and the middleware rejects a request whose `Origin` is neither the site's own origin nor `PUBLIC_URL`. `SameSite=Lax` also keeps the cookie off cross-site `POST` requests.

Steam login has its own guard against login CSRF, where an attacker signs a victim in to the attacker's Steam account.

1. `/auth/steam/start` stores 18 random bytes in the session as a nonce and puts the nonce in the `return_to` URL that Steam sends the browser back to.
2. The callback takes the nonce out of the session, so the nonce works once, and accepts Steam's answer only if `return_to` matches it exactly. A login started in another browser, or never started, fails here.
3. The callback checks that Steam signed `claimed_id`, `identity`, `return_to`, `response_nonce`, and `op_endpoint`.
4. The callback sends the answer back to Steam's own server with `check_authentication` and trusts the Steam ID only if Steam confirms it.

Reddit login follows the same pattern with a 24-byte OAuth `state`. `scripts/verify-steam-forgery.sh` sends seven forged Steam callbacks and shows that none signs a browser in.

## OpenDota guards keep Dewarded inside the free tier

OpenDota's free tier allows 60 calls a minute and 3,000 calls a day for each IP address without an API key. A full medal check costs three calls. The first asks OpenDota to fetch the medal from Valve again, and the player record and the ranked match counts follow in parallel. At three calls a check, a burst of sign-ups could spend the daily quota in an hour, so `src/server/opendota.ts` decides in one place whether a check may call OpenDota and how many calls it makes.

- **A recent check is reused.** If any page checked the same Steam account in the last hour (`MEDAL_REUSE_MS`), a new link or claim copies that medal, region, and check time and makes no calls. The server also keeps each check in memory for that hour, keyed by the Steam ID hash, because deleting a page deletes its rows. Without that copy, a player could delete and remake a page in a loop, spend three calls each time, and use up the budget for everyone. The memory holds at most 5,000 checks and is never written to the database.
- **The region is fetched at most once a day.** The match counts behind the region change slowly, so Dewarded keeps the stored region for 24 hours (`REGION_REUSE_MS`). Most refreshes cost two calls.
- **The whole site shares one budget.** Each check reserves its calls in the `opendota_calls` table before it makes them. If the reservation would pass 50 calls in the last minute or 2,800 in the last 24 hours (`OPENDOTA_LIMITS`), the check makes no calls and shows "Medal checks are busy right now". The limits sit below OpenDota's, as a margin for differences in how OpenDota counts.
- **A 429 pauses every check for a minute.** When OpenDota answers 429, Dewarded stores a pause time in the `opendota_pause` table (`RATE_LIMIT_PAUSE_MS`). Until then, every check reports the rate limit without calling OpenDota.

The page owner can refresh at most once an hour (`REFRESH_COOLDOWN_MS` in `src/server/link.ts`). The pause check and the reservation run in one write transaction, queued behind every other write on the server, so concurrent requests cannot overspend the budget.

OpenDota processes the refresh request in the background. A check can still show the previous medal, and the next refresh picks up the new one.

## Responses carry security headers, and logs leave out query strings

`src/server/securityHeaders.ts` sets these headers. `server.mjs` adds them to every response, static files included.

- `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`, in production only

The policy blocks framing, `<base>` tags, and plugins. It does not limit where scripts load from. Pages, server functions, and API routes also send `Cache-Control: no-store`, so no shared cache keeps a signed-in page. Static files are the opposite. `server.mjs` marks files under `/assets/`, whose names change with each build, as public for a year and immutable, and other static files as public for 7 days, so browsers can cache them.

`server.mjs` logs each request's method, path, status, and time, and never its query string. The query string is where the secrets travel. A Steam callback carries the Steam ID in `openid.claimed_id`, and a Reddit callback carries an OAuth code. The path does appear, so the log shows which public page, `/p/<id>` or `/u/<reddit-name>`, a request asked for. Server errors go to the log as well, and Fly keeps the log for a limited time.
