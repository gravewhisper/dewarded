import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { applySecurityHeaders } from '#/server/securityHeaders'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const csrf = createCsrfMiddleware({
  filter: ({ request }) => !SAFE_METHODS.has(request.method),
  origin: (origin, { request }) =>
    origin === new URL(request.url).origin ||
    origin === process.env.PUBLIC_URL?.replace(/\/$/, ''),
})

const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next()
  applySecurityHeaders(result.response.headers)
  return result
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders, csrf],
}))
