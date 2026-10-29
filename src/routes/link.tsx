import { Link, createFileRoute } from '@tanstack/react-router'
import { ClaimNameForm } from '#/components/ClaimNameForm'
import type { Claim, Verification } from '#/domain'
import { errorSearch } from '#/format'
import { errorMessage } from '#/messages'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/link')({
  validateSearch: errorSearch,
  loader: () => getAccount(),
  component: LinkPage,
})

type StepState = 'done' | 'current' | 'locked'
type Step = { title: string; body: React.ReactNode }

const STATUS_LABELS: Record<StepState, string> = {
  done: 'Done',
  current: 'Next',
  locked: 'Locked',
}

function stepStates(first: boolean, second: boolean): StepState[] {
  if (!first) return ['current', 'locked', 'locked']
  if (!second) return ['done', 'current', 'locked']
  return ['done', 'done', 'current']
}

function LinkPage() {
  const account = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  return account.mode === 'backlink' ? (
    <BacklinkSteps signedIn={account.steamId64 !== null} claim={account.claim} error={error} />
  ) : (
    <RedditSteps
      redditUsername={account.redditUsername}
      verification={account.verification}
      devLogin={account.devLogin}
      error={error}
    />
  )
}

function StepsPage({
  steps,
  states,
  error,
  notice,
}: {
  steps: Step[]
  states: StepState[]
  error: string | null
  notice: React.ReactNode
}) {
  return (
    <main className="page">
      <h1>Verify your medal</h1>
      {error && <p className="error">{error}</p>}
      <p className="notice">{notice}</p>
      <ol className="card steps">
        {steps.map((step, i) => (
          <li key={step.title} data-state={states[i]}>
            <span className="step-n">{i + 1}</span>
            <div>
              <h2>
                {step.title}
                <span className="caps step-status">{STATUS_LABELS[states[i]]}</span>
              </h2>
              {step.body}
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}

function SteamSignIn() {
  return (
    <>
      <p>
        You'll sign in on Steam's own site. Check that the address bar says{' '}
        <strong>https://steamcommunity.com</strong> before typing anything. Steam only tells
        Dewarded your account ID. Dewarded never sees your password, can't trade, and never
        asks for an API key or trade link.{' '}
        <a href="https://github.com/gravewhisper/dewarded/blob/master/src/server/steam.ts">
          Read the login code
        </a>
        .
      </p>
      <a className="button primary" href="/auth/steam/start">
        Sign in through Steam
      </a>
    </>
  )
}

function BacklinkSteps({
  signedIn,
  claim,
  error,
}: {
  signedIn: boolean
  claim: Claim | null
  error: string | null
}) {
  const steps: Step[] = [
    {
      title: 'Sign in through Steam',
      body: signedIn ? <p>Signed in through Steam.</p> : <SteamSignIn />,
    },
    {
      title: 'Enter your Reddit username',
      body: !signedIn ? (
        <p>Available after the Steam sign-in.</p>
      ) : claim ? (
        <p>
          Claimed as u/{claim.claimedRedditUsername}. You can change it on{' '}
          <Link to="/me">My link</Link>.
        </p>
      ) : (
        <ClaimNameForm current={null} back="/link" />
      ),
    },
    {
      title: 'Link your page from your Reddit profile',
      body: claim ? (
        <>
          <p>
            Add your page's link to your Reddit profile (profile settings, under social links or
            the about/bio text). Readers click your profile to confirm.
          </p>
          <Link className="button primary" to="/me">
            Get your link
          </Link>
        </>
      ) : (
        <p>Your page and its link appear once you've entered your Reddit username.</p>
      ),
    },
  ]
  return (
    <StepsPage
      steps={steps}
      states={stepStates(signedIn, claim !== null)}
      error={error}
      notice={
        <>
          Your page shows your medal and the Reddit username you type, marked as claimed. Your
          Steam account is never shown. You can delete it any time.{' '}
          <Link to="/privacy">What we store</Link>.
        </>
      }
    />
  )
}

function RedditSteps({
  redditUsername,
  verification,
  devLogin,
  error,
}: {
  redditUsername: string | null
  verification: Verification | null
  devLogin: boolean
  error: string | null
}) {
  const steps: Step[] = [
    {
      title: 'Log in with Reddit',
      body: redditUsername ? (
        <p>Logged in as u/{redditUsername}.</p>
      ) : (
        <>
          <p>Dewarded reads only your Reddit username.</p>
          <a className="button primary" href="/auth/reddit/start">
            Log in with Reddit
          </a>
          {devLogin && <p className="dev">Dev mode: Reddit login is replaced by a fake form.</p>}
        </>
      ),
    },
    {
      title: 'Sign in through Steam',
      body: !redditUsername ? (
        <p>Available after the Reddit login.</p>
      ) : verification ? (
        <>
          <p>Steam account linked.</p>
          <a className="button secondary" href="/auth/steam/start">
            Re-link Steam
          </a>
        </>
      ) : (
        <SteamSignIn />
      ),
    },
    {
      title: 'Share your link',
      body: verification ? (
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
    },
  ]
  return (
    <StepsPage
      steps={steps}
      states={stepStates(redditUsername !== null, verification !== null)}
      error={error}
      notice={
        <>
          Linking makes your Reddit username and your medal public on your Dewarded page. Your
          Steam account is never shown. You can delete it any time.{' '}
          <Link to="/privacy">What we store</Link>.
        </>
      }
    />
  )
}
