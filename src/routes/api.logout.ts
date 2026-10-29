import { createFileRoute } from '@tanstack/react-router'
import { redirectTo } from '#/server/http'
import { clearSession } from '#/server/session'

export const Route = createFileRoute('/api/logout')({
  server: {
    handlers: {
      POST: () => {
        clearSession()
        return redirectTo('/', 303)
      },
    },
  },
})
