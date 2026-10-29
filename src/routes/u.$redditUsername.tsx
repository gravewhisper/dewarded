import { createFileRoute, notFound } from '@tanstack/react-router'
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
      <p className="muted">u/{v.redditUsername}</p>
      <h1 className="medal">{medalLabel(v.medal)}</h1>
      {v.region && <p>{regionLabel(v.region)} (inferred from OpenDota)</p>}
      <p className="muted">
        Steam account verified by Steam login. Medal from{' '}
        <a href={`https://www.opendota.com/players/${v.accountId}`}>OpenDota</a>, checked{' '}
        {formatDate(v.checkedAt)}.
      </p>
      {error && <p className="error">{error}</p>}
      {isOwner && (
        <form method="post" action="/api/refresh">
          <button disabled={coolingDown}>Refresh</button>{' '}
          {coolingDown && <span className="muted">Available after {formatDate(nextRefreshAt)}.</span>}
        </form>
      )}
    </main>
  )
}

function UnknownUser() {
  const { redditUsername } = Route.useParams()
  return (
    <main>
      <h1>Not verified</h1>
      <p>u/{redditUsername} has not linked a Steam account on Medallion.</p>
      <p>
        <a href="/link">Verify your own medal</a>
      </p>
    </main>
  )
}
