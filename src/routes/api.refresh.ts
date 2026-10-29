import { createFileRoute } from '@tanstack/react-router'
import { redirectTo } from '#/server/http'
import { refreshAccount } from '#/server/link'
import { readSession } from '#/server/session'

export const Route = createFileRoute('/api/refresh')({
  server: {
    handlers: {
      POST: async () => {
        const { redditUsername } = readSession()
        if (!redditUsername) return redirectTo('/link?error=reddit_first', 303)
        const result = await refreshAccount(redditUsername)
        const page = `/u/${encodeURIComponent(redditUsername)}`
        return redirectTo(result.ok ? page : `${page}?error=${result.error}`, 303)
      },
    },
  },
})
