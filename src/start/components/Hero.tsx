/**
 * Act one — the hero.
 *
 * The right-hand card is a real three-step chain: each node is a button that
 * expands and collapses its own explanation, and only one is open at a time so
 * the card never grows without bound. Keyboard and touch both work because the
 * nodes are ordinary buttons — nothing depends on hover.
 */
import { useState } from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'

import './../styles/landing.css'

const NODES = [
  {
    id: 'context',
    title: 'Visual context',
    hint: 'A photo of something you actually did today.',
    body: [
      'You photograph an ordinary moment — a breakfast bowl, your desk, a street you walk every day. Nothing is staged and nothing has to be interesting.',
      'The scene is the anchor. Every word that follows has somewhere to come back to, which is exactly what a bare word list lacks.',
    ],
  },
  {
    id: 'patterns',
    title: 'Language patterns',
    hint: 'Only what the scene actually supports.',
    body: [
      'Vocabulary, phrases, sentence frames and a model response — each one tied to something visible, with an explanation and a sentence you could reuse tomorrow.',
      'The point is not more words. It is knowing which word goes with which thing, and how to put it into a sentence.',
    ],
  },
  {
    id: 'expression',
    title: 'Confident expression',
    hint: 'Turn the picture into something you can say.',
    body: [
      'The last step is use: describe what you see, argue a position about it, and answer a question in your own words.',
      'That is the loop the whole product is built around — see it, learn the pattern, say it out loud.',
    ],
  },
] as const

const FLOATERS = [
  { text: 'top it with', className: 'ldg-floater-a' },
  { text: 'a handful of', className: 'ldg-floater-b' },
  { text: 'a hint of', className: 'ldg-floater-c' },
] as const

export function Hero({ studioHref, speakingHref }: { studioHref: string; speakingHref: string }) {
  const [openNode, setOpenNode] = useState<string | null>('context')

  // Entrance order is carried by --ldg-enter-step and driven entirely in CSS,
  // so the copy is visible even if the animation never runs.
  const step = (n: number) => ({ '--ldg-enter-step': n } as React.CSSProperties)

  return (
    <section className="ldg-hero" id="top">
      <div className="ldg-shell">
        <div className="ldg-hero-grid">
          <div className="ldg-enter">
            <p className="ldg-eyebrow" style={step(0)}>
              Visual English Studio
            </p>

            <h1 className="ldg-hero-title" style={step(1)}>
              Learn with context.
              <em>Think in English.</em>
            </h1>

            <p className="ldg-hero-sub" style={step(2)}>
              Build stronger language skills through visual learning, structured practice, and
              AI-guided reasoning.
            </p>

            <div className="ldg-btn-row" style={{ ...step(3), marginTop: '2rem' }}>
              <a className="ldg-btn ldg-btn-primary" href={studioHref}>
                Explore Visual Learning
                <ArrowRight size={17} className="ldg-btn-icon" aria-hidden="true" />
              </a>
              <a className="ldg-btn ldg-btn-secondary" href={speakingHref}>
                Start Speaking Practice
                <ArrowRight size={17} className="ldg-btn-icon" aria-hidden="true" />
              </a>
            </div>

            <div className="ldg-hero-meta" style={step(4)}>
              <span className="ldg-chip ldg-chip-accent">Visual journal</span>
              <span className="ldg-chip">Speaking practice</span>
              <span className="ldg-chip">Runs in your browser</span>
            </div>
          </div>

          {/* The chain card. The wrapper is the positioning context for the
              floating tags, so their offsets are measured against this column
              rather than the full-width hero. */}
          <div className="ldg-enter" style={{ ...step(2), position: 'relative' }}>
            <div className="ldg-floaters" aria-hidden="true">
              {FLOATERS.map((floater) => (
                <span key={floater.text} className={`ldg-floater ${floater.className}`}>
                  {floater.text}
                </span>
              ))}
            </div>

            <div className="ldg-chain ldg-card-glass" style={{ position: 'relative' }}>
              <div className="ldg-chain-head">
                <span className="ldg-chain-title">How a word becomes usable</span>
                <span className="ldg-chip">3 steps</span>
              </div>

              <ol style={{ listStyle: 'none', margin: 0, padding: '0.95rem 0 0' }}>
                {NODES.map((node, index) => {
                  const open = openNode === node.id
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        className="ldg-node"
                        aria-expanded={open}
                        onClick={() => setOpenNode(open ? null : node.id)}
                      >
                        <span className="ldg-node-index" aria-hidden="true">
                          {index + 1}
                        </span>

                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span className="ldg-node-label">{node.title}</span>
                          <span className="ldg-node-hint">{node.hint}</span>
                        </span>

                        <ChevronDown
                          size={17}
                          className="ldg-node-toggle"
                          aria-hidden="true"
                        />
                      </button>

                      <div className="ldg-expand" data-open={open ? 'true' : 'false'}>
                        <div className="ldg-expand-inner">
                          <div className="ldg-node-detail ldg-node-body">
                            {node.body.map((paragraph) => (
                              <p key={paragraph}>{paragraph}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}