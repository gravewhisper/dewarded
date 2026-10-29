import { createFileRoute } from '@tanstack/react-router'
import { getClaimBySteamKey } from '#/server/db'
import { redirectTo } from '#/server/http'
import { refreshClaim } from '#/server/link'
import { readSession } from '#/server/session'
import { provenSteam, signedInSteam } from '#/server/steamKey'

export const Route = createFileRoute('/api/claim-refresh')({
  server: {
    handlers: {
      POST: async () => {
        const signedIn = signedInSteam(readSession())
        const steam = signedIn && (await provenSteam(signedIn))
        if (!steam) return redirectTo('/link?error=steam_first', 303)
        const result = await refreshClaim(steam)
        if (result.ok) return redirectTo(`/p/${result.id}`, 303)
        const claim = await getClaimBySteamKey(steam.steamKey)
        return redirectTo(`${claim ? `/p/${claim.id}` : '/me'}?error=${result.error}`, 303)
      },
    },
  },
})
