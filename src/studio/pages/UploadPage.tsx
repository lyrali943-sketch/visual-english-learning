/**
 * Upload — real photo intake with drag & drop, camera capture, validation,
 * preview and the learning mode / difficulty choices.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Camera,
  CircleAlert,
  ImagePlus,
  RefreshCw,
  ScanEye,
  Trash2,
  Upload,
} from 'lucide-react'

import { useRouter } from '../router'
import { useSession } from '../session/SessionProvider'
import { PhotoError, preparePhoto } from '../services/imagePrep'
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, type DifficultyOption, type ModeOption } from '../types/poster'
import { Segmented } from '../components/Segmented'

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function UploadPage() {
  const { navigate } = useRouter()
  const { photo, setPhoto, mode, setMode, difficulty, setDifficulty, demoMode } = useSession()
  const reducedMotion = useReducedMotion()
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<{ message: string; hint?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Prevent the browser from navigating away when a file is dropped outside
  // the dropzone.
  useEffect(() => {
    const prevent = (event: DragEvent) => {
      if (!(event.target as HTMLElement | null)?.closest?.('[data-dropzone]')) event.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setPhoto(await preparePhoto(file))
    } catch (caught) {
      if (caught instanceof PhotoError) setError({ message: caught.message, hint: caught.hint })
      else setError({ message: 'That photo could not be processed. Please try another one.' })
    } finally {
      setBusy(false)
    }
  }

  const fade = reducedMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } }

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <motion.div {...fade}>
        <span className="ves-chip">
          <span style={{ color: 'var(--color-ves-violet)' }}>Step 1 of 3</span>
          <span style={{ color: 'var(--color-ves-faint)' }}>·</span>
          Photo
        </span>
        <h1 className="ves-display mt-4" style={{ fontSize: 'clamp(30px, 4.4vw, 42px)' }}>
          {photo ? 'Analyze Your Photo' : 'Add a photo to begin'}
        </h1>
        <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
          {photo
            ? 'Choose how you want to learn from this photo, then start the analysis.'
            : 'Photograph something around you — a meal, your desk, a street scene — or choose an existing photo.'}
        </p>
      </motion.div>

      {/* Upload / preview */}
      <motion.div {...(reducedMotion ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.05 } })} className="mt-8">
        {photo ? (
          <div className="ves-glass overflow-hidden">
            <div className="grid gap-0 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="relative flex items-center justify-center p-4" style={{ background: 'rgba(11, 7, 23, 0.45)' }}>
                <img
                  src={photo.previewDataUrl}
                  alt="Your uploaded photo"
                  style={{
                    maxHeight: 380,
                    maxWidth: '100%',
                    borderRadius: 16,
                    objectFit: 'contain',
                    boxShadow: '0 24px 50px -24px rgba(5, 2, 15, 0.9)',
                  }}
                />
              </div>
              <div className="flex flex-col gap-4 border-t p-6 sm:border-l sm:border-t-0" style={{ borderColor: 'var(--color-ves-line)' }}>
                <div>
                  <span className="ves-label">Selected photo</span>
                  <p className="text-[14.5px] font-semibold" style={{ color: 'var(--color-ves-text)', wordBreak: 'break-word' }}>
                    {photo.fileName}
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ves-muted)' }}>
                    {photo.width} × {photo.height} px · {formatSize(photo.fileSize)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ves-btn ves-btn-glass ves-btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw size={15} strokeWidth={1.9} />
                    Replace photo
                  </button>
                  <button
                    type="button"
                    className="ves-btn ves-btn-ghost ves-btn-sm"
                    onClick={() => setPhoto(null)}
                    style={{ color: 'var(--color-ves-danger)' }}
                  >
                    <Trash2 size={15} strokeWidth={1.9} />
                    Remove
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-ves-faint)' }}>
                  The photo is used for preview, analysis and the poster itself. It stays in this browser session until you
                  remove it or save a poster to your library.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            data-dropzone
            className="ves-dropzone flex flex-col items-center justify-center px-6 py-14 text-center"
            data-dragging={dragging}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void handleFiles(event.dataTransfer.files)
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            aria-label="Upload a photo"
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.9), rgba(109,93,251,0.9))',
                color: '#fff',
                boxShadow: '0 16px 40px -12px rgba(139, 92, 246, 0.85)',
              }}
            >
              <ImagePlus size={26} strokeWidth={1.8} />
            </span>
            <p className="mt-5 text-[16.5px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
              Drop a photo here, or click to choose
            </p>
            <p className="mt-2 text-[13.5px]" style={{ color: 'var(--color-ves-muted)' }}>
              JPEG, PNG, WebP or HEIC · up to 12 MB
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="ves-btn ves-btn-glass ves-btn-sm" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={15} strokeWidth={1.9} />
                Take a photo
              </button>
              <button type="button" className="ves-btn ves-btn-glass ves-btn-sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} strokeWidth={1.9} />
                Choose from library
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {busy ? (
        <p className="mt-4 flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--color-ves-muted)' }}>
          <RefreshCw size={15} className="animate-spin" style={{ animationDuration: '1.2s' }} />
          Preparing your photo…
        </p>
      ) : null}

      {error ? (
        <div
          className="mt-4 flex items-start gap-3 rounded-2xl p-4"
          role="alert"
          style={{
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.35)',
          }}
        >
          <CircleAlert size={18} strokeWidth={2} style={{ color: 'var(--color-ves-danger)', flex: 'none', marginTop: 1 }} />
          <div>
            <p className="text-[14px] font-semibold" style={{ color: '#FCA5A5' }}>
              {error.message}
            </p>
            {error.hint ? (
              <p className="mt-1 text-[13px]" style={{ color: 'var(--color-ves-muted)' }}>
                {error.hint}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Learning choices */}
      <section className="mt-10 grid gap-6">
        <div className="ves-glass-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
              Learning mode
            </h2>
            <span className="text-[12.5px]" style={{ color: 'var(--color-ves-faint)' }}>
              Shapes the vocabulary, register and examples
            </span>
          </div>
          <div className="mt-4">
            <Segmented
              name="Learning mode"
              options={MODE_OPTIONS.map((option: ModeOption) => ({ value: option.id, label: option.label, hint: option.hint }))}
              value={mode}
              onChange={setMode}
            />
          </div>
        </div>

        <div className="ves-glass-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
              Difficulty
            </h2>
            <span className="text-[12.5px]" style={{ color: 'var(--color-ves-faint)' }}>
              Adjusts sentence length and complexity
            </span>
          </div>
          <div className="mt-4">
            <Segmented
              name="Difficulty"
              options={DIFFICULTY_OPTIONS.map((option: DifficultyOption) => ({
                value: option.id,
                label: option.label,
                hint: option.hint,
              }))}
              value={difficulty}
              onChange={setDifficulty}
            />
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="ves-btn ves-btn-primary ves-btn-lg"
          disabled={!photo || busy}
          onClick={() => navigate('/analyze')}
        >
          <ScanEye size={18} strokeWidth={2} />
          Analyze My Photo
        </button>
        <span className="text-[13px]" style={{ color: 'var(--color-ves-faint)' }}>
          {photo ? 'Takes a few seconds.' : 'Add a photo first to continue.'}
        </span>
      </div>

      {demoMode ? (
        <p className="mt-6 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-ves-faint)' }}>
          Demo mode is active: no AI provider is configured, so analysis will produce clearly-labelled sample content instead
          of a real analysis of your photo.
        </p>
      ) : null}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
