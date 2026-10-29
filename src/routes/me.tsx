import { Link, createFileRoute } from '@tanstack/react-router'
import { EstimatedMmrAbout } from '#/components/InfoPopover'
import { MedalBadge } from '#/components/MedalBadge'
import { MAX_MMR, MIN_SELF_REPORTED_MMR, estimatedMmrRange, formatMmr, formatMmrRange, medalLabel, mmrAllowed } from '#/domain'
import { errorSearch, formatDay } from '#/format'
import { errorMessage } from '#/messages'
import { getAccount } from '#/serverFns'

export const Route = createFileRoute('/me')({
  validateSearch: errorSearch,
  loader: () => getAccount(),
  component: MePage,
})

function MePage() {
  const { redditUsername, verification } = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  const estimate = verification && estimatedMmrRange(verification.medal)
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
          <section className="card account">
            <MedalBadge medal={verification.medal} size={96} />
            <dl className="facts">
              <div>
                <dt className="caps">Rank</dt>
                <dd>{medalLabel(verification.medal)}</dd>
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
          {mmrAllowed(verification.medal) ? (
            <MmrForm mmr={verification.selfReportedMmr} />
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

function MmrForm({ mmr }: { mmr: number | null }) {
  return (
    <form className="card card-pad mmr-form" method="post" action="/api/mmr">
      <label className="mmr-form-label" htmlFor="mmr">
        Your MMR <span className="muted">(optional, self-reported)</span>
      </label>
      <p className="muted small flush">
        {mmr === null ? 'Not set.' : `Currently ${formatMmr(mmr)}.`}
      </p>
      <div className="mmr-form-row">
        <input
          id="mmr"
          name="mmr"
          type="number"
          inputMode="numeric"
          min={MIN_SELF_REPORTED_MMR}
          max={MAX_MMR}
          step={1}
          defaultValue={mmr ?? ''}
          aria-describedby="mmr-help"
        />
        <button className="button primary">Save</button>
        {mmr !== null && (
          <button className="button secondary" name="action" value="clear" formNoValidate>
            Clear
          </button>
        )}
      </div>
      <p id="mmr-help" className="muted small flush">
        Valve doesn't share MMR, so this can't be verified. It's shown as self-reported.
      </p>
    </form>
  )
}
