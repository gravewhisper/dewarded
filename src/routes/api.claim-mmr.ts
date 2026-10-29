import { createFileRoute } from '@tanstack/react-router'
import { parseMmrInput } from '#/domain'
import { setClaimMmr } from '#/server/db'
import { redirectTo } from '#/server/http'
import { readSession } from '#/server/session'

export const Route = createFileRoute('/api/claim-mmr')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { steamId64 } = readSession()
        if (!steamId64) return redirectTo('/link?error=steam_first', 303)
        const form = await request.formData()
        const raw = form.get('action') === 'clear' ? '' : String(form.get('mmr') ?? '')
        const input = parseMmrInput(raw)
        if (!input.ok) return redirectTo('/me?error=mmr_invalid', 303)
        const result = await setClaimMmr(steamId64, input.mmr)
        return redirectTo(result === 'saved' ? '/me' : `/me?error=${result}`, 303)
      },
    },
  },
})
