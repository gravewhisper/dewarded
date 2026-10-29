import { createFileRoute, notFound } from '@tanstack/react-router'
import { CopyLinkButton } from '#/components/CopyLinkButton'
import { ProfileCard } from '#/components/ProfileCard'
import { medalLabel, regionLabel } from '#/domain'
import { errorSearch, formatDate } from '#/format'
import { errorMessage } from '#/messages'
import { getClaimPage } from '#/serverFns'

export const Route = createFileRoute('/p/$id')({
  validateSearch: errorSearch,
  loader: async ({ params }) => {
    const page = await getClaimPage({ data: params.id })
    if (!page) throw notFound()
    return page
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: 'Page not found | Medallion' }] }
    const { claim: c } = loaderData
    const title = `u/${c.claimedRedditUsername} (claimed): ${medalLabel(c.medal)}`
    const description = [
      `Dota 2 medal verified through Steam login: ${medalLabel(c.medal)}.`,
      `The Reddit name u/${c.claimedRedditUsername} is claimed, not confirmed by Medallion.`,
      c.region && `Region (inferred): ${regionLabel(c.region)}.`,
      `Checked ${formatDate(c.checkedAt)}.`,
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
  component: ClaimPage,
  notFoundComponent: UnknownClaim,
})

function ClaimPage() {
  const { claim: c, isOwner, nextRefreshAt } = Route.useLoaderData()
  const error = errorMessage(Route.useSearch().error)
  const coolingDown = nextRefreshAt.getTime() > Date.now()
  const profileUrl = `https://www.reddit.com/user/${c.claimedRedditUsername}/`
  return (
    <main className="page page-center">
      {error && <p className="error">{error}</p>}
      <ProfileCard identity={{ kind: 'reddit-claimed', username: c.claimedRedditUsername }} {...c} />
      <section className="card claim-note" aria-labelledby="claim-title">
        <h2 id="claim-title" className="claim-title">
          Claimed by{' '}
          <a href={profileUrl} rel="nofollow noopener">
            u/{c.claimedRedditUsername}
          </a>
          <span className="caps claim-tag">Not confirmed</span>
        </h2>
        <p>
          Reddit doesn't let Medallion check this automatically. To confirm, open their Reddit
          profile and check that it links to this page.
        </p>
        <a className="button secondary" href={profileUrl} rel="nofollow noopener">
          Open u/{c.claimedRedditUsername} on Reddit
        </a>
      </section>
      <div className="actions">
        <CopyLinkButton path={`/p/${c.id}`} />
        {isOwner && (
          <form method="post" action="/api/claim-refresh">
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

function UnknownClaim() {
  return (
    <main className="page page-center">
      <article className="card profile-card unknown-card">
        <div className="card-bar">
          <span className="card-user">Medallion page</span>
          <span className="caps">Not found</span>
        </div>
        <div className="card-body">
          <h1>No medal page here</h1>
          <p className="muted">This link doesn't match a Medallion page. It may have been deleted.</p>
          <a className="button primary" href="/link">
            Verify your own medal
          </a>
        </div>
      </article>
    </main>
  )
}
