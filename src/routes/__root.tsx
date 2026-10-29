import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'

import { getViewer } from '#/serverFns'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  loader: () => getViewer(),
  staleTime: Infinity,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0d0e11' },
      { title: 'Dewarded' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/medals/rank_icon_8.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { signedIn } = Route.useLoaderData()
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <Link to="/" className="wordmark">
            DEWARDED
          </Link>
          {signedIn ? (
            <Link to="/me" className="header-link">
              My link
            </Link>
          ) : (
            <Link to="/link" className="header-link">
              Verify your own medal
            </Link>
          )}
        </header>
        {children}
        <footer className="site-footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/faq">FAQ</Link>
          <span>Not affiliated with Valve. Dota 2 is a trademark of Valve Corporation.</span>
          <span>
            Rank data from <a href="https://www.opendota.com">OpenDota</a>.
          </span>
          <span>Steam account never shown.</span>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
