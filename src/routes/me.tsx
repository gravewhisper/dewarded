import { Link, createFileRoute } from '@tanstack/react-router'
import { MedalBadge } from '#/components/MedalBadge'
import { medalLabel } from '#/domain'
import { formatDay } from '#/format'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/me')({
  loader: () => getAccount(),
  component: MePage,
})

function MePage() {
  const { redditUsername, verification } = Route.useLoaderData()
  if (!redditUsername) {
    return (
      <main className="page">
        <h1>Not logged in</h1>
        <p className="muted">Log in with Reddit to see and manage your link.</p>
        <div className="actions">
          <a className="button primary" href="/link">
            Log in with Reddit
          </a>
        </div>
      </main>
    )
  }
  return (
    <main className="page">
      <h1>u/{redditUsername}</h1>
      {verification ? (
        <>
          <section className="card account">
            <MedalBadge medal={verification.medal} size={96} />
            <dl className="facts">
              <div>
                <dt className="caps">Rank</dt>
                <dd>{medalLabel(verification.medal)}</dd>
              </div>
              <div>
                <dt className="caps">Steam account</dt>
                <dd>
                  <code>{verification.steamId64}</code>{' '}
                  <span className="muted">(only you see this)</span>
                </dd>
              </div>
              <div>
                <dt className="caps">Checked</dt>
                <dd>{formatDay(verification.checkedAt)}</dd>
              </div>
            </dl>
          </section>
          <div className="actions">
            <Link className="button primary" to="/u/$redditUsername" params={{ redditUsername }}>
              Public page
            </Link>
            <form method="post" action="/api/unlink">
              <button className="button secondary">Unlink Steam</button>
            </form>
            <form method="post" action="/api/logout">
              <button className="button secondary">Log out</button>
            </form>
          </div>
          <p className="muted small">Unlinking removes your public page.</p>
        </>
      ) : (
        <>
          <section className="card card-pad">
            <p className="flush">No Steam account linked.</p>
          </section>
          <div className="actions">
            <a className="button primary" href="/link">
              Link one
            </a>
            <form method="post" action="/api/logout">
              <button className="button secondary">Log out</button>
            </form>
          </div>
        </>
      )}
      <section className="danger-zone">
        <h2>Delete my data</h2>
        <p className="muted">Removes your record and your public page immediately, then logs you out.</p>
        <form method="post" action="/api/delete">
          <button className="button danger">Delete all my data and log out</button>
        </form>
      </section>
    </main>
  )
}
