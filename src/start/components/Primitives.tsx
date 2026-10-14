/**
 * Small shared building blocks for the landing page.
 */
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

import './../styles/landing.css'

/**
 * Marks a block as revealable.
 *
 * Deliberately does not hold state and does not observe anything itself: the
 * page-level `useRevealSections` sweep owns `data-revealed`, so a fast scroll
 * or an anchor jump cannot leave a block stranded at opacity 0.
 *
 * `data-armed` is only set after mount. Until then the CSS default applies and
 * the content is visible, so a page that never hydrates still reads.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    setArmed(true)
  }, [])

  return (
    <div
      ref={ref}
      className={`ldg-reveal ${className}`}
      data-armed={armed ? 'true' : 'false'}
      data-revealed="false"
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/** Eyebrow + heading + lede, the consistent opening of every act. */
export function ActHead({
  eyebrow,
  title,
  lede,
  align = 'start',
}: {
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  align?: 'start' | 'center'
}) {
  return (
    <Reveal className={`ldg-head${align === 'center' ? ' ldg-head-center' : ''}`}>
      <span className="ldg-eyebrow">{eyebrow}</span>
      <h2 className="ldg-h2">{title}</h2>
      {lede ? <p className="ldg-lede">{lede}</p> : null}
    </Reveal>
  )
}

/**
 * Honest provenance note. Used wherever the page shows material that is NOT
 * the result of a real user upload or a real AI analysis.
 */
export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="ldg-note">
      <Info size={14} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}