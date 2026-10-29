import { createFileRoute } from '@tanstack/react-router'
import { normalizeRedditUsername } from '#/domain'
import { config } from '#/server/config'
import { linkError, redirectTo } from '#/server/http'
import { exchangeCodeForUsername } from '#/server/reddit'
import { readSession, writeSession } from '#/server/session'

export const Route = createFileRoute('/auth/reddit/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!config.reddit) return linkError('reddit_unconfigured')
        const params = new URL(request.url).searchParams
        const { redditState, ...session } = readSession()
        // The state is single-use whatever the outcome.
        writeSession(session)
        if (!redditState || params.get('state') !== redditState) return linkError('reddit_state')
        const code = params.get('code')
        if (params.get('error') || !code) return linkError('reddit_denied')
        const name = await exchangeCodeForUsername(config.reddit, code)
        if (!name) return linkError('reddit_failed')
        writeSession({ redditUsername: normalizeRedditUsername(name) })
        return redirectTo('/link')
      },
    },
  },
})
