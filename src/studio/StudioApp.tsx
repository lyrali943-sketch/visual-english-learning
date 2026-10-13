/**
 * Visual English Studio — application shell.
 * Site chrome (dark violet, iOS-like) + routed pages + the preserved legacy
 * speaking-practice app, which stays reachable at /speaking.
 */

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CircleAlert, CircleCheck } from 'lucide-react'

import { RouterProvider, StudioLink, useRouter } from './router'
import { SessionProvider, useSession } from './session/SessionProvider'
import { AmbientBackground } from './components/AmbientBackground'
import { SiteHeader } from './components/SiteHeader'
import { HomePage } from './pages/HomePage'
import { UploadPage } from './pages/UploadPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { EditorPage } from './pages/EditorPage'
import { LibraryPage } from './pages/LibraryPage'

// The previous app in this project (NEON SPEAK speaking practice) is kept
// intact and remains available at /speaking.
import LegacySpeakingApp from '../App'

function StudioRoutes() {
  const { route, navigate } = useRouter()

  if (route.name === 'speaking') return <LegacySpeakingApp />

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
  const { path } = useRouter()
  if (path === '/speaking') return null
  return (
    <footer
      className="relative z-10 mt-10 border-t"
      style={{ borderColor: 'var(--color-ves-line)', background: 'rgba(11, 7, 23, 0.6)' }}
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
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <StudioLink to="/" className="ves-link">
            Home
          </StudioLink>
          <StudioLink to="/upload" className="ves-link">
            Create a Poster
          </StudioLink>
          <StudioLink to="/library" className="ves-link">
            My Library
          </StudioLink>
          <StudioLink to="/speaking" className="ves-link" style={{ color: 'var(--color-ves-faint)' }}>
            Speaking practice (legacy)
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
              background: 'linear-gradient(180deg, rgba(33, 24, 58, 0.92), rgba(21, 16, 39, 0.94))',
              border: '1px solid rgba(167, 139, 250, 0.4)',
              color: 'var(--color-ves-text)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 18px 50px -18px rgba(5, 2, 15, 0.95)',
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
 * Picks between the Studio site chrome and the standalone legacy speaking app.
 *
 * It has to live *inside* <RouterProvider> because it reads the current route,
 * and it must not call any hook conditionally.
 */
function StudioEntry() {
  const { path } = useRouter()

  // NEON SPEAK renders on its own: no SiteHeader, SiteFooter, AmbientBackground
  // or .ves-app surface, so it keeps its original dark layout and typography
  // instead of inheriting the Studio's fonts, colours and background.
  if (path === '/speaking') return <LegacySpeakingApp />

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
