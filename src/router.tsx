import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// TanStack Start requires getRouter to be exported; it is called once per request (SSR)
// and once on the client, returning a fresh router instance each time.
export function getRouter() {
  const router = createRouter({
    routeTree,
    basepath: '/voice-agent-pricing-compare',
    scrollRestoration: true,
  })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
