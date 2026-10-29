import { createFileRoute } from '@tanstack/react-router'
import { linkAccount } from '#/server/link'
import { linkError, redirectTo } from '#/server/http'
import { readSession } from '#/server/session'
import { verifySteamCallback } from '#/server/steam'

export const Route = createFileRoute('/auth/steam/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { redditUsername } = readSession()
        if (!redditUsername) return linkError('reddit_first')
        const steam = await verifySteamCallback(new URL(request.url).searchParams)
        if (!steam.ok) return linkError(steam.error)
        const linked = await linkAccount(redditUsername, steam.steamId64)
        if (!linked.ok) return linkError(linked.error)
        return redirectTo(`/u/${encodeURIComponent(redditUsername)}`)
      },
    },
  },
})
