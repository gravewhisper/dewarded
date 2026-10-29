import { createFileRoute } from '@tanstack/react-router'
import { getClaimBySteamId } from '#/server/db'
import { redirectTo } from '#/server/http'
import { refreshClaim } from '#/server/link'
import { readSession } from '#/server/session'

export const Route = createFileRoute('/api/claim-refresh')({
  server: {
    handlers: {
      POST: async () => {
        const { steamId64 } = readSession()
        if (!steamId64) return redirectTo('/link?error=steam_first', 303)
        const result = await refreshClaim(steamId64)
        if (result.ok) return redirectTo(`/p/${result.id}`, 303)
        const claim = await getClaimBySteamId(steamId64)
        return redirectTo(`${claim ? `/p/${claim.id}` : '/me'}?error=${result.error}`, 303)
      },
    },
  },
})
