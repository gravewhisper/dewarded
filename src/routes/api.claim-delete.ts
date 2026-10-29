import { createFileRoute } from '@tanstack/react-router'
import { deletePersonData } from '#/server/db'
import { redirectTo } from '#/server/http'
import { clearSession, readSession } from '#/server/session'

export const Route = createFileRoute('/api/claim-delete')({
  server: {
    handlers: {
      POST: async () => {
        const { steamId64 } = readSession()
        if (steamId64) await deletePersonData({ steamId64 })
        clearSession()
        return redirectTo('/?deleted=1', 303)
      },
    },
  },
})
