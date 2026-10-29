import { createFileRoute } from '@tanstack/react-router'
import { config } from '#/server/config'
import { linkError, redirectTo } from '#/server/http'
import { readSession } from '#/server/session'
import { steamLoginUrl } from '#/server/steam'

export const Route = createFileRoute('/auth/steam/start')({
  server: {
    handlers: {
      GET: () => {
        if (config.verifyMode === 'reddit' && !readSession().redditUsername) {
          return linkError('reddit_first')
        }
        return redirectTo(steamLoginUrl())
      },
    },
  },
})
