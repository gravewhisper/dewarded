import { Link, createFileRoute } from '@tanstack/react-router'
import { MedalBadge } from '#/components/MedalBadge'
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
        <p>Log in with Reddit to see and manage your link.</p>
        <p>
          <a className="button primary" href="/link">
            Log in with Reddit
          </a>
        </p>
      </main>
    )
  }
  return (
    <main>
      <p className="label">My link</p>
      <h1>u/{redditUsername}</h1>
      {verification ? (
        <>
          <div className="account">
            <MedalBadge medal={verification.medal} size={96} />
            <dl className="record-dl">
              <div>
                <dt>Rank</dt>
                <dd>{medalLabel(verification.medal)}</dd>
              </div>
              <div>
                <dt>Steam account</dt>
                <dd>
                  <code>{verification.steamId64}</code>{' '}
                  <span className="muted">(only you see this)</span>
                </dd>
              </div>
              <div>
                <dt>Checked</dt>
                <dd>{formatDate(verification.checkedAt)}</dd>
              </div>
            </dl>
          </div>
          <div className="actions">
            <Link className="button primary" to="/u/$redditUsername" params={{ redditUsername }}>
              Public page
            </Link>
            <form method="post" action="/api/unlink">
              <button>Unlink Steam</button>
            </form>
            <form method="post" action="/api/logout">
              <button>Log out</button>
            </form>
          </div>
          <p className="muted">Unlinking removes your public page.</p>
        </>
      ) : (
        <>
          <p>No Steam account linked.</p>
          <div className="actions">
            <a className="button primary" href="/link">
              Link one
            </a>
            <form method="post" action="/api/logout">
              <button>Log out</button>
            </form>
          </div>
        </>
      )}
      <section className="danger-zone">
        <h2>Delete my data</h2>
        <p className="muted">Removes your record and your public page immediately, then logs you out.</p>
        <form method="post" action="/api/delete">
          <button className="danger">Delete all my data and log out</button>
        </form>
      </section>
    </main>
  )
}
