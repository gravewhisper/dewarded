import { createFileRoute } from '@tanstack/react-router'
import { deleteIfConfirmed } from '#/server/deletion'
import { redirectTo } from '#/server/http'
import { clearSession, readSession } from '#/server/session'
import { provenSteam, signedInSteam } from '#/server/steamKey'

export const Route = createFileRoute('/api/claim-delete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signedIn = signedInSteam(readSession())
        const steam = signedIn && (await provenSteam(signedIn))
        const form = await request.formData().catch(() => new FormData())
        const outcome = await deleteIfConfirmed(form, steam && { steamKey: steam.steamKey })
        if (outcome === 'delete_unconfirmed') return redirectTo('/me?error=delete_unconfirmed', 303)
        clearSession()
        return redirectTo('/?deleted=1', 303)
      },
    },
  },
})
