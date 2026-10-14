/**
 * Landing-page navigation.
 *
 * Deliberately self-contained: it renders on its own light surface instead of
 * the Studio's dark site header, and it never touches the NEON SPEAK Navbar, so
 * `/speaking` keeps its own chrome exactly as before.
 *
 * Section links are plain in-page anchors, so jumping to an act works with
 * scripting disabled and never depends on a scroll handler.
 */
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

import { useScrolledPast } from '../motion'
import './../styles/landing.css'

const SECTIONS = [
  { id: 'act-context', label: 'Context' },
  { id: 'act-studio', label: 'Visual Studio' },
  { id: 'act-speaking', label: 'Speaking' },
] as const

export function StartNav({ studioHref }: { studioHref: string }) {
  const stuck = useScrolledPast(12)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="ldg-nav" data-stuck={stuck ? 'true' : 'false'} aria-label="Landing sections">
      <div className="ldg-shell">
        <div className="ldg-nav-inner">
          <a className="ldg-brand" href="#top">
            <span className="ldg-brand-mark" aria-hidden="true">
              VE
            </span>
            <span>Visual English</span>
          </a>

          {/* Mobile: the section links collapse into a disclosure so they do not
              crowd the brand at 320px. */}
          <button
            type="button"
            className="ldg-chip ldg-chip-btn ldg-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="ldg-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>

          <div className="ldg-nav-links">
            {SECTIONS.map((section) => (
              <a key={section.id} className="ldg-nav-link" href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </div>

          <a className="ldg-btn ldg-btn-primary ldg-btn-sm ldg-nav-cta" href={studioHref}>
            Open the Studio
            <ArrowRight size={15} className="ldg-btn-icon" aria-hidden="true" />
          </a>
        </div>
      </div>

      {menuOpen ? (
        <div id="ldg-nav-menu" className="ldg-shell ldg-nav-menu">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              className="ldg-nav-link"
              href={`#${section.id}`}
              onClick={() => setMenuOpen(false)}
            >
              {section.label}
            </a>
          ))}
          <a
            className="ldg-btn ldg-btn-primary ldg-btn-sm"
            href={studioHref}
            onClick={() => setMenuOpen(false)}
          >
            Open the Studio
          </a>
        </div>
      ) : null}
    </nav>
  )
}