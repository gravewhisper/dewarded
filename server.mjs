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

await getDb()

serve({
  fetch: app.fetch,
  gracefulShutdown: true,
  middleware: [
    log,
    securityHeaders,
    staticMiddleware({ dir: fileURLToPath(new URL('./dist/client', import.meta.url)) }),
  ],
  error: (error) => {
    console.error(error)
    return new Response('Internal Server Error', { status: 500 })
  },
})
