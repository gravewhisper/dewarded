import { createFileRoute } from '@tanstack/react-router'
import { parseMmrInput } from '#/domain'
import { setSelfReportedMmr } from '#/server/db'
import { redirectTo } from '#/server/http'
import { readSession } from '#/server/session'

export const Route = createFileRoute('/api/mmr')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { redditUsername } = readSession()
        if (!redditUsername) return redirectTo('/link?error=reddit_first', 303)
        const form = await request.formData()
        const raw = form.get('action') === 'clear' ? '' : String(form.get('mmr') ?? '')
        const input = parseMmrInput(raw)
        if (!input.ok) return redirectTo('/me?error=mmr_invalid', 303)
        const result = await setSelfReportedMmr(redditUsername, input.mmr)
        return redirectTo(result === 'saved' ? '/me' : `/me?error=${result}`, 303)
      },
    },
  },
})
