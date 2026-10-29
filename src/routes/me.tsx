import { Link, createFileRoute } from '@tanstack/react-router'
import { EstimatedMmrAbout } from '#/components/InfoPopover'
import { ClaimNameForm } from '#/components/ClaimNameForm'
import { CopyLinkButton } from '#/components/CopyLinkButton'
import { MedalBadge } from '#/components/MedalBadge'
import { MmrForm } from '#/components/MmrForm'
import { estimatedMmrRange, formatMmrRange, medalLabel, mmrAllowed, type Claim, type Verification } from '#/domain'
import { errorSearch, formatDay } from '#/format'
import { errorMessage } from '#/messages'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/me')({
  validateSearch: errorSearch,
  loader: () => getAccount(),
  component: MePage,
})

function MePage() {
  const account = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  return account.mode === 'backlink' ? (
    <BacklinkAccount claim={account.claim} pageUrl={account.pageUrl} signedIn={account.steamId64 !== null} error={error} />
  ) : (
    <RedditAccount redditUsername={account.redditUsername} verification={account.verification} error={error} />
  )
}

function AccountFacts({ check, extra }: { check: Verification | Claim; extra?: React.ReactNode }) {
  const estimate = estimatedMmrRange(check.medal)
  return (
    <section className="card account">
      <MedalBadge medal={check.medal} size={96} />
      <dl className="facts">
        <div>
          <dt className="caps">Rank</dt>
          <dd>{medalLabel(check.medal)}</dd>
        </div>
        {estimate && (
          <div>
            <dt className="caps">Est. MMR</dt>
            <dd className="mmr-line">
              {formatMmrRange(estimate)}
              <EstimatedMmrAbout id="mmr-estimate-about" />
            </dd>
          </div>
        )}
        {extra}
        <div>
          <dt className="caps">Steam account</dt>
          <dd>
            <code>{check.steamId64}</code> <span className="muted">(only you see this)</span>
          </dd>
        </div>
        <div>
          <dt className="caps">Checked</dt>
          <dd>{formatDay(check.checkedAt)}</dd>
        </div>
      </dl>
    </section>
  )
}

function DangerZone({ action }: { action: '/api/delete' | '/api/claim-delete' }) {
  return (
    <section className="danger-zone">
      <h2>Delete my data</h2>
      <p className="muted">Removes your record and your public page immediately, then logs you out.</p>
      <form method="post" action={action}>
        <button className="button danger">Delete all my data and log out</button>
      </form>
    </section>
  )
}

function LogOut() {
  return (
    <form method="post" action="/api/logout">
      <button className="button secondary">Log out</button>
    </form>
  )
}

function BacklinkAccount({
  claim,
  pageUrl,
  signedIn,
  error,
}: {
  claim: Claim | null
  pageUrl: string | null
  signedIn: boolean
  error: string | null
}) {
  if (!signedIn) {
    return (
      <main className="page">
        <h1>Not signed in</h1>
        <p className="muted">Sign in through Steam to see and manage your page.</p>
        <div className="actions">
          <a className="button primary" href="/link">
            Sign in through Steam
          </a>
        </div>
      </main>
    )
  }
  if (!claim || !pageUrl) {
    return (
      <main className="page">
        <h1>Your medal page</h1>
        {error && <p className="error">{error}</p>}
        <section className="card card-pad">
          <p className="flush">Signed in through Steam. Add your Reddit username to create your page.</p>
        </section>
        <div className="actions">
          <a className="button primary" href="/link">
            Continue
          </a>
          <LogOut />
        </div>
      </main>
    )
  }
  const pagePath = `/p/${claim.id}`
  return (
    <main className="page">
      <h1>Your medal page</h1>
      {error && <p className="error">{error}</p>}
      <ol className="card steps share-link">
        <li data-state="done">
          <span className="step-n">1</span>
          <div>
            <h2>
              Claimed u/{claim.claimedRedditUsername}
              <span className="caps step-status">Done</span>
            </h2>
          </div>
        </li>
        <li data-state="current">
          <span className="step-n">2</span>
          <div>
            <h2>Add your Medallion link to your Reddit profile</h2>
            <p>Put it in your profile settings, under social links or in the about/bio text.</p>
            <p className="share-url">
              <a href={pagePath}>{pageUrl}</a>
            </p>
            <div className="actions">
              <CopyLinkButton path={pagePath} />
              <Link className="button secondary" to="/p/$id" params={{ id: claim.id }}>
                Open page
              </Link>
            </div>
            <p className="share-note">Readers confirm it by opening your profile.</p>
          </div>
        </li>
      </ol>
      <AccountFacts
        check={claim}
        extra={
          <div>
            <dt className="caps">Reddit name</dt>
            <dd>
              u/{claim.claimedRedditUsername} <span className="muted">(claimed, shown publicly)</span>
            </dd>
          </div>
        }
      />
      <ClaimNameForm current={claim.claimedRedditUsername} back="/me" />
      {mmrAllowed(claim.medal) ? (
        <MmrForm mmr={claim.selfReportedMmr} action="/api/claim-mmr" />
      ) : (
        <p className="muted small">Self-reported MMR is available once you reach Immortal.</p>
      )}
      <div className="actions">
        <LogOut />
      </div>
      <DangerZone action="/api/claim-delete" />
    </main>
  )
}

function RedditAccount({
  redditUsername,
  verification,
  error,
}: {
  redditUsername: string | null
  verification: Verification | null
  error: string | null
}) {
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
      {error && <p className="error">{error}</p>}
      {verification ? (
        <>
          <AccountFacts check={verification} />
          {mmrAllowed(verification.medal) ? (
            <MmrForm mmr={verification.selfReportedMmr} action="/api/mmr" />
          ) : (
            <p className="muted small">Self-reported MMR is available once you reach Immortal.</p>
          )}
          <div className="actions">
            <Link className="button primary" to="/u/$redditUsername" params={{ redditUsername }}>
              Public page
            </Link>
            <form method="post" action="/api/unlink">
              <button className="button secondary">Unlink Steam</button>
            </form>
            <LogOut />
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
            <LogOut />
          </div>
        </>
      )}
      <DangerZone action="/api/delete" />
    </main>
  )
}
