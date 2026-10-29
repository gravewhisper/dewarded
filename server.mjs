import { fileURLToPath } from 'node:url'
import { serve } from 'srvx'
import { staticMiddleware } from 'srvx/static'
import app, { applySecurityHeaders, getDb } from './dist/server/server.js'

const log = async (request, next) => {
  const start = performance.now()
  const response = await next()
  const ms = (performance.now() - start).toFixed(1)
  console.log(`${request.method} ${new URL(request.url).pathname} ${response.status} ${ms}ms`)
  return response
}

const securityHeaders = async (_request, next) => {
  const response = await next()
  applySecurityHeaders(response.headers)
  return response
}

const STATIC_CACHE_CONTROL = [
  ['/assets/', 'public, max-age=31536000, immutable'],
  ['/', 'public, max-age=604800'],
]

const serveStatic = staticMiddleware({ dir: fileURLToPath(new URL('./dist/client', import.meta.url)) })

const cachedStatic = async (request, next) => {
  let servedByApp = false
  const response = await serveStatic(request, () => {
    servedByApp = true
    return next()
  })
  if (servedByApp || response.status >= 400) return response
  const pathname = new URL(request.url).pathname
  const [, cacheControl] = STATIC_CACHE_CONTROL.find(([prefix]) => pathname.startsWith(prefix))
  response.headers.set('Cache-Control', cacheControl)
  return response
}

await getDb()

serve({
  fetch: app.fetch,
  gracefulShutdown: true,
  middleware: [
    log,
    securityHeaders,
    cachedStatic,
  ],
  error: (error) => {
    console.error(error)
    return new Response('Internal Server Error', { status: 500 })
  },
})
