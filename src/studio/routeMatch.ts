/**
 * Route matching (kept separate from the router component file so that file
 * only exports components/hooks and fast refresh keeps working).
 */

export type RouteName = 'home' | 'upload' | 'analyze' | 'editor' | 'library' | 'speaking' | 'start' | 'notfound'

export interface RouteMatch {
  name: RouteName
  params: Record<string, string>
}

/**
 * Routes that render as their own product, outside the Visual English Studio
 * shell (site header, site footer and the .ves-app surface).
 *
 * The two products stay in one repository and one build, but each keeps its own
 * entry point, visual surface and component tree. Declaring the boundary here
 * means the routing module is the single place that knows which paths belong to
 * which product, instead of the shell re-deriving it from raw pathnames.
 */
const STANDALONE_ROUTES: ReadonlySet<RouteName> = new Set<RouteName>(['speaking', 'start'])

/**
 * Type guard for the standalone products.
 *
 * Callers must use this with `route.name` rather than comparing
 * `window.location.pathname`: matchRoute() normalises trailing slashes, so
 * "/speaking/" and "/speaking" are the same product. Comparing the raw pathname
 * would let the trailing-slash form fall through to the Studio shell and render
 * one product inside the other's header and footer.
 */
export function isStandaloneRoute(name: RouteName): name is 'speaking' | 'start' {
  return STANDALONE_ROUTES.has(name)
}

export function matchRoute(pathname: string): RouteMatch {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'home', params: {} }
  if (path === '/upload') return { name: 'upload', params: {} }
  if (path === '/analyze') return { name: 'analyze', params: {} }
  if (path === '/editor') return { name: 'editor', params: {} }
  if (path.startsWith('/editor/')) return { name: 'editor', params: { id: decodeURIComponent(path.slice('/editor/'.length)) } }
  if (path === '/library') return { name: 'library', params: {} }
  if (path === '/speaking') return { name: 'speaking', params: {} }
  if (path === '/start') return { name: 'start', params: {} }
  return { name: 'notfound', params: {} }
}
