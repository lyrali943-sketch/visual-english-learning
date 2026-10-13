/**
 * Home — brand promise, primary calls to action and the sample poster.
 */

import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Bookmark,
  Camera,
  Download,
  Layers,
  PenLine,
  ScanEye,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import { StudioLink, useRouter } from '../router'
import { ScaledPoster } from '../poster/ScaledPoster'
import { SAMPLE_BOWL_PHOTO } from '../poster/samplePhoto'
import { createPoster } from '../services/posterFactory'
import { buildDemoContent } from '../services/demoContent'
import { useSession } from '../session/SessionProvider'

const SAMPLE_POSTER = createPoster({
  content: buildDemoContent('everyday', 'intermediate'),
  mode: 'everyday',
  difficulty: 'intermediate',
  photoDataUrl: SAMPLE_BOWL_PHOTO,
  source: 'demo',
})

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: 'Stays on your device', text: 'Photos are processed for your poster and saved locally. Nothing is published.' },
  { icon: Layers, title: 'Five learning modules', text: 'Vocabulary, phrases, sentence patterns, a model response and speaking prompts.' },
  { icon: Download, title: 'Print-ready export', text: 'High-resolution PNG of a 2:3 poster, ready for your notebook or wall.' },
]

const STEPS = [
  {
    icon: Camera,
    step: '01',
    title: 'Capture or upload',
    text: 'Photograph anything around you — a breakfast bowl, your desk, a coffee — or pick an existing photo.',
  },
  {
    icon: ScanEye,
    step: '02',
    title: 'AI reads the scene',
    text: 'Only what is really visible becomes vocabulary, phrases and patterns you can actually use.',
  },
  {
    icon: PenLine,
    step: '03',
    title: 'Edit and export',
    text: 'Tune every line on the poster, switch the visual theme, then save a high-resolution PNG.',
  },
]

const MODULES = [
  { num: '01', name: 'Vocabulary', note: 'Words from your photo' },
  { num: '02', name: 'Phrases', note: 'Natural, reusable chunks' },
  { num: '03', name: 'Sentence Patterns', note: 'Structures that transfer' },
  { num: '04', name: 'Model Response', note: 'A short model paragraph' },
  { num: '05', name: 'Speaking Challenge', note: 'Open questions to answer' },
]

export function HomePage() {
  const { navigate } = useRouter()
  const { loadPoster, demoMode } = useSession()
  const reducedMotion = useReducedMotion()

  const fade = useMemo(
    () =>
      reducedMotion
        ? {}
        : {
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.5, ease: [0.22, 0.8, 0.3, 1] as const },
          },
    [reducedMotion],
  )

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <section className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
        <motion.div {...fade}>
          <span className="ves-chip ves-chip-accent">
            <Sparkles size={13} strokeWidth={2} />
            AI visual vocabulary · from your own photos
          </span>
          <h1
            className="ves-display mt-6"
            style={{ fontSize: 'clamp(40px, 6.2vw, 62px)', color: 'var(--color-ves-text)' }}
          >
            Turn Your World
            <br />
            Into English.
          </h1>
          <p
            className="mt-5 max-w-[520px]"
            style={{ fontSize: 'clamp(16px, 1.6vw, 18.5px)', lineHeight: 1.62, color: 'var(--color-ves-muted)' }}
          >
            Capture a moment. Discover expressions. Create your own visual vocabulary journal.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" className="ves-btn ves-btn-primary ves-btn-lg" onClick={() => navigate('/upload')}>
              Create a Poster
              <ArrowRight size={18} strokeWidth={2.1} />
            </button>
            <StudioLink to="/library" className="ves-btn ves-btn-glass ves-btn-lg">
              <Bookmark size={17} strokeWidth={1.9} />
              My Library
            </StudioLink>
          </div>

          {demoMode ? (
            <p
              className="mt-5 max-w-[520px] rounded-2xl px-4 py-3 text-[13px] leading-relaxed"
              style={{
                color: 'var(--color-ves-muted)',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(167, 139, 250, 0.28)',
              }}
            >
              <strong style={{ color: 'var(--color-ves-lavender)' }}>Demo mode.</strong> No AI provider is configured yet, so
              the sample poster beside this text shows the full experience with clearly-labelled sample content.
            </p>
          ) : null}

          <ul className="mt-10 grid gap-5 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex flex-col gap-2">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    background: 'rgba(139, 92, 246, 0.14)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    color: 'var(--color-ves-violet)',
                  }}
                >
                  <item.icon size={17} strokeWidth={1.9} />
                </span>
                <span className="text-[14px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
                  {item.title}
                </span>
                <span className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Sample poster, presented like a printed piece on a dark worktable */}
        <motion.div
          {...(reducedMotion ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.1 } })}
          className="relative"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              inset: '-8% -6% 4% -6%',
              background: 'radial-gradient(60% 55% at 50% 45%, rgba(139, 92, 246, 0.28), transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <div className="ves-glass relative p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="ves-eyebrow">Sample poster</span>
              <span className="ves-chip">Everyday English · Intermediate</span>
            </div>
            <div className="ves-stage overflow-hidden rounded-2xl p-3 sm:p-5">
              <ScaledPoster poster={SAMPLE_POSTER} maxWidth={420} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[12.5px]" style={{ color: 'var(--color-ves-faint)' }}>
                “BUILD YOUR BOWL” — a poster made from a photo of a yogurt bowl.
              </span>
              <button
                type="button"
                className="ves-btn ves-btn-glass ves-btn-sm"
                onClick={() => {
                  loadPoster(SAMPLE_POSTER)
                  navigate('/editor')
                }}
              >
                Open the sample poster
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="mt-24">
        <h2 className="ves-eyebrow">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.step} className="ves-glass-soft p-6">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(109,93,251,0.9))',
                    color: '#fff',
                    boxShadow: '0 8px 20px -8px rgba(139, 92, 246, 0.8)',
                  }}
                >
                  <step.icon size={18} strokeWidth={1.9} />
                </span>
                <span
                  className="text-[13px] font-bold tracking-[0.2em]"
                  style={{ color: 'var(--color-ves-violet)' }}
                >
                  {step.step}
                </span>
              </div>
              <h3 className="mt-4 text-[16.5px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
                {step.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* The five modules */}
      <section className="mt-16">
        <h2 className="ves-eyebrow">Every poster teaches five things</h2>
        <div className="ves-glass mt-6 divide-y" style={{ borderColor: 'var(--color-ves-line)' }}>
          {MODULES.map((module) => (
            <div
              key={module.num}
              className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6"
              style={{ borderColor: 'var(--color-ves-line)' }}
            >
              <span
                className="text-[13px] font-bold tracking-[0.24em]"
                style={{ color: 'var(--color-ves-violet)', minWidth: 34 }}
              >
                {module.num}
              </span>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--color-ves-text)', minWidth: 210 }}>
                {module.name}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--color-ves-muted)' }}>
                {module.note}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
