import { createFileRoute } from '@tanstack/react-router'
import { deletePersonData } from '#/server/db'
import { redirectTo } from '#/server/http'
import { clearSession, readSession } from '#/server/session'

export const Route = createFileRoute('/api/delete')({
  server: {
    handlers: {
      POST: async () => {
        const { redditUsername } = readSession()
        if (redditUsername) await deletePersonData({ redditUsername })
        clearSession()
        return redirectTo('/?deleted=1', 303)
      },
    },
  },
})
