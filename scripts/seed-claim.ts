import { parseRedditUsername } from '#/domain'
import { getClaimBySteamId } from '#/server/db'
import { claimAccount } from '#/server/link'

const [name, steamId64] = process.argv.slice(2)
const username = parseRedditUsername(name ?? '')
if (!username || !/^\d{17}$/.test(steamId64 ?? '')) {
  console.error('usage: pnpm seed-claim <reddit-username> <steamId64>')
  process.exit(1)
}
const result = await claimAccount(steamId64!, username)
console.log(JSON.stringify(result.ok ? await getClaimBySteamId(steamId64!) : result, null, 2))
