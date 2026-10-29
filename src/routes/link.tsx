import { Link, createFileRoute } from '@tanstack/react-router'
import { errorSearch } from '#/format'
import { errorMessage } from '#/messages'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/link')({
  validateSearch: errorSearch,
  loader: () => getAccount(),
  component: LinkPage,
})

type StepState = 'done' | 'current' | 'locked'
type StepId = 'reddit' | 'steam' | 'share'

const STEP_TITLES: Record<StepId, string> = {
  reddit: 'Log in with Reddit',
  steam: 'Sign in through Steam',
  share: 'Share your link',
}

const STATUS_LABELS: Record<StepState, string> = {
  done: 'Done',
  current: 'Next',
  locked: 'Locked',
}

function stepStates(loggedIn: boolean, linked: boolean): Record<StepId, StepState> {
  if (!loggedIn) return { reddit: 'current', steam: 'locked', share: 'locked' }
  if (!linked) return { reddit: 'done', steam: 'current', share: 'locked' }
  return { reddit: 'done', steam: 'done', share: 'current' }
}

function LinkPage() {
  const { redditUsername, verification, devLogin } = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  const states = stepStates(redditUsername !== null, verification !== null)

  const bodies: Record<StepId, React.ReactNode> = {
    reddit: redditUsername ? (
      <p>Logged in as u/{redditUsername}.</p>
    ) : (
      <>
        <p>Medallion reads only your Reddit username.</p>
        <a className="button primary" href="/auth/reddit/start">
          Log in with Reddit
        </a>
        {devLogin && <p className="dev">Dev mode: Reddit login is replaced by a fake form.</p>}
      </>
    ),
    steam: !redditUsername ? (
      <p>Available after the Reddit login.</p>
    ) : verification ? (
      <>
        <p>Steam account linked.</p>
        <a className="button" href="/auth/steam/start">
          Re-link Steam
        </a>
      </>
    ) : (
      <>
        <p>Steam confirms which account is yours. Medallion never sees your password.</p>
        <a className="button primary" href="/auth/steam/start">
          Sign in through Steam
        </a>
      </>
    ),
    share: verification ? (
      <>
        <p>
          Your page is live at <code>/u/{verification.redditUsername}</code>.
        </p>
        <Link
          className="button primary"
          to="/u/$redditUsername"
          params={{ redditUsername: verification.redditUsername }}
        >
          See your page
        </Link>
      </>
    ) : (
      <p>Your public page appears here once Steam is linked.</p>
    ),
  }

  return (
    <main>
      <h1>Verify your medal</h1>
      {error && <p className="error">{error}</p>}
      <p className="consent">
        Linking makes your Reddit username and your medal public on your Medallion page. Your Steam
        account is never shown. You can delete it any time. <Link to="/privacy">What we store</Link>.
      </p>
      <ol className="steps">
        {(Object.keys(STEP_TITLES) as StepId[]).map((id, i) => (
          <li key={id} data-state={states[id]}>
            <span className="step-n">{i + 1}.</span>
            <div>
              <h2>
                {STEP_TITLES[id]}
                <span className="label">{STATUS_LABELS[states[id]]}</span>
              </h2>
              {bodies[id]}
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}
