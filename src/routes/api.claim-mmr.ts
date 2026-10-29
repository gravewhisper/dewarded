import { createFileRoute } from '@tanstack/react-router'
import { parseMmrInput } from '#/domain'
import { setClaimMmr } from '#/server/db'
import { redirectTo } from '#/server/http'
import { readSession } from '#/server/session'
import { provenSteam } from '#/server/steamKey'

export const Route = createFileRoute('/api/claim-mmr')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const steam = await provenSteam(readSession())
        if (!steam) return redirectTo('/link?error=steam_first', 303)
        const form = await request.formData()
        const raw = form.get('action') === 'clear' ? '' : String(form.get('mmr') ?? '')
        const input = parseMmrInput(raw)
        if (!input.ok) return redirectTo('/me?error=mmr_invalid', 303)
        const result = await setClaimMmr(steam.steamKey, input.mmr)
        return redirectTo(result === 'saved' ? '/me' : `/me?error=${result}`, 303)
      },
    },
  },
})
