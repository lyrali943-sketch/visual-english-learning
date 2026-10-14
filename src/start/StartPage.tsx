/**
 * Product landing page.
 *
 * Renders on its own, outside the Visual English Studio shell and outside the
 * speaking app, so it can carry its own light palette without touching either
 * of them. It is reachable at /start and links to the two real product
 * entrances.
 *
 * Routes are plain anchors, which keeps navigation working without JavaScript.
 */
import { useRef } from 'react'

import { Backdrop } from './components/Backdrop'
import { StartNav } from './components/StartNav'
import { Hero } from './components/Hero'
import { ActTwo } from './components/ActTwo'
import { StudioDemo } from './components/StudioDemo'
import { SpeakingDemo } from './components/SpeakingDemo'
import { Closing, StartFooter } from './components/Closing'
import { usePointerField, useRevealSections } from './motion'
import './styles/landing.css'

const STUDIO_HREF = '/'
const SPEAKING_HREF = '/speaking'

export function StartPage() {
  const root = useRef<HTMLDivElement>(null)
  usePointerField(root)
  useRevealSections(root)

  return (
    <div className="ldg-root" ref={root}>
      <a className="ldg-skip" href="#act-context">
        Skip to content
      </a>

      <Backdrop />

      <StartNav studioHref={STUDIO_HREF} />

      <main className="ldg-main" id="main">
        <Hero studioHref={STUDIO_HREF} speakingHref={SPEAKING_HREF} />
        <ActTwo />
        <StudioDemo studioHref={STUDIO_HREF} />
        <SpeakingDemo speakingHref={SPEAKING_HREF} />
        <Closing studioHref={STUDIO_HREF} speakingHref={SPEAKING_HREF} />
      </main>

      <StartFooter />
    </div>
  )
}

export default StartPage