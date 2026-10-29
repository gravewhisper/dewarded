import { normalizeRedditUsername, parseSteamId64 } from '#/domain'
import { getVerification } from '#/server/db'
import { linkAccount } from '#/server/link'
import { steamIdentity } from '#/server/steamKey'

const [name, rawSteamId64] = process.argv.slice(2)
const steamId64 = parseSteamId64(rawSteamId64 ?? '')
if (!name || !steamId64) {
  console.error('usage: pnpm seed <reddit-username> <steamId64>')
  process.exit(1)
}
const username = normalizeRedditUsername(name)
const result = await linkAccount(username, await steamIdentity(steamId64))
console.log(JSON.stringify(result.ok ? await getVerification(username) : result, null, 2))
