import { Link, createFileRoute } from '@tanstack/react-router'
import { medalLabel } from '#/domain'
import { formatDate } from '#/format'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/me')({
  loader: () => getAccount(),
  component: MePage,
})

function MePage() {
  const { redditUsername, verification } = Route.useLoaderData()
  if (!redditUsername) {
    return (
      <main>
        <h1>Not logged in</h1>
        <p>
          <a href="/link">Log in with Reddit</a> to manage your link.
        </p>
      </main>
    )
  }
  return (
    <main>
      <h1>u/{redditUsername}</h1>
      {verification ? (
        <>
          <p>
            Linked to Steam account {verification.steamId64} showing{' '}
            <strong>{medalLabel(verification.medal)}</strong>, checked {formatDate(verification.checkedAt)}.{' '}
            <Link to="/u/$redditUsername" params={{ redditUsername }}>
              Public page
            </Link>
          </p>
          <form method="post" action="/api/unlink">
            <button>Unlink Steam and remove my public page</button>
          </form>
        </>
      ) : (
        <p>
          No Steam account linked. <a href="/link">Link one</a>.
        </p>
      )}
      <form method="post" action="/api/delete">
        <button className="danger">Delete all my data and log out</button>
      </form>
      <form method="post" action="/api/logout">
        <button>Log out</button>
      </form>
    </main>
  )
}
