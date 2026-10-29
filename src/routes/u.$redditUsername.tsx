import { createFileRoute, notFound } from '@tanstack/react-router'
import { CopyLinkButton } from '#/components/CopyLinkButton'
import { ProfileCard } from '#/components/ProfileCard'
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
    <main className="page page-center">
      {error && <p className="error">{error}</p>}
      <ProfileCard identity={{ kind: 'reddit-verified', username: v.redditUsername }} {...v} />
      <div className="actions">
        <CopyLinkButton path={`/u/${v.redditUsername}`} />
        {isOwner && (
          <form method="post" action="/api/refresh">
            <button className="button secondary" disabled={coolingDown}>
              Refresh medal
            </button>
          </form>
        )}
      </div>
      {isOwner && coolingDown && (
        <p className="muted small">Refresh available after {formatDate(nextRefreshAt)}.</p>
      )}
    </main>
  )
}

function UnknownUser() {
  const { redditUsername } = Route.useParams()
  return (
    <main className="page page-center">
      <article className="card profile-card unknown-card">
        <div className="card-bar">
          <span className="card-user">u/{redditUsername}</span>
          <span className="caps">Not verified</span>
        </div>
        <div className="card-body">
          <h1>u/{redditUsername} hasn't verified a medal</h1>
          <p className="muted">There is no Medallion record for this Reddit user.</p>
          <a className="button primary" href="/link">
            Verify your own medal
          </a>
        </div>
      </article>
    </main>
  )
}
