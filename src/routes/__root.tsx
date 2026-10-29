import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#121212' },
      { title: 'Medallion' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/medals/rank_icon_8.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="site-header">
          <Link to="/" className="brand">
            Medallion
          </Link>
          <nav>
            <Link to="/me">My link</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <Link to="/privacy">Privacy</Link>
          <span>
            Not affiliated with Valve. Dota 2 is a trademark of Valve Corporation. Rank data from{' '}
            <a href="https://www.opendota.com">OpenDota</a>.
          </span>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
