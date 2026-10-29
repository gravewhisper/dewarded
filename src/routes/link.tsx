import { Link, createFileRoute } from '@tanstack/react-router'
import { errorSearch } from '#/format'
import { errorMessage } from '#/messages'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/link')({
  validateSearch: errorSearch,
  loader: () => getAccount(),
  component: LinkPage,
})

function LinkPage() {
  const { redditUsername, verification, devLogin } = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  return (
    <main>
      <h1>Verify your medal</h1>
      {error && <p className="error">{error}</p>}
      <ol className="steps">
        <li>
          {redditUsername ? (
            <>Logged in to Reddit as u/{redditUsername}.</>
          ) : (
            <>
              <a className="button" href="/auth/reddit/start">
                Log in with Reddit
              </a>
              {devLogin && <p className="dev">Dev mode: Reddit login is replaced by a fake form.</p>}
            </>
          )}
        </li>
        <li>
          {redditUsername ? (
            <a className="button" href="/auth/steam/start">
              {verification ? 'Re-link Steam' : 'Sign in through Steam'}
            </a>
          ) : (
            <span className="muted">Sign in through Steam</span>
          )}
        </li>
      </ol>
      {verification && (
        <p>
          Already linked.{' '}
          <Link to="/u/$redditUsername" params={{ redditUsername: verification.redditUsername }}>
            See your page
          </Link>
          .
        </p>
      )}
    </main>
  )
}
