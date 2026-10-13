/**
 * Ambient background: layered radial gradients, soft violet orbs and a very
 * subtle spatial texture. Purely decorative; respects prefers-reduced-motion.
 */

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

export function AmbientBackground() {
  const reducedMotion = useReducedMotion()
  const orbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reducedMotion) return
    const element = orbRef.current
    if (!element) return
    let frame = 0
    let start = 0
    const animate = (time: number) => {
      if (!start) start = time
      const elapsed = (time - start) / 1000
      element.style.transform = `translate3d(${Math.sin(elapsed * 0.12) * 18}px, ${Math.cos(elapsed * 0.1) * 14}px, 0)`
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  return (
    <div className="ves-ambient" aria-hidden="true">
      <div ref={orbRef} style={{ position: 'absolute', inset: 0 }}>
        <div className="ves-orb ves-orb-a" />
        <div className="ves-orb ves-orb-b" />
        <div className="ves-orb ves-orb-c" />
      </div>
    </div>
  )
}
