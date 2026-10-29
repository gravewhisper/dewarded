import { createFileRoute } from '@tanstack/react-router'
import { REDDIT_USERNAME_PATTERN, parseRedditUsername } from '#/domain'
import { devLoginEnabled } from '#/server/config'
import { redirectTo } from '#/server/http'
import { writeSession } from '#/server/session'

const notFound = () => new Response('Not found', { status: 404 })

const FORM = `<!doctype html>
<meta charset="utf-8">
<title>Dev-only fake Reddit login</title>
<link rel="icon" type="image/png" href="/medals/rank_icon_8.png">
<main style="font-family:system-ui;max-width:32rem;margin:4rem auto">
  <h1>DEV ONLY: fake Reddit login</h1>
  <p>REDDIT_CLIENT_ID is unset, so this form stands in for Reddit OAuth.
  It is disabled in production builds and whenever Reddit credentials exist.</p>
  <form method="post">
    <label>Reddit username <input name="username" required pattern="${REDDIT_USERNAME_PATTERN}"></label>
    <button>Log in as this user</button>
  </form>
</main>`

export const Route = createFileRoute('/auth/dev-login')({
  server: {
    handlers: {
      GET: () => {
        if (!devLoginEnabled) return notFound()
        return new Response(FORM, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      },
      POST: async ({ request }) => {
        if (!devLoginEnabled) return notFound()
        const username = parseRedditUsername(String((await request.formData()).get('username') ?? ''))
        if (!username) return new Response('Bad username', { status: 400 })
        writeSession({ redditUsername: username })
        return redirectTo('/link', 303)
      },
    },
  },
})
