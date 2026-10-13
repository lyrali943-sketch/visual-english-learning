/**
 * Route matching (kept separate from the router component file so that file
 * only exports components/hooks and fast refresh keeps working).
 */

export type RouteName = 'home' | 'upload' | 'analyze' | 'editor' | 'library' | 'speaking' | 'notfound'

export interface RouteMatch {
  name: RouteName
  params: Record<string, string>
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
  return { name: 'notfound', params: {} }
}
