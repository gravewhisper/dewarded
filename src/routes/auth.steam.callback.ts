import { createFileRoute } from '@tanstack/react-router'
import { config } from '#/server/config'
import { getClaimBySteamKey } from '#/server/db'
import { linkAccount } from '#/server/link'
import { linkError, redirectTo } from '#/server/http'
import { consumeOnce, readSession, writeSession } from '#/server/session'
import { verifySteamCallback } from '#/server/steam'
import { steamIdentity } from '#/server/steamKey'

async function signInForClaim(
  query: URLSearchParams,
  steamNonce: string | undefined,
): Promise<Response> {
  const verified = await verifySteamCallback(query, steamNonce)
  if (!verified.ok) return linkError(verified.error)
  const steam = await steamIdentity(verified.steamId64)
  writeSession(steam)
  return redirectTo((await getClaimBySteamKey(steam.steamKey)) ? '/me' : '/link')
}

async function linkToReddit(
  query: URLSearchParams,
  steamNonce: string | undefined,
): Promise<Response> {
  const { redditUsername } = readSession()
  if (!redditUsername) return linkError('reddit_first')
  const verified = await verifySteamCallback(query, steamNonce)
  if (!verified.ok) return linkError(verified.error)
  const steam = await steamIdentity(verified.steamId64)
  const linked = await linkAccount(redditUsername, steam)
  if (!linked.ok) return linkError(linked.error)
  writeSession({ redditUsername, ...steam })
  return redirectTo(`/u/${encodeURIComponent(redditUsername)}`)
}

export const Route = createFileRoute('/auth/steam/callback')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const query = new URL(request.url).searchParams
        const steamNonce = consumeOnce('steamNonce')
        return config.verifyMode === 'backlink'
          ? signInForClaim(query, steamNonce)
          : linkToReddit(query, steamNonce)
      },
    },
  },
})
