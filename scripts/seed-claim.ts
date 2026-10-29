import { parseRedditUsername, parseSteamId64 } from '#/domain'
import { getClaimBySteamKey } from '#/server/db'
import { claimAccount } from '#/server/link'
import { steamIdentity } from '#/server/steamKey'

const [name, rawSteamId64] = process.argv.slice(2)
const username = parseRedditUsername(name ?? '')
const steamId64 = parseSteamId64(rawSteamId64 ?? '')
if (!username || !steamId64) {
  console.error('usage: pnpm seed-claim <reddit-username> <steamId64>')
  process.exit(1)
}
const steam = await steamIdentity(steamId64)
const result = await claimAccount(steam, username)
console.log(JSON.stringify(result.ok ? await getClaimBySteamKey(steam.steamKey) : result, null, 2))
