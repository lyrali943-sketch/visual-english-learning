/**
 * The poster canvas — 800 x 1200 logical pixels, five learning modules.
 *
 * This component is the single source of the poster's visual design. It is
 * used for the on-screen preview (scaled with CSS) and as the DOM that gets
 * serialized for PNG export, so what you edit is exactly what you export.
 *
 * Layout safety: after every render the columns are measured. If content
 * would overflow, the body base font size (--poster-body-size) is lowered a
 * few steps until everything fits — long content is never clipped, it is
 * simply set slightly smaller.
 */

import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react'

import {
  AnnotationArrow,
  BrandMark,
  DoodleMic,
  DoodleSparkle,
  DoodleSpoon,
  DoodleSquiggle,
} from './doodles'
import type { LearningMode, Poster } from '../types/poster'

const BODY_BASE_SIZE = 15
const BODY_MIN_SIZE = 10.5

const MODE_KICKERS: Record<LearningMode, string> = {
  everyday: 'from everyday moments',
  academic: 'from your study desk',
  business: 'from the working day',
}

const MODE_LABELS: Record<LearningMode, string> = {
  everyday: 'Everyday English',
  academic: 'Academic English',
  business: 'Business English',
}

const DIFFICULTY_LABELS: Record<Poster['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const ANNOTATION_SPOTS = [
  { top: 10, left: 10, direction: 'down-right' as const },
  { top: 10, right: 10, direction: 'down-left' as const },
  { bottom: 10, left: 10, direction: 'up-right' as const },
  { bottom: 10, right: 10, direction: 'up-left' as const },
]

export interface PosterCanvasProps {
  poster: Poster
  /** Renders the poster as it will be exported (no interactive affordances). */
  className?: string
}

export const PosterCanvas = forwardRef<HTMLDivElement, PosterCanvasProps>(function PosterCanvas(
  { poster, className },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { content, imageAdjust, theme } = poster

  // Merge the forwarded ref with our internal ref.
  const setRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref],
  )

  // Auto-fit: shrink the body base font size until nothing is clipped.
  // Runs on every content change, and again once web fonts / the photo have
  // finished loading (text metrics change after that).
  const contentKey = JSON.stringify(content)
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const inner = root.querySelector<HTMLElement>('.ves-poster-inner')
    const body = root.querySelector<HTMLElement>('.ves-poster-body')
    if (!inner || !body) return

    // A grid row grows with its content, so the columns themselves never
    // report overflow — the grid container (and the poster inner) do.
    const overflowPx = () => Math.max(body.scrollHeight - body.clientHeight, inner.scrollHeight - inner.clientHeight)

    const fit = () => {
      let size = BODY_BASE_SIZE
      root.style.setProperty('--poster-body-size', `${size}px`)
      let guard = 0
      while (overflowPx() > 1 && size > BODY_MIN_SIZE && guard < 32) {
        size = Math.max(BODY_MIN_SIZE, size - 0.3)
        root.style.setProperty('--poster-body-size', `${size}px`)
        guard += 1
      }
    }

    fit()

    let cancelled = false
    const refit = () => {
      if (!cancelled) fit()
    }

    // Fonts change text metrics — re-measure once they are ready.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    if (fonts?.ready) void fonts.ready.then(refit).catch(() => undefined)

    // The photo is a data URL; decode can finish after the first layout pass.
    const img = root.querySelector<HTMLImageElement>('.ves-poster-photo-img')
    if (img && !img.complete) {
      img.addEventListener('load', refit, { once: true })
      img.addEventListener('error', refit, { once: true })
    }

    return () => {
      cancelled = true
      img?.removeEventListener('load', refit)
      img?.removeEventListener('error', refit)
    }
  }, [contentKey, theme, imageAdjust.x, imageAdjust.y, imageAdjust.zoom, poster.photoDataUrl])

  const annotations = content.detectedObjects.slice(0, 4)
  const issue = new Date(poster.createdAt)
  const issueLabel = `No. ${String(issue.getMonth() + 1).padStart(2, '0')}/${String(issue.getFullYear()).slice(2)}`

  return (
    <div ref={setRootRef} className={`ves-poster${className ? ` ${className}` : ''}`} data-theme={theme}>
      <div className="ves-poster-texture" aria-hidden="true" />
      <div className="ves-poster-inner">
        {/* ---------------- Header / visual area ---------------- */}
        <header className="ves-poster-top">
          <div className="ves-poster-brandrow">
            <div className="ves-poster-brand">
              <BrandMark size={21} color="var(--poster-ink)" />
              <span className="ves-poster-brandname">Visual English Studio</span>
            </div>
            <span className="ves-poster-theme-tag">{content.theme}</span>
          </div>

          <div className="ves-poster-hero">
            <div className="ves-poster-hero-copy">
              <span className="ves-poster-kicker">{MODE_KICKERS[poster.mode]}</span>
              <h1 className="ves-poster-title">{content.title}</h1>
              <div style={{ width: 96, margin: '2px 0 10px' }}>
                <DoodleSquiggle size={96} color="var(--poster-accent)" />
              </div>
              <p className="ves-poster-subtitle">{content.subtitle}</p>
              <div className="ves-poster-meta">
                <span className="ves-poster-meta-chip">{MODE_LABELS[poster.mode]}</span>
                <span className="ves-poster-meta-chip">{DIFFICULTY_LABELS[poster.difficulty]}</span>
                <span className="ves-poster-meta-chip">Your photo</span>
              </div>
            </div>

            <div className="ves-poster-hero-photo">
              <div className="ves-poster-photo-frame">
                <img
                  className="ves-poster-photo-img"
                  src={poster.photoDataUrl}
                  alt={content.title}
                  style={{
                    objectPosition: `${imageAdjust.x}% ${imageAdjust.y}%`,
                    transform: `scale(${imageAdjust.zoom})`,
                  }}
                />
                {annotations.map((object, index) => {
                  const spot = ANNOTATION_SPOTS[index]
                  return (
                    <div
                      key={`${object.label}-${index}`}
                      className="ves-annotation"
                      style={{
                        top: spot.top !== undefined ? spot.top : undefined,
                        bottom: spot.bottom !== undefined ? spot.bottom : undefined,
                        left: spot.left !== undefined ? spot.left : undefined,
                        right: spot.right !== undefined ? spot.right : undefined,
                      }}
                    >
                      <span className="ves-annotation-label">{object.label}</span>
                      <AnnotationArrow size={26} color="var(--poster-accent)" direction={spot.direction} />
                    </div>
                  )
                })}
              </div>
              <div className="ves-poster-photo-caption">your photo, your words</div>
            </div>
          </div>
        </header>

        {/* ---------------- Body: 01–04 ---------------- */}
        <div className="ves-poster-body">
          <div className="ves-poster-col">
            {/* 01 Vocabulary */}
            <section className="ves-module">
              <header className="ves-module-head">
                <span className="ves-module-num">01</span>
                <span className="ves-module-title">Vocabulary</span>
                <span className="ves-module-rule" />
              </header>
              {content.vocabulary.map((item) => (
                <div className="ves-vocab-item" key={item.term}>
                  <div className="ves-vocab-head">
                    <span className="ves-vocab-term">{item.term}</span>
                    <span className="ves-vocab-leader" />
                    <span className="ves-vocab-translation">{item.translation}</span>
                  </div>
                  {item.explanation ? <p className="ves-vocab-explanation ves-clamp-2">{item.explanation}</p> : null}
                </div>
              ))}
            </section>

            {/* 04 Model response */}
            <section className="ves-module">
              <header className="ves-module-head">
                <span className="ves-module-num">04</span>
                <span className="ves-module-title">Model Response</span>
                <span className="ves-module-rule" />
              </header>
              <div className="ves-model">
                <span className="ves-model-quote" aria-hidden="true">
                  &ldquo;
                </span>
                <p className="ves-model-en">{content.modelResponse.english}</p>
                <p className="ves-model-zh">{content.modelResponse.chinese}</p>
              </div>
            </section>
          </div>

          <div className="ves-poster-col">
            {/* 02 Phrases */}
            <section className="ves-module">
              <header className="ves-module-head">
                <span className="ves-module-num">02</span>
                <span className="ves-module-title">Phrases</span>
                <span className="ves-module-rule" />
              </header>
              {content.phrases.map((item) => (
                <div className="ves-phrase-item" key={item.phrase}>
                  <div className="ves-phrase-head">
                    <span className="ves-phrase-text">{item.phrase}</span>
                    <span className="ves-phrase-translation">{item.translation}</span>
                  </div>
                  {item.explanation ? <p className="ves-phrase-explanation ves-clamp-2">{item.explanation}</p> : null}
                  {item.example ? <p className="ves-phrase-example ves-clamp-2">“{item.example}”</p> : null}
                </div>
              ))}
            </section>

            {/* 03 Sentence patterns */}
            <section className="ves-module">
              <header className="ves-module-head">
                <span className="ves-module-num">03</span>
                <span className="ves-module-title">Sentence Patterns</span>
                <span className="ves-module-rule" />
              </header>
              {content.sentencePatterns.map((item) => (
                <div className="ves-pattern" key={item.pattern}>
                  <p className="ves-pattern-sentence">{item.pattern}</p>
                  <p className="ves-pattern-translation">{item.translation}</p>
                  <p className="ves-pattern-example">{item.example}</p>
                  {item.exampleTranslation ? (
                    <p className="ves-pattern-example-t">{item.exampleTranslation}</p>
                  ) : null}
                  {item.substitutions.length > 0 ? (
                    <div className="ves-pattern-subs">
                      {item.substitutions.map((sub) => (
                        <span className="ves-pattern-sub" key={sub}>
                          {sub}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          </div>
        </div>

        {/* ---------------- Footer: 05 Speaking challenge ---------------- */}
        <footer className="ves-poster-bottom">
          <header className="ves-module-head">
            <span className="ves-module-num">05</span>
            <span className="ves-module-title">Speaking Challenge</span>
            <span className="ves-module-rule" />
            <DoodleMic size={24} color="var(--poster-accent)" />
          </header>
          {content.speakingChallenges.map((item, index) => (
            <div className="ves-challenge" key={item.question}>
              <span className="ves-challenge-num">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <p className="ves-challenge-q">{item.question}</p>
                <p className="ves-challenge-t">{item.translation}</p>
              </div>
            </div>
          ))}
          <div className="ves-poster-footline">
            <span>Visual English Studio · visual vocabulary journal</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {poster.source === 'demo' ? (
                <span className="ves-poster-demo-mark">Demo sample</span>
              ) : (
                <DoodleSparkle size={13} color="var(--poster-accent)" />
              )}
              {issueLabel}
              <DoodleSpoon size={13} color="var(--poster-muted)" />
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
})
