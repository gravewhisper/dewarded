import { createFileRoute } from '@tanstack/react-router'
import { deleteVerification } from '#/server/db'
import { redirectTo } from '#/server/http'
import { readSession, writeSession } from '#/server/session'

export const Route = createFileRoute('/api/unlink')({
  server: {
    handlers: {
      POST: async () => {
        const { redditUsername } = readSession()
        if (redditUsername) {
          await deleteVerification(redditUsername)
          writeSession({ redditUsername })
        }
        return redirectTo('/me', 303)
      },
    },
  },
})
