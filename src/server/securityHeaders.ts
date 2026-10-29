import { config } from './config'

const ALWAYS: Array<[string, string]> = [
  ['Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'"],
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
]

const PRODUCTION: Array<[string, string]> = [
  ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
]

export function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of config.isProduction ? [...ALWAYS, ...PRODUCTION] : ALWAYS) {
    headers.set(name, value)
  }
}
