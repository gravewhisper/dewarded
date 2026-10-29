import { createFileRoute } from '@tanstack/react-router'
import { config } from '#/server/config'
import { linkError, redirectTo } from '#/server/http'
import { readSession, writeSession } from '#/server/session'
import { newSteamNonce, steamLoginUrl } from '#/server/steam'

export const Route = createFileRoute('/auth/steam/start')({
  server: {
    handlers: {
      GET: () => {
        const session = readSession()
        if (config.verifyMode === 'reddit' && !session.redditUsername) {
          return linkError('reddit_first')
        }
        const steamNonce = newSteamNonce()
        writeSession({ ...session, steamNonce })
        return redirectTo(steamLoginUrl(steamNonce))
      },
    },
  },
})
