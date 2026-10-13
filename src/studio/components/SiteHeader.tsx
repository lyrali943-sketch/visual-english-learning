/**
 * Site header — brand, primary navigation and the main call to action.
 * Glass surface, thin border, compact on phones.
 */

import { Bookmark, Sparkles } from 'lucide-react'

import { BrandMark } from '../poster/doodles'
import { StudioLink, useRouter } from '../router'
import { useSession } from '../session/SessionProvider'

export function SiteHeader() {
  const { path, navigate } = useRouter()
  const { demoMode } = useSession()

  const isActive = (route: string) => path === route || (route === '/library' && path.startsWith('/editor/'))

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: 'var(--color-ves-line)',
        background: 'rgba(11, 7, 23, 0.62)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
        <StudioLink to="/" className="flex items-center gap-3" aria-label="Visual English Studio — home">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #6D5DFB)',
              boxShadow: '0 6px 18px -6px rgba(139, 92, 246, 0.8), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            <BrandMark size={19} color="#FFFFFF" strokeWidth={1.9} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--color-ves-text)' }}>
              Visual English Studio
            </span>
            <span
              className="mt-1 hidden text-[10.5px] font-medium uppercase tracking-[0.18em] sm:block"
              style={{ color: 'var(--color-ves-faint)' }}
            >
              Visual vocabulary journal
            </span>
          </span>
        </StudioLink>

        <nav className="flex items-center gap-1 sm:gap-2">
          {demoMode ? (
            <span
              className="ves-chip mr-1 hidden sm:inline-flex"
              title="No AI provider is configured — sample content is used."
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: 'var(--color-ves-violet)',
                  boxShadow: '0 0 8px var(--color-ves-glow)',
                }}
              />
              Demo mode
            </span>
          ) : null}
          <StudioLink
            to="/library"
            className="ves-btn ves-btn-ghost ves-btn-sm"
            aria-current={isActive('/library') ? 'page' : undefined}
          >
            <Bookmark size={16} strokeWidth={1.9} />
            <span className="hidden sm:inline">My Library</span>
          </StudioLink>
          <button type="button" className="ves-btn ves-btn-primary ves-btn-sm" onClick={() => navigate('/upload')}>
            <Sparkles size={16} strokeWidth={2} />
            Create a Poster
          </button>
        </nav>
      </div>
    </header>
  )
}
