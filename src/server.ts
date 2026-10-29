import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

export { applySecurityHeaders } from './server/securityHeaders'

export default createServerEntry({ fetch: (request) => handler.fetch(request) })
