import { createFileRoute } from '@tanstack/react-router'
import { config, devLoginEnabled } from '#/server/config'
import { linkError, redirectTo } from '#/server/http'
import { newState, redditAuthorizeUrl } from '#/server/reddit'
import { readSession, writeSession } from '#/server/session'

export const Route = createFileRoute('/auth/reddit/start')({
  server: {
    handlers: {
      GET: () => {
        if (!config.reddit) {
          return devLoginEnabled ? redirectTo('/auth/dev-login') : linkError('reddit_unconfigured')
        }
        const state = newState()
        writeSession({ ...readSession(), redditState: state })
        return redirectTo(redditAuthorizeUrl(config.reddit, state))
      },
    },
  },
})
