import { createFileRoute } from '@tanstack/react-router'
import { redirectTo } from '#/server/http'
import { refreshAccount } from '#/server/link'
import { readSession } from '#/server/session'
import { provenSteam, signedInSteam } from '#/server/steamKey'

export const Route = createFileRoute('/api/refresh')({
  server: {
    handlers: {
      POST: async () => {
        const session = readSession()
        const { redditUsername } = session
        if (!redditUsername) return redirectTo('/link?error=reddit_first', 303)
        const signedIn = signedInSteam(session)
        const result = await refreshAccount(redditUsername, signedIn && (await provenSteam(signedIn)))
        const page = `/u/${encodeURIComponent(redditUsername)}`
        if (result.ok) return redirectTo(page, 303)
        return redirectTo(`${result.error === 'steam_again' ? '/link' : page}?error=${result.error}`, 303)
      },
    },
  },
})
