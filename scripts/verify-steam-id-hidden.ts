import { createHmac } from 'node:crypto'
import { parseSteamId64, steamId64ToAccountId } from '#/domain'
import { steamIdentity } from '#/server/steamKey'

const base = (process.env.BASE ?? 'http://localhost:3000').replace(/\/$/, '')
const secret = process.env.SESSION_SECRET
const steamId64 = parseSteamId64(process.env.STEAM_ID64 ?? '')
if (!secret || !steamId64) {
  console.error(
    'usage: BASE=<origin> SESSION_SECRET=<secret> STEAM_ID_PEPPER=<pepper> STEAM_ID64=<steamId64> pnpm verify-steam-id-hidden',
  )
  process.exit(1)
}

const { steamKey } = await steamIdentity(steamId64)
const body = Buffer.from(
  JSON.stringify({ steamId64, steamKey, exp: Date.now() + 60 * 60 * 1000 }),
).toString('base64url')
const cookie = `dewarded_session=${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`

const secrets = { steamId64, accountId: String(steamId64ToAccountId(steamId64)), steamKey }

async function page(path: string): Promise<string> {
  const response = await fetch(`${base}${path}`, { headers: { cookie }, redirect: 'manual' })
  if (response.status !== 200) throw new Error(`${path} answered ${response.status}`)
  return response.text()
}

const me = await page('/me')
const ownPath = me.match(/href="(\/p\/[a-z2-7]{10})"/)?.[1]
const proofs: [string, boolean][] = [
  ['/me shows the owner as signed in through Steam', me.includes('Signed in through Steam')],
  ['/me links the owner to their page', ownPath !== undefined],
]
const pages: Record<string, string> = { '/me': me }
for (const path of ['/', '/link', '/faq', '/privacy', ...(ownPath ? [ownPath] : [])]) {
  pages[path] = await page(path)
}
if (ownPath) proofs.push([`${ownPath} shows the owner's refresh button`, pages[ownPath].includes('Refresh medal')])

let failed = false
for (const [claim, ok] of proofs) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${claim}`)
  failed ||= !ok
}
for (const [path, html] of Object.entries(pages)) {
  const hits = Object.fromEntries(Object.entries(secrets).map(([name, value]) => [name, html.split(value).length - 1]))
  const leaked = Object.values(hits).some((count) => count > 0)
  console.log(`${leaked ? 'FAIL' : 'ok  '} ${path.padEnd(14)} ${html.length} bytes, hits ${JSON.stringify(hits)}`)
  failed ||= leaked
}
process.exit(failed ? 1 : 0)
