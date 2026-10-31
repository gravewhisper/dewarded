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
    if (!loaderData) return { meta: [{ title: 'Page not found | Dewarded' }] }
    const { claim: c } = loaderData
    const medal = medalLabel(c.medal)
    const title = `${medal} · u/${c.claimedRedditUsername}`
    const region = c.region && regionLabel(c.region)
    const description = [
      'Medal verified through Steam.',
      region && `${region[0].toUpperCase()}${region.slice(1)}.`,
      'Reddit name claimed, not confirmed.',
    ]
      .filter(Boolean)
      .join(' ')
    return {
      meta: [
        { title: `${title} | Dewarded` },
        { name: 'description', content: description },
        { property: 'og:site_name', content: 'Dewarded' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'profile' },
        { property: 'og:image', content: loaderData.ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        {
          property: 'og:image:alt',
          content: `${medal} medal of u/${c.claimedRedditUsername}, verified through Steam. Reddit name claimed, not confirmed.`,
        },
        { name: 'twitter:card', content: 'summary_large_image' },
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
          Reddit doesn't let Dewarded check this automatically. To confirm, open their Reddit
          profile and check that it links to this page.
        </p>
        <p className="small">
          <strong>How to check this:</strong> Open u/{c.claimedRedditUsername}'s Reddit profile. If
          it links to this exact page, the claim is real. If not, treat it as unverified.
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
          <span className="card-user">Dewarded page</span>
          <span className="caps">Not found</span>
        </div>
        <div className="card-body">
          <h1>No medal page here</h1>
          <p className="muted">This link doesn't match a Dewarded page. It may have been deleted.</p>
          <a className="button primary" href="/link">
            Verify your own medal
          </a>
        </div>
      </article>
    </main>
  )
}
