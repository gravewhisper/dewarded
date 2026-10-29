import { createServerFn } from '@tanstack/react-start'
import { medalArt, normalizeRedditUsername, publicVerification } from '#/domain'
import { config, devLoginEnabled } from '#/server/config'
import { getVerification } from '#/server/db'
import { nextRefreshAt } from '#/server/link'
import { readSession } from '#/server/session'

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

export const getAccount = createServerFn({ method: 'GET' }).handler(async () => {
  const { redditUsername } = readSession()
  return {
    redditUsername: redditUsername ?? null,
    verification: redditUsername ? await getVerification(redditUsername) : null,
    devLogin: devLoginEnabled,
  }
})
