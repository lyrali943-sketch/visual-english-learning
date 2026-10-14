/**
 * Act five — what exists today, what is coming, and the two ways in.
 *
 * Both entrances are real routes. The "Planned" cards are deliberately marked
 * and are not links, so an unbuilt module can never look available.
 */
import { ArrowRight, Headphones, BookText, PenLine, BookMarked, Sparkles } from 'lucide-react'

import { ActHead, Reveal } from './Primitives'
import './../styles/landing.css'

const PLANNED = [
  { icon: Headphones, name: 'Listening', text: 'Short audio tasks built from the same scenes and patterns.' },
  { icon: BookText, name: 'Reading', text: 'Texts sized to the level you are actually working at.' },
  { icon: PenLine, name: 'Writing', text: 'Draft a response, then compare it against your own patterns.' },
  { icon: BookMarked, name: 'Vocabulary', text: 'Everything you have saved, in one reviewable set.' },
]

export function Closing({ studioHref, speakingHref }: { studioHref: string; speakingHref: string }) {
  return (
    <section className="ldg-section" id="act-start">
      <div className="ldg-shell">
        <ActHead
          eyebrow="Act five"
          align="center"
          title="Two things you can use right now."
          lede="Both are built, both work in your browser, and neither needs an account."
        />

        <div className="ldg-planned" style={{ marginBottom: 'clamp(2rem, 4vw, 3rem)' }}>
          {PLANNED.map((module, index) => {
            const Icon = module.icon
            return (
              <Reveal key={module.name} delay={index * 55}>
                <div className="ldg-planned-card" style={{ height: '100%' }}>
                  <p className="ldg-planned-name">
                    <Icon size={16} aria-hidden="true" />
                    {module.name}
                    <span className="ldg-chip ldg-chip-planned">Planned</span>
                  </p>
                  <p className="ldg-planned-text">{module.text}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal>
          <div className="ldg-cta">
            <div style={{ textAlign: 'center' }}>
              <span className="ldg-eyebrow" style={{ justifyContent: 'center' }}>
                <Sparkles size={13} aria-hidden="true" />
                Start here
              </span>
              <h2 className="ldg-h2" style={{ marginTop: '0.8rem' }}>
                Pick the one that matches what you need today.
              </h2>
              <p className="ldg-lede" style={{ marginInline: 'auto' }}>
                Learn the words for things you can see, or practise how to argue a point out loud.
                You can start either way.
              </p>
            </div>

            <div className="ldg-cta-grid">
              <a className="ldg-cta-card" href={studioHref}>
                <span className="ldg-cta-name">Explore Visual Learning</span>
                <span className="ldg-cta-text">
                  Photograph something ordinary and get vocabulary, phrases and sentence patterns
                  tied to it. Posters are saved locally in your browser.
                </span>
                <span className="ldg-btn ldg-btn-primary">
                  Open Visual English Studio
                  <ArrowRight size={16} className="ldg-btn-icon" aria-hidden="true" />
                </span>
              </a>

              <a className="ldg-cta-card" href={speakingHref}>
                <span className="ldg-cta-name">Start Speaking Practice</span>
                <span className="ldg-cta-text">
                  Answer a real TOEFL-style question with preparation time, recording, self-rating
                  and a coaching breakdown of the question.
                </span>
                <span className="ldg-btn ldg-btn-secondary">
                  Go to Speaking Practice
                  <ArrowRight size={16} className="ldg-btn-icon" aria-hidden="true" />
                </span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function StartFooter() {
  return (
    <footer className="ldg-footer">
      <div className="ldg-shell">
        <div className="ldg-footer-inner">
          <span>Visual English Studio — posters and recordings stay on your device.</span>
          <span style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/">Visual Studio</a>
            <a href="/speaking">Speaking Practice</a>
          </span>
        </div>
      </div>
    </footer>
  )
}