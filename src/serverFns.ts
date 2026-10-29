import { createServerFn } from '@tanstack/react-start'
import { medalArt, normalizeRedditUsername, parseClaimId, publicClaim, publicVerification } from '#/domain'
import { config, devLoginEnabled } from '#/server/config'
import { getClaim, getClaimBySteamId, getVerification } from '#/server/db'
import { nextRefreshAt } from '#/server/link'
import { readSession } from '#/server/session'

export const getVerifyMode = createServerFn({ method: 'GET' }).handler(() => config.verifyMode)

export const getProfile = createServerFn({ method: 'GET' })
  .validator((name: string) => normalizeRedditUsername(name))
  .handler(async ({ data: redditUsername }) => {
    const verification = await getVerification(redditUsername)
    if (!verification) return null
    return {
      verification: publicVerification(verification),
      isOwner: readSession().redditUsername === redditUsername,
      nextRefreshAt: nextRefreshAt(verification.checkedAt),
      ogImage: `${config.publicUrl}${medalArt(verification.medal).icon}`,
    }
  })

export const getClaimPage = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    const id = parseClaimId(data)
    const claim = id === null ? null : await getClaim(id)
    if (!claim) return null
    return {
      claim: publicClaim(claim),
      isOwner: readSession().steamId64 === claim.steamId64,
      nextRefreshAt: nextRefreshAt(claim.checkedAt),
      ogImage: `${config.publicUrl}${medalArt(claim.medal).icon}`,
    }
  })

export const getAccount = createServerFn({ method: 'GET' }).handler(async () => {
  const session = readSession()
  if (config.verifyMode === 'backlink') {
    const steamId64 = session.steamId64 ?? null
    const claim = steamId64 ? await getClaimBySteamId(steamId64) : null
    return {
      mode: 'backlink' as const,
      steamId64,
      claim,
      pageUrl: claim ? `${config.publicUrl}/p/${claim.id}` : null,
    }
  }
  const { redditUsername } = session
  return {
    mode: 'reddit' as const,
    redditUsername: redditUsername ?? null,
    verification: redditUsername ? await getVerification(redditUsername) : null,
    devLogin: devLoginEnabled,
  }
})
