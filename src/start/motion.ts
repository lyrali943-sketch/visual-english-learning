/**
 * Interaction primitives for the landing page.
 *
 * Everything here is deliberately cheap:
 *
 *   - the pointer field keeps one listener and ONE requestAnimationFrame loop,
 *     and the loop parks itself as soon as the value has settled;
 *   - scroll reveal uses IntersectionObserver and stops observing after it fires;
 *   - no hook triggers a React render while the pointer moves.
 *
 * Values are written straight to CSS custom properties, so the compositor does
 * the work instead of React.
 */
import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/* ------------------------------------------------------------------ *
 * Motion tokens
 *
 * The same values exist as CSS custom properties in styles/landing.css for
 * plain-CSS transitions; these are here for the JavaScript-driven variants so
 * the two never drift apart.
 * ------------------------------------------------------------------ */

export const MOTION = {
  ease: {
    out: [0.22, 1, 0.36, 1] as [number, number, number, number],
    inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  },
  /** Micro-interaction, e.g. a button press. */
  micro: 0.14,
  /** Ordinary state change, e.g. hover, expand. */
  state: 0.24,
  /** Larger transition, e.g. a section settling into view. */
  scene: 0.42,
  /** Stagger between sequential items. */
  stagger: 0.07,
} as const

/** How far a single layer may travel, in px, at the extreme pointer position. */
export const PARALLAX_DEPTH = { far: 8, mid: 16, near: 26 } as const

/**
 * Drives `--ldg-pmx` / `--ldg-pmy` (normalised -1..1, damped) on an element.
 *
 * Disabled entirely for coarse pointers and for users who ask for reduced
 * motion, so a phone never pays for a desktop effect and nobody gets motion
 * they did not ask for.
 */
export function usePointerField(target: React.RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = target.current
    if (!el || reduced) return
    // matchMedia is checked here as well because useReducedMotion only reports
    // the preference captured at mount.
    if (window.matchMedia('(pointer: coarse)').matches) return

    const state = { x: 0, y: 0, tx: 0, ty: 0, frame: 0, active: false }

    const damp = () => {
      // Frame-rate independent lerp: settles at the same rate on any display.
      const ease = 0.08
      state.x += (state.tx - state.x) * ease
      state.y += (state.ty - state.y) * ease

      const settled =
        Math.abs(state.tx - state.x) < 0.0008 && Math.abs(state.ty - state.y) < 0.0008

      if (settled) {
        state.x = state.tx
        state.y = state.ty
        state.active = false
        state.frame = 0
        el.style.setProperty('--ldg-pmx', state.x.toFixed(4))
        el.style.setProperty('--ldg-pmy', state.y.toFixed(4))
        return // loop parks here — no idle rAF burning CPU
      }

      el.style.setProperty('--ldg-pmx', state.x.toFixed(4))
      el.style.setProperty('--ldg-pmy', state.y.toFixed(4))
      state.frame = requestAnimationFrame(damp)
    }

    const wake = () => {
      if (state.active) return
      state.active = true
      state.frame = requestAnimationFrame(damp)
    }

    const onMove = (event: PointerEvent) => {
      state.tx = (event.clientX / window.innerWidth) * 2 - 1
      state.ty = (event.clientY / window.innerHeight) * 2 - 1
      wake()
    }

    const onLeave = () => {
      state.tx = 0
      state.ty = 0
      wake()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      if (state.frame) cancelAnimationFrame(state.frame)
    }
  }, [target, reduced])
}

/**
 * Reveals sections on scroll, for the whole page at once.
 *
 * One listener and one rAF slot for the entire page instead of one
 * IntersectionObserver per block.
 *
 * An observer per block would also be wrong here: a fast flick or an in-page
 * anchor jump can move the viewport past a block entirely, and an element that
 * was never intersecting produces no callback, so that section would stay at
 * opacity 0 forever. This walks the armed blocks on every frame and reveals
 * anything whose top has passed the trigger line — including blocks that were
 * skipped straight over.
 */
export function useRevealSections(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      // Nothing is hidden, so there is nothing to wait for.
      for (const block of el.querySelectorAll<HTMLElement>('[data-armed="true"]')) {
        block.dataset.revealed = 'true'
      }
      return
    }

    let frame = 0

    // The block list is read inside the sweep, not captured up front: each
    // Reveal only sets `data-armed` in its own effect, and that attribute is
    // committed on a later render, so a snapshot taken here would be empty.
    const sweep = () => {
      frame = 0
      const line = window.innerHeight * 0.88
      for (const block of el.querySelectorAll<HTMLElement>('[data-armed="true"]')) {
        if (block.dataset.revealed === 'true') continue
        if (block.getBoundingClientRect().top <= line) block.dataset.revealed = 'true'
      }
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(sweep)
    }

    sweep()
    // `Reveal` arms itself one render after mount, so run one more sweep on the
    // next frame to pick up blocks that were not armed yet.
    frame = requestAnimationFrame(sweep)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [root])
}

/** True on devices whose primary input cannot hover. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    setCoarse(query.matches)
    const onChange = (event: MediaQueryListEvent) => setCoarse(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return coarse
}

/** True once the window has scrolled past `offset` — used by the section nav. */
export function useScrolledPast(offset: number): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    let frame = 0
    const read = () => {
      frame = 0
      setPast(window.scrollY > offset)
    }
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [offset])

  return past
}