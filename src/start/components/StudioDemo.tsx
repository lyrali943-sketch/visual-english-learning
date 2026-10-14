/**
 * Act three — an explorable slice of Visual English Studio.
 *
 * Real interaction, real state: hovering or focusing a phrase lights up the
 * objects that phrase actually uses, and clicking it opens the phrase's own
 * explanation and example. Clicking the same phrase again closes it; selecting
 * a different one switches the content.
 *
 * The content is the Studio's demo preset and its sample artwork, labelled as
 * such on screen. It is not an analysis of any uploaded photo.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, Layers } from 'lucide-react'

import { buildDemoContent } from '../../studio/services/demoContent'
import { SAMPLE_BOWL_PHOTO } from '../../studio/poster/samplePhoto'
import { ActHead, DemoNote, Reveal } from './Primitives'
import './../styles/landing.css'

const content = buildDemoContent('everyday', 'intermediate')

/** Only the first few phrases — enough to explore, not a wall of text. */
const PHRASES = content.phrases.slice(0, 4)
const OBJECTS = content.detectedObjects

/**
 * Which objects a phrase touches, matched by substring against the object
 * labels. This is the link the act is about: the phrase lights up the parts of
 * the scene it refers to.
 */
function objectsUsedBy(phrase: string): Set<string> {
  const needle = phrase.toLowerCase()
  const used = new Set<string>()
  for (const object of OBJECTS) {
    const label = object.label.toLowerCase()
    // "granola" matches "granola"; "fresh fruit" matches "strawberry"/"blueberry"/"fig"
    if (needle.includes(label)) used.add(object.label)
    else if (needle.includes('fruit') && /berry|fig/.test(label)) used.add(object.label)
  }
  return used
}

export function StudioDemo({ studioHref }: { studioHref: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  /** Hovering wins while it lasts, so the link stays visible on touch too. */
  const activeIndex = hoveredIndex ?? openIndex
  const linkedObjects = useMemo(
    () => (activeIndex === null ? new Set<string>() : objectsUsedBy(PHRASES[activeIndex].phrase)),
    [activeIndex],
  )

  return (
    <section className="ldg-section" id="act-studio">
      <div className="ldg-shell">
        <ActHead
          eyebrow="Act three"
          title={
            <>
              Visual English Studio turns a photo into
              <br />
              a set of usable English.
            </>
          }
          lede="Here is the same structure the product produces for a photo: the objects it can see, and the phrases that go with them. Hover a phrase to see which objects it uses, then open one to read its explanation and example sentence."
        />

        <div className="ldg-demo">
          <Reveal>
            <div className="ldg-scene">
              <img className="ldg-scene-img" src={SAMPLE_BOWL_PHOTO} alt="Sample illustration of a breakfast bowl with fruit and granola — the Studio's built-in sample artwork." />
              <div className="ldg-scene-tags">
                {OBJECTS.map((object) => (
                  <span
                    key={object.label}
                    className="ldg-tag"
                    data-linked={linkedObjects.has(object.label) ? 'true' : 'false'}
                  >
                    {object.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div>
              <p className="ldg-compare-head" style={{ marginBottom: '0.75rem' }}>
                <Layers size={14} aria-hidden="true" />
                Phrases for this scene
              </p>

              <div className="ldg-phrase-list">
                {PHRASES.map((phrase, index) => {
                  const open = openIndex === index
                  return (
                    <button
                      key={phrase.phrase}
                      type="button"
                      className="ldg-phrase"
                      aria-expanded={open}
                      onClick={() => setOpenIndex(open ? null : index)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(index)}
                      onBlur={() => setHoveredIndex(null)}
                    >
                      <span className="ldg-phrase-top">
                        <span className="ldg-phrase-text">{phrase.phrase}</span>
                        <span className="ldg-phrase-zh">{phrase.translation}</span>
                        <ChevronDown
                          size={16}
                          className="ldg-node-toggle"
                          aria-hidden="true"
                        />
                      </span>

                      <div className="ldg-expand" data-open={open ? 'true' : 'false'}>
                        <div className="ldg-expand-inner">
                          <span className="ldg-phrase-detail-inner" style={{ display: 'block' }}>
                            {phrase.explanation}
                            <span className="ldg-phrase-example">
                              {phrase.example}
                              {phrase.usageNote ? (
                                <>
                                  <br />
                                  <span>{phrase.usageNote}</span>
                                </>
                              ) : null}
                            </span>
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: '1.1rem' }}>
                <DemoNote>
                  Sample artwork and the built-in demo preset that ships with the Studio. This is an
                  interaction demo — no photo of yours was analysed to produce it.
                </DemoNote>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={140}>
          <div style={{ marginTop: '2rem' }}>
            <a className="ldg-btn ldg-btn-primary" href={studioHref}>
              Open Visual English Studio
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}