import { randomBytes } from 'node:crypto'
import { parseVerifyMode } from '#/domain'

type RedditCredentials = { clientId: string; clientSecret: string }

const isProduction = process.env.NODE_ENV === 'production'
const isDevBuild = import.meta.env?.DEV === true

const ephemeralDevSessionSecret = () => randomBytes(32).toString('hex')

function required(name: string, devDefault: () => string): string {
  const value = process.env[name]
  if (value) return value
  if (isProduction) throw new Error(`${name} must be set in production`)
  return devDefault()
}

export const config = {
  isProduction,
  publicUrl: required('PUBLIC_URL', () => 'http://localhost:3000').replace(/\/$/, ''),
  sessionSecret: required('SESSION_SECRET', ephemeralDevSessionSecret),
  databaseUrl: process.env.DATABASE_URL || 'file:./data/dewarded.db',
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  reddit: process.env.REDDIT_CLIENT_ID
    ? ({
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET ?? '',
      } satisfies RedditCredentials)
    : null,
  verifyMode: parseVerifyMode(process.env.VERIFY_MODE),
  userAgent: 'web:dewarded:0.1 (opt-in Dota 2 medal verification)',
}

export const devLoginEnabled =
  isDevBuild &&
  !config.isProduction &&
  config.reddit === null &&
  config.verifyMode === 'reddit'

export function callbackUrl(path: string): string {
  return `${config.publicUrl}${path}`
}
