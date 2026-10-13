/**
 * Tiny dependency-free router (history API + popstate).
 * Keeps real URLs (/, /upload, /analyze, /editor, /library) so the SPA works
 * both in `vite dev` and behind the bundled Node server.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { matchRoute, type RouteMatch } from './routeMatch'

interface RouterValue {
  path: string
  route: RouteMatch
  navigate: (to: string) => void
  back: () => void
}

const RouterContext = createContext<RouterValue | null>(null)

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  const back = useCallback(() => window.history.back(), [])

  const value = useMemo<RouterValue>(() => ({ path, route: matchRoute(path), navigate, back }), [path, navigate, back])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRouter must be used inside <RouterProvider>')
  return value
}

/** Link that performs client-side navigation. */
export function StudioLink({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string
  children: ReactNode
  className?: string
  onClick?: () => void
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const { navigate } = useRouter()
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        event.preventDefault()
        onClick?.()
        navigate(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}
