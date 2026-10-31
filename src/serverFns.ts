import { createServerFn } from '@tanstack/react-start'
import { medalArt, normalizeRedditUsername, ownView, parseClaimId, publicClaim, publicVerification } from '#/domain'
import { claimPreview, claimPreviewPath } from '#/server/claimPreview'
import { config, devLoginEnabled } from '#/server/config'
import { getClaim, getClaimBySteamKey, getVerification } from '#/server/db'
import { nextRefreshAt } from '#/server/link'
import { readSession } from '#/server/session'
import { signedInSteam } from '#/server/steamKey'

export const getVerifyMode = createServerFn({ method: 'GET' }).handler(() => config.verifyMode)

export const getProfile = createServerFn({ method: 'GET' })
  .validator((name: unknown) => (typeof name === 'string' ? normalizeRedditUsername(name) : null))
  .handler(async ({ data: redditUsername }) => {
    const verification = redditUsername && (await getVerification(redditUsername))
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
    const shown = publicClaim(claim)
    return {
      claim: shown,
      isOwner: signedInSteam(readSession())?.steamKey === claim.steamKey,
      nextRefreshAt: nextRefreshAt(claim.checkedAt),
      ogImage: `${config.publicUrl}${claimPreviewPath(claim.id, claimPreview(shown))}`,
    }
  })

export const getAccount = createServerFn({ method: 'GET' }).handler(async () => {
  const session = readSession()
  if (config.verifyMode === 'backlink') {
    const steam = signedInSteam(session)
    const claim = steam && (await getClaimBySteamKey(steam.steamKey))
    return {
      mode: 'backlink' as const,
      steamSignedIn: steam !== null,
      claim: claim && ownView(claim),
      pageUrl: claim ? `${config.publicUrl}/p/${claim.id}` : null,
    }
  }
  const { redditUsername } = session
  const verification = redditUsername ? await getVerification(redditUsername) : null
  const steam = verification && signedInSteam(session)
  return {
    mode: 'reddit' as const,
    redditUsername: redditUsername ?? null,
    steamSignedIn: steam !== null && steam.steamKey === verification?.steamKey,
    verification: verification && ownView(verification),
    devLogin: devLoginEnabled,
  }
})

export type Viewer = { signedIn: boolean; pagePath: string | null }

export const getViewer = createServerFn({ method: 'GET' }).handler(async (): Promise<Viewer> => {
  const session = readSession()
  if (config.verifyMode === 'backlink') {
    const steam = signedInSteam(session)
    if (!steam) return { signedIn: false, pagePath: null }
    const claim = await getClaimBySteamKey(steam.steamKey)
    return { signedIn: true, pagePath: claim && `/p/${claim.id}` }
  }
  if (!session.redditUsername) return { signedIn: false, pagePath: null }
  const verification = await getVerification(session.redditUsername)
  return { signedIn: true, pagePath: verification && `/u/${verification.redditUsername}` }
})
