/**
 * Analysis — the real, staged pipeline with honest progress feedback.
 * No fake percentages: each label corresponds to an actual stage of the
 * pipeline (image → identification → content → layout).
 */

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  LoaderCircle,
  ScanEye,
  Sparkles,
  Utensils,
} from 'lucide-react'

import { useRouter } from '../router'
import { useSession } from '../session/SessionProvider'
import { ANALYSIS_STEPS } from '../services/posterPipeline'
import { MODE_OPTIONS, DIFFICULTY_OPTIONS } from '../types/poster'

export function AnalysisPage() {
  const { navigate } = useRouter()
  const { photo, analysis, runAnalysis, continueWithSample, demoMode, mode, difficulty, cancelAnalysis } = useSession()
  const reducedMotion = useReducedMotion()
  const startedRef = useRef(false)

  useEffect(() => {
    if (!photo) {
      navigate('/upload')
      return
    }
    if (startedRef.current) return
    startedRef.current = true
    /* `runAnalysis` rejects on failure, but the failure is already rendered by
       the `analysis.status === 'error'` panel below. Without this catch every
       failed run also logged "Uncaught (in promise) AiServiceError", duplicating
       an error the user can already see and act on. */
    void runAnalysis()
      .then(() => {
        if (window.location.pathname === '/analyze') navigate('/editor')
      })
      .catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => cancelAnalysis(), [cancelAnalysis])

  const running = analysis.status === 'running'
  const failed = analysis.status === 'error'
  const stepIndex = running ? Math.max(0, analysis.step) : -1

  const modeLabel = MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode
  const difficultyLabel = DIFFICULTY_OPTIONS.find((option) => option.id === difficulty)?.label ?? difficulty

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <button type="button" className="ves-btn ves-btn-ghost ves-btn-sm -ml-3" onClick={() => navigate('/upload')}>
        <ArrowLeft size={15} strokeWidth={2} />
        Back to photo
      </button>

      <div className="mt-6 text-center">
        <span className="ves-chip">
          <span style={{ color: 'var(--color-ves-violet)' }}>Step 2 of 3</span>
          <span style={{ color: 'var(--color-ves-faint)' }}>·</span>
          Analysis
        </span>
        <h1 className="ves-display mt-4" style={{ fontSize: 'clamp(28px, 4vw, 38px)' }}>
          Reading your moment
        </h1>
        <p className="mx-auto mt-3 max-w-[520px] text-[14.5px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
          {modeLabel} · {difficultyLabel}
          {demoMode ? ' · sample content (demo mode)' : ''}
        </p>
      </div>

      {/* Photo with a restrained scanning highlight */}
      {photo ? (
        <div className="ves-glass relative mt-8 overflow-hidden p-3">
          <div className="ves-photo-well relative overflow-hidden rounded-2xl">
            <img
              src={photo.previewDataUrl}
              alt="The photo being analysed"
              style={{ display: 'block', width: '100%', maxHeight: 340, objectFit: 'contain' }}
            />
            {running ? (
              <div
                aria-hidden="true"
                className="ves-scan"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: 120,
                  background:
                    'linear-gradient(180deg, transparent, rgba(47, 95, 224, 0.16) 55%, rgba(96, 165, 250, 0.42) 92%, transparent)',
                  borderBottom: '1.5px solid rgba(96, 165, 250, 0.85)',
                }}
              />
            ) : null}
          </div>
          {analysis.objects.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 px-2 pb-1 pt-4">
              <span className="ves-eyebrow" style={{ marginRight: 4 }}>
                Found in your photo
              </span>
              {analysis.objects.map((object) => (
                <span className="ves-chip" key={object.label}>
                  <Utensils size={12} strokeWidth={2} style={{ color: 'var(--color-ves-violet)' }} />
                  {object.label}
                  <span style={{ color: 'var(--color-ves-faint)' }}>{object.translation}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Steps */}
      <ol className="mt-8 grid gap-3">
        {ANALYSIS_STEPS.map((step, index) => {
          const isActive = running && index === stepIndex
          const isDone = (running && index < stepIndex) || analysis.status === 'done'
          const isFailed = failed && index === Math.max(0, analysis.step)
          return (
            <li
              key={step.id}
              className="flex items-center gap-4 rounded-2xl px-5 py-4"
              style={{
                background: isActive ? 'var(--color-ves-accent-tint)' : 'rgba(255, 255, 255, 0.7)',
                border: `1px solid ${isActive ? 'var(--color-ves-accent-edge-strong)' : 'var(--color-ves-line)'}`,
                boxShadow: isActive ? 'var(--color-ves-shadow-soft)' : 'none',
                opacity: isActive || isDone || isFailed ? 1 : 0.62,
                transition: 'opacity 0.3s ease, background 0.3s ease, border-color 0.3s ease',
              }}
            >
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                style={{
                  background: isDone
                    ? 'rgba(20, 122, 82, 0.12)'
                    : isActive
                      ? 'var(--color-ves-accent-fill)'
                      : 'rgba(255, 255, 255, 0.8)',
                  color: isDone ? 'var(--color-ves-success)' : '#fff',
                  border: isDone || isActive ? 'none' : '1px solid var(--color-ves-line-strong)',
                }}
              >
                {isDone ? (
                  <Check size={16} strokeWidth={2.6} />
                ) : isActive ? (
                  <LoaderCircle size={16} strokeWidth={2.4} className={reducedMotion ? undefined : 'ves-spin'} />
                ) : (
                  <span className="text-[12px] font-semibold" style={{ color: 'var(--color-ves-faint)' }}>
                    {index + 1}
                  </span>
                )}
              </span>
              <span className="flex-1">
                <span
                  className="block text-[15px] font-semibold"
                  style={{ color: isFailed ? 'var(--color-ves-danger)' : 'var(--color-ves-text)' }}
                >
                  {isFailed && analysis.error ? analysis.error : step.label}
                </span>
                <span className="mt-0.5 block text-[12.5px]" style={{ color: 'var(--color-ves-faint)' }}>
                  {step.detail}
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      {/* Demo notice */}
      {demoMode ? (
        <div
          className="mt-6 flex items-start gap-3 rounded-2xl p-4"
          style={{
            background: 'var(--color-ves-accent-tint)',
            border: '1px solid var(--color-ves-accent-edge)',
          }}
        >
          <Sparkles size={17} strokeWidth={2} style={{ color: 'var(--color-ves-accent-on-tint)', flex: 'none', marginTop: 1 }} />
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
            <strong style={{ color: 'var(--color-ves-accent-on-tint)' }}>Demo mode.</strong> No AI provider is configured, so the
            steps above run against a fixed sample (a yogurt-bowl lesson) instead of a real analysis of your photo. The
            poster is marked “Demo sample”. Configure an AI provider in <code>.env</code> to analyse your own photos.
          </p>
        </div>
      ) : null}

      {/* Failure */}
      {failed ? (
        <motion.div
          {...(reducedMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } })}
          className="mt-6 rounded-2xl p-5"
          role="alert"
          style={{ background: 'rgba(192, 52, 44, 0.07)', border: '1px solid rgba(192, 52, 44, 0.28)' }}
        >
          <div className="flex items-start gap-3">
            <CircleAlert size={19} strokeWidth={2} style={{ color: 'var(--color-ves-danger)', flex: 'none', marginTop: 1 }} />
            <div className="flex-1">
              <p className="text-[15px] font-semibold" style={{ color: 'var(--color-ves-danger)' }}>
                The poster could not be created.
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
                {analysis.error ?? 'Please try again.'}
              </p>
              {analysis.errorDetail ? (
                <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-ves-faint)' }}>
                  {analysis.errorDetail}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="ves-btn ves-btn-primary ves-btn-sm" onClick={() => void runAnalysis()}>
              <ScanEye size={15} strokeWidth={2} />
              Try again
            </button>
            {!demoMode ? (
              <button
                type="button"
                className="ves-btn ves-btn-glass ves-btn-sm"
                /* Recovery must land somewhere. This button is only reachable
                   after the mount effect has already run, so the `navigate`
                   in that effect will not fire again — without this the sample
                   analysis completes and the user is stranded on /analyze. */
                onClick={() => void continueWithSample().then(() => navigate('/editor'))}
              >
                <Sparkles size={15} strokeWidth={2} />
                Continue with sample content
              </button>
            ) : null}
            <button type="button" className="ves-btn ves-btn-ghost ves-btn-sm" onClick={() => navigate('/upload')}>
              Choose a different photo
            </button>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
