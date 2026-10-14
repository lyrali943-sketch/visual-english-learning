/**
 * Act four — how Speaking Practice thinks before you answer.
 *
 * The emphasis is the reasoning structure, not a model answer. Each step is a
 * button that expands its own panel; selecting a different step switches the
 * content, and selecting the open one closes it.
 *
 * The question is a real one from the project's own topic bank. What each step
 * produces is described structurally — this is an illustration of the flow, not
 * a captured AI analysis, and it never claims the coach was run.
 */
import { useState } from 'react'
import { Brain, ListChecks, GitBranch, Languages, MessageSquare, ArrowRight } from 'lucide-react'

import { TOPICS } from '../../data/topics'
import { ActHead, DemoNote, Reveal } from './Primitives'
import './../styles/landing.css'

/** A genuine question from src/data/topics.ts. */
const QUESTION = TOPICS.find((topic) => topic.id === TOPICS[14].id) ?? TOPICS[14]

const STEPS = [
  {
    id: 'question',
    name: 'Question',
    icon: Brain,
    body: [
      'A real TOEFL-style prompt with a preparation timer and a speaking timer.',
      'You can draw a random question, switch to another one, or pick from a topic bank by category and type.',
    ],
  },
  {
    id: 'analysis',
    name: 'Analysis',
    icon: ListChecks,
    body: [
      'The coach first works out what the task actually demands: the task type, the core question, the requirements a strong answer has to meet, and the limits to watch.',
      'This is the part that stops you answering the wrong question well.',
    ],
  },
  {
    id: 'arguments',
    name: 'Arguments',
    icon: GitBranch,
    body: [
      'Two clearly different lines of argument, each with a title, an explanation, and one invented practice scenario.',
      'Scenarios are always labelled as invented, so an illustration can never be mistaken for a real study.',
    ],
  },
  {
    id: 'language',
    name: 'Language',
    icon: Languages,
    body: [
      'Key expressions, sentence patterns and vocabulary collected for this question type.',
      'Read them after you have answered, so the recording stays your own words first.',
    ],
  },
  {
    id: 'answer',
    name: 'Model answer',
    icon: MessageSquare,
    body: [
      'An optional full response you can expand and compare against what you said.',
      'It is a reference, not a script — and you also record yourself and self-rate.',
    ],
  },
] as const

export function SpeakingDemo({ speakingHref }: { speakingHref: string }) {
  const [openStep, setOpenStep] = useState<string | null>('arguments')

  return (
    <section className="ldg-section" id="act-speaking">
      <div className="ldg-shell">
        <ActHead
          eyebrow="Act four"
          title={
            <>
              Speaking practice that helps you
              <br />
              think before you talk.
            </>
          }
          lede="The useful part of an answer is decided before you open your mouth. Pick a step to see what the coach produces for one real question from the topic bank."
        />

        <div className="ldg-steps">
          {STEPS.map((step, index) => {
            const open = openStep === step.id
            const Icon = step.icon
            return (
              <Reveal key={step.id} delay={index * 55}>
                <button
                  type="button"
                  className="ldg-step"
                  aria-expanded={open}
                  onClick={() => setOpenStep(open ? null : step.id)}
                >
                  <span className="ldg-step-num">STEP {index + 1}</span>
                  <span className="ldg-step-name">{step.name}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'block',
                      marginTop: '0.45rem',
                      color: open ? 'var(--ldg-blue)' : 'var(--ldg-ink-3)',
                    }}
                  >
                    <Icon size={15} />
                  </span>
                </button>
              </Reveal>
            )
          })}
        </div>

        <div className="ldg-panel">
          {/* Re-keyed on the selected step so the swap animation replays;
              there is no exit animation that could strand an element. */}
          <div key={openStep ?? 'none'} className="ldg-swap">
            {openStep === null ? (
              <p className="ldg-gloss-body">Choose a step above to see what it produces.</p>
            ) : openStep === 'question' ? (
              <>
                <span className="ldg-chip ldg-chip-accent">Real question from the topic bank</span>
                <p className="ldg-panel-question" style={{ marginTop: '0.75rem' }}>
                  {QUESTION.question}
                </p>
                <ul className="ldg-panel-list">
                  <li className="ldg-panel-item">
                    <span aria-hidden="true">•</span>
                    <span>
                      <b>
                        {QUESTION.preparationTime}s to prepare, then {QUESTION.speakingTime}s
                      </b>
                      of uninterrupted speaking time.
                    </span>
                  </li>
                  <li className="ldg-panel-item">
                    <span aria-hidden="true">•</span>
                    <span>
                      <b>Microphone recording</b>
                      Your voice is recorded in the browser and never leaves the device.
                    </span>
                  </li>
                </ul>
              </>
            ) : (
              <>
                <p className="ldg-panel-question" style={{ fontSize: '1.05rem' }}>
                  {STEPS.find((step) => step.id === openStep)?.name}
                </p>
                <ul className="ldg-panel-list">
                  {STEPS.find((step) => step.id === openStep)?.body.map((line) => (
                    <li key={line} className="ldg-panel-item">
                      <span aria-hidden="true">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <DemoNote>
              The question above is real, taken from the app's own topic bank. The descriptions show
              the shape of each step — this panel is an illustration of the flow, not a captured AI
              analysis, and no coach request was made to build it.
            </DemoNote>
          </div>
        </div>

        <Reveal delay={120}>
          <div style={{ marginTop: '2rem' }}>
            <a className="ldg-btn ldg-btn-primary" href={speakingHref}>
              Start Speaking Practice
              <ArrowRight size={17} className="ldg-btn-icon" aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}