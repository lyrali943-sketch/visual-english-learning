/**
 * Act two — a word on its own, versus the same word in a scene.
 *
 * The left column is deliberately inert: plain words with no hover affordance
 * and no information. The right column uses the same three words inside a real
 * sentence, and selecting one reveals a gloss. Selecting a word on either side
 * highlights the same word on the other, which is the whole point of the act.
 *
 * Nothing here is invented content — the sentence, glosses and Chinese come
 * from the Studio's own demo preset, which is also what the product shows on
 * its home page.
 */
import { useState } from 'react'
import { Link2 } from 'lucide-react'

import { buildDemoContent } from '../../studio/services/demoContent'
import { ActHead, DemoNote, Reveal } from './Primitives'
import './../styles/landing.css'

/** Pins the demo preset so the words shown here always match the product. */
const content = buildDemoContent('everyday', 'intermediate')
const vocabByTerm = new Map(content.vocabulary.map((item) => [item.term, item]))

const FOCUS = [
  { word: 'yogurt', slot: 'yogurt', use: 'the base of the bowl is named before anything is added to it' },
  { word: 'granola', slot: 'granola', use: 'it takes a verb and a quantity: “add a handful of granola”' },
  { word: 'blueberry', slot: 'blueberries', use: 'it can be counted and replaced: “a few blueberries on top”' },
] as const

type FocusWord = (typeof FOCUS)[number]['word']

export function ActTwo() {
  const [selected, setSelected] = useState<FocusWord | null>('granola')

  const active = FOCUS.find((entry) => entry.word === selected) ?? null
  const activeVocab = active ? vocabByTerm.get(active.word) : undefined

  const toggle = (word: FocusWord) => setSelected((current) => (current === word ? null : word))

  return (
    <section className="ldg-section" id="act-context">
      <div className="ldg-shell">
        <ActHead
          eyebrow="Act two"
          title={
            <>
              A word on its own teaches you almost nothing.
              <br />A word in a scene gives you a sentence.
            </>
          }
          lede="Three real words from the Studio's own demo bowl. On the left they are a list you have to recall from memory. On the right the same words sit inside a sentence you could say today. Pick a word to see what changes."
        />

        <div className="ldg-compare">
          <Reveal>
            <div className="ldg-compare-col" data-tone="muted" style={{ height: '100%' }}>
              <p className="ldg-compare-head">Isolated</p>

              <div className="ldg-dead-words">
                {FOCUS.map((entry) => (
                  <button
                    key={entry.word}
                    type="button"
                    className="ldg-dead-word"
                    onClick={() => toggle(entry.word)}
                    aria-pressed={selected === entry.word}
                  >
                    {entry.word}
                  </button>
                ))}
              </div>

              <p className="ldg-planned-text" style={{ marginTop: '1.15rem' }}>
                Three words and three translations, with no relationship between them. You would have
                to remember all three before you could use any one.
              </p>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <div className="ldg-compare-col" data-tone="live" style={{ height: '100%' }}>
              <p className="ldg-compare-head">
                <Link2 size={14} aria-hidden="true" />
                In context
              </p>

              <p className="ldg-sentence">
                I started with a bowl of{' '}
                <button
                  type="button"
                  className="ldg-slot"
                  aria-pressed={selected === 'yogurt'}
                  onClick={() => toggle('yogurt')}
                >
                  yogurt
                </button>
                , then I decided to{' '}
                <span style={{ color: 'var(--ldg-ink)' }}>add a handful of</span>{' '}
                <button
                  type="button"
                  className="ldg-slot"
                  aria-pressed={selected === 'granola'}
                  onClick={() => toggle('granola')}
                >
                  granola
                </button>{' '}
                and a few{' '}
                <button
                  type="button"
                  className="ldg-slot"
                  aria-pressed={selected === 'blueberry'}
                  onClick={() => toggle('blueberry')}
                >
                  blueberries
                </button>{' '}
                on top.
              </p>

              <div className="ldg-gloss">
                {/* Re-keyed so the swap animation replays on every change;
                    there is no exit animation to strand an element. */}
                {active && activeVocab ? (
                  <div key={active.word} className="ldg-swap">
                    <p className="ldg-gloss-term">
                      {active.word}
                      <span className="ldg-gloss-zh">{activeVocab.translation}</span>
                    </p>
                    <p className="ldg-gloss-body">{activeVocab.explanation}</p>
                    <p className="ldg-gloss-body" style={{ marginTop: '0.5rem' }}>
                      In this sentence, <em>{active.use}</em>.
                    </p>
                  </div>
                ) : (
                  <p key="empty" className="ldg-swap ldg-gloss-body">
                    Select a word above to see its meaning and how it is used here.
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div style={{ marginTop: '1.25rem' }}>
            <DemoNote>
              The bowl, the five objects and the phrase “add a handful of granola” come from the
              Studio's built-in demo preset — the same sample shown on the Studio home page. Nothing
              here was analysed from a photo you uploaded.
            </DemoNote>
          </div>
        </Reveal>
      </div>
    </section>
  )
}