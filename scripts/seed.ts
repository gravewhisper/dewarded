import { normalizeRedditUsername } from '#/domain'
import { getVerification } from '#/server/db'
import { linkAccount } from '#/server/link'

const [name, steamId64] = process.argv.slice(2)
if (!name || !/^\d{17}$/.test(steamId64 ?? '')) {
  console.error('usage: pnpm seed <reddit-username> <steamId64>')
  process.exit(1)
}
const username = normalizeRedditUsername(name)
const result = await linkAccount(username, steamId64)
console.log(JSON.stringify(result.ok ? await getVerification(username) : result, null, 2))
