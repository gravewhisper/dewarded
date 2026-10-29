import { createFileRoute } from '@tanstack/react-router'
import { config } from '#/server/config'
import { getClaimBySteamId } from '#/server/db'
import { linkAccount } from '#/server/link'
import { linkError, redirectTo } from '#/server/http'
import { readSession, writeSession } from '#/server/session'
import { verifySteamCallback } from '#/server/steam'

async function signInForClaim(query: URLSearchParams): Promise<Response> {
  const steam = await verifySteamCallback(query)
  if (!steam.ok) return linkError(steam.error)
  writeSession({ steamId64: steam.steamId64 })
  return redirectTo((await getClaimBySteamId(steam.steamId64)) ? '/me' : '/link')
}

async function linkToReddit(query: URLSearchParams): Promise<Response> {
  const { redditUsername } = readSession()
  if (!redditUsername) return linkError('reddit_first')
  const steam = await verifySteamCallback(query)
  if (!steam.ok) return linkError(steam.error)
  const linked = await linkAccount(redditUsername, steam.steamId64)
  if (!linked.ok) return linkError(linked.error)
  return redirectTo(`/u/${encodeURIComponent(redditUsername)}`)
}

export const Route = createFileRoute('/auth/steam/callback')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const query = new URL(request.url).searchParams
        return config.verifyMode === 'backlink' ? signInForClaim(query) : linkToReddit(query)
      },
    },
  },
})
