/**
 * Visual English Studio — application shell.
 * Site chrome (dark violet, iOS-like) + routed pages + the preserved legacy
 * speaking-practice app, which stays reachable at /speaking.
 */

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CircleAlert, CircleCheck } from 'lucide-react'

import { RouterProvider, StudioLink, useRouter } from './router'
import { isStandaloneRoute } from './routeMatch'
import { SessionProvider, useSession } from './session/SessionProvider'
import { AmbientBackground } from './components/AmbientBackground'
import { SiteHeader } from './components/SiteHeader'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { EditorPage } from './pages/EditorPage'
import { LibraryPage } from './pages/LibraryPage'

// The two other products in this repository. Both render their own shell, so
// neither inherits the Studio's chrome; see StandaloneProduct below.
import LegacySpeakingApp from '../App'
import { StartPage } from '../start/StartPage'

/**
 * The two products that are not the Studio.
 *
 * Speaking Practice keeps its own navigation, palette and fonts; the interactive
 * design prototype does the same. Neither is mounted inside `.ves-app`, so the
 * Studio's site header, site footer and background can never leak onto them.
 */
function StandaloneProduct({ name }: { name: 'speaking' | 'start' }) {
  return name === 'speaking' ? <LegacySpeakingApp /> : <StartPage />
}

function StudioRoutes() {
  const { route, navigate } = useRouter()

  if (route.name === 'notfound') {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[560px] flex-col items-center justify-center px-5 text-center">
        <h1 className="ves-display text-[30px]">Page not found</h1>
        <p className="mt-3 text-[15px]" style={{ color: 'var(--color-ves-muted)' }}>
          The page you were looking for does not exist.
        </p>
        <button type="button" className="ves-btn ves-btn-primary mt-6" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    )
  }

  // Studio routes only. `speaking` and `start` never reach this component —
  // StudioEntry returns StandaloneProduct for them first.
  return (
    <>
      {route.name === 'home' ? <HomePage /> : null}
      {route.name === 'upload' ? <UploadPage /> : null}
      {route.name === 'analyze' ? <AnalysisPage /> : null}
      {route.name === 'editor' ? <EditorPage /> : null}
      {route.name === 'library' ? <LibraryPage /> : null}
    </>
  )
}

function SiteFooter() {
  // Only rendered on Studio routes: StudioEntry returns StandaloneProduct for
  // /speaking and /start before this component is ever mounted, so it needs no
  // path check of its own.
  return (
    <footer
      className="relative z-10 mt-10 border-t"
      style={{ borderColor: 'var(--color-ves-line)', background: 'rgba(255, 255, 255, 0.72)' }}
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
            Visual English Studio
          </p>
          <p className="mt-1 max-w-[520px] text-[12.5px] leading-relaxed" style={{ color: 'var(--color-ves-faint)' }}>
            A visual vocabulary journal built from your own photos. Posters are saved in this browser on this device only —
            nothing is uploaded or synced.
          </p>
        </div>
        {/* `py-1.5` + `gap-y-0` keeps the visual rhythm while giving each link a
            ~32px tap target (WCAG 2.5.8) instead of a 20px line box. */}
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-0 text-[13px]">
          <StudioLink to="/" className="ves-link py-1.5">
            Home
          </StudioLink>
          <StudioLink to="/start" className="ves-link py-1.5">
            Overview
          </StudioLink>
          <StudioLink to="/upload" className="ves-link py-1.5">
            Create a Poster
          </StudioLink>
          <StudioLink to="/library" className="ves-link py-1.5">
            My Library
          </StudioLink>
          <StudioLink to="/speaking" className="ves-link py-1.5" style={{ color: 'var(--color-ves-faint)' }}>
            Speaking Practice
          </StudioLink>
        </nav>
      </div>
    </footer>
  )
}

function NoticeToast() {
  const { notice, setNotice } = useSession()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 3600)
    return () => clearTimeout(timer)
  }, [notice, setNotice])

  return (
    <AnimatePresence>
      {notice ? (
        <motion.div
          key={notice}
          {...(reducedMotion
            ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
            : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 } })}
          transition={{ duration: 0.25 }}
          className="ves-safe-bottom pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
          role="status"
        >
          <span
            className="pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] font-medium"
            style={{
              background: 'rgba(255, 255, 255, 0.94)',
              border: '1px solid var(--color-ves-line-strong)',
              color: 'var(--color-ves-text)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 18px 44px -20px rgba(16, 35, 74, 0.5)',
            }}
          >
            {notice.toLowerCase().includes('delet') ? (
              <CircleAlert size={16} strokeWidth={2} style={{ color: 'var(--color-ves-danger)' }} />
            ) : (
              <CircleCheck size={16} strokeWidth={2} style={{ color: 'var(--color-ves-success)' }} />
            )}
            {notice}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Chooses the shell: the Studio's own chrome, or a standalone product.
 *
 * It must live *inside* <RouterProvider> because it reads the current route,
 * and it must not call a hook conditionally.
 *
 * The check is on `route.name`, not `window.location.pathname`. matchRoute()
 * normalises trailing slashes, so "/speaking/" resolves to the same route as
 * "/speaking"; testing the raw string used to let the trailing-slash form fall
 * through to the Studio shell, which rendered Speaking (and the design
 * prototype) inside the Studio's header, footer and dark violet background.
 */
function StudioEntry() {
  const { route } = useRouter()

  if (isStandaloneRoute(route.name)) return <StandaloneProduct name={route.name} />

  return (
    <div className="ves-app relative min-h-screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <AmbientBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <StudioRoutes />
        </main>
        <SiteFooter />
      </div>
      <NoticeToast />
    </div>
  )
}

export function StudioApp() {
  return (
    <RouterProvider>
      <SessionProvider>
        <StudioEntry />
      </SessionProvider>
    </RouterProvider>
  )
}
