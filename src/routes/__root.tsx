import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#0d0e11' },
      { title: 'Medallion' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: FONTS_URL },
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
          <Link to="/" className="wordmark">
            MEDALLION
          </Link>
          <Link to="/link" className="header-link">
            Verify your own medal
          </Link>
        </header>
        {children}
        <footer className="site-footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/me">My link</Link>
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
