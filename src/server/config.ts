import { randomBytes } from 'node:crypto'

type RedditCredentials = { clientId: string; clientSecret: string }

const isProduction = process.env.NODE_ENV === 'production'

function required(name: string, devDefault: () => string): string {
  const value = process.env[name]
  if (value) return value
  if (isProduction) throw new Error(`${name} must be set in production`)
  return devDefault()
}

export const config = {
  isProduction,
  publicUrl: required('PUBLIC_URL', () => 'http://localhost:3000').replace(/\/$/, ''),
  // A per-process dev secret means sessions reset on restart, which is fine locally.
  sessionSecret: required('SESSION_SECRET', () => randomBytes(32).toString('hex')),
  databaseUrl: process.env.DATABASE_URL || 'file:./data/medallion.db',
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  reddit: process.env.REDDIT_CLIENT_ID
    ? ({
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET ?? '',
      } satisfies RedditCredentials)
    : null,
  userAgent: 'web:medallion:0.1 (opt-in Dota 2 medal verification)',
}

// import.meta.env.DEV is a build-time constant, so a production build keeps the
// fake login unreachable even if the host forgets to set NODE_ENV.
export const devLoginEnabled =
  import.meta.env?.DEV === true && !config.isProduction && config.reddit === null

export function callbackUrl(path: string): string {
  return `${config.publicUrl}${path}`
}
