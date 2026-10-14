/**
 * Renders the 800x1200 poster at any container width using a CSS transform.
 * The poster itself is never resized internally, so the exported PNG and the
 * on-screen preview always share the same layout.
 */

import { useEffect, useRef, useState, type Ref } from 'react'

import { PosterCanvas } from './PosterCanvas'
import { POSTER_LOGICAL_HEIGHT, POSTER_LOGICAL_WIDTH } from '../services/posterExport'
import type { Poster } from '../types/poster'

export interface ScaledPosterProps {
  poster: Poster
  /** Ref to the poster DOM node (used by PNG export). */
  posterRef?: Ref<HTMLDivElement>
  /** Maximum logical width to render at (defaults to 800). */
  maxWidth?: number
  className?: string
}

export function ScaledPoster({ poster, posterRef, maxWidth = POSTER_LOGICAL_WIDTH, className }: ScaledPosterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.3)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const measure = () => {
      const width = element.clientWidth
      if (width > 0) setScale(Math.min(1, Math.min(maxWidth, width) / POSTER_LOGICAL_WIDTH))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [maxWidth])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        maxWidth: '100%',
        // Without an explicit zero minimum the element reports an intrinsic
        // width of 800px to its parent grid/flex track, which pins the track
        // open and causes page-level horizontal overflow on narrow screens.
        minWidth: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: POSTER_LOGICAL_WIDTH * scale,
          height: POSTER_LOGICAL_HEIGHT * scale,
          position: 'relative',
          flex: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <PosterCanvas poster={poster} ref={posterRef} />
        </div>
      </div>
    </div>
  )
}
