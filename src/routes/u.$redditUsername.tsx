import { createFileRoute, notFound } from '@tanstack/react-router'
import { MedalBadge } from '#/components/MedalBadge'
import { medalLabel, regionLabel } from '#/domain'
import { errorSearch, formatDate } from '#/format'
import { errorMessage } from '#/messages'
import { getProfile } from '#/serverFns'

export const Route = createFileRoute('/u/$redditUsername')({
  validateSearch: errorSearch,
  loader: async ({ params }) => {
    const profile = await getProfile({ data: params.redditUsername })
    if (!profile) throw notFound()
    return profile
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: 'Unknown user | Medallion' }] }
    const { verification: v } = loaderData
    const title = `u/${v.redditUsername}: ${medalLabel(v.medal)}`
    const description = [
      `Verified Dota 2 medal for u/${v.redditUsername}: ${medalLabel(v.medal)}.`,
      v.region && `Region (inferred): ${regionLabel(v.region)}.`,
      `Checked ${formatDate(v.checkedAt)}.`,
    ]
      .filter(Boolean)
      .join(' ')
    return {
      meta: [
        { title: `${title} | Medallion` },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'profile' },
        { property: 'og:image', content: loaderData.ogImage },
        { property: 'og:image:width', content: '256' },
        { property: 'og:image:height', content: '256' },
        { name: 'twitter:card', content: 'summary' },
      ],
    }
  },
  component: ProfilePage,
  notFoundComponent: UnknownUser,
})

function ProfilePage() {
  const { verification: v, isOwner, nextRefreshAt } = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  const coolingDown = nextRefreshAt.getTime() > Date.now()
  return (
    <main>
      <article className="record">
        <MedalBadge medal={v.medal} size={200} />
        <div>
          <p className="label">Verified medal record</p>
          <h1>u/{v.redditUsername}</h1>
          <dl className="record-dl">
            <div>
              <dt>Rank</dt>
              <dd className="rank-value">{medalLabel(v.medal)}</dd>
            </div>
            <div>
              <dt>Region</dt>
              <dd>
                {v.region ? (
                  <>
                    {regionLabel(v.region)} <span className="muted">(inferred)</span>
                  </>
                ) : (
                  <span className="muted">Unknown</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Checked</dt>
              <dd>{formatDate(v.checkedAt)}</dd>
            </div>
            <div>
              <dt>Verified by</dt>
              <dd>Steam login. Medal data from OpenDota.</dd>
            </div>
          </dl>
        </div>
      </article>
      {(error || isOwner) && (
        <section className="owner-tools">
          {error && <p className="error">{error}</p>}
          {isOwner && (
            <form method="post" action="/api/refresh" className="actions">
              <button disabled={coolingDown}>Refresh medal</button>
              {coolingDown && (
                <span className="muted">Available after {formatDate(nextRefreshAt)}.</span>
              )}
            </form>
          )}
        </section>
      )}
    </main>
  )
}

function UnknownUser() {
  const { redditUsername } = Route.useParams()
  return (
    <main>
      <p className="label">Not verified</p>
      <h1>u/{redditUsername}</h1>
      <p>This Reddit user has not linked a Steam account on Medallion, so there is no medal to show.</p>
      <p>
        <a className="button primary" href="/link">
          Verify your own medal
        </a>
      </p>
    </main>
  )
}
