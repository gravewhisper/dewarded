import { createFileRoute } from '@tanstack/react-router'
import { parseRedditUsername } from '#/domain'
import { redirectTo } from '#/server/http'
import { claimAccount } from '#/server/link'
import { readSession } from '#/server/session'
import { provenSteam, signedInSteam } from '#/server/steamKey'

const RETURN_PAGES = new Set(['/link', '/me'])

export const Route = createFileRoute('/api/claim')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signedIn = signedInSteam(readSession())
        const steam = signedIn && (await provenSteam(signedIn))
        if (!steam) return redirectTo('/link?error=steam_first', 303)
        const form = await request.formData()
        const back = String(form.get('back') ?? '')
        const page = RETURN_PAGES.has(back) ? back : '/me'
        const name = parseRedditUsername(String(form.get('username') ?? ''))
        if (!name) return redirectTo(`${page}?error=claim_name_invalid`, 303)
        const result = await claimAccount(steam, name)
        return redirectTo(result.ok ? '/me' : `${page}?error=${result.error}`, 303)
      },
    },
  },
})
