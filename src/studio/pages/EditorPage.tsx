/**
 * Poster editor — the creative workspace.
 *
 * Desktop:  navigation rail  |  poster canvas  |  content panel
 * Tablet:   poster canvas    |  content panel
 * Phone:    one column, with a Preview / Edit switch and a sticky action bar
 *
 * Everything edited here updates the live poster immediately, and the same
 * DOM node is used for the high-resolution PNG export.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  Bookmark,
  CircleAlert,
  Download,
  Eye,
  Home,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  SquarePen,
  Trash2,
} from 'lucide-react'

import { StudioLink, useRouter } from '../router'
import { ScaledPoster } from '../poster/ScaledPoster'
import { useSession } from '../session/SessionProvider'
import { blobToDataUrl, downloadBlob, posterNodeToBlob, posterNodeToPngBlob, slugifyFileName } from '../services/posterExport'
import type { PosterModule } from '../services/aiClient'
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, POSTER_THEMES } from '../types/poster'
import type { PosterContent } from '../types/poster'

const EXPORT_SCALES = [
  { value: 2, label: '1600 × 2400', note: 'Standard HD' },
  { value: 3, label: '2400 × 3600', note: 'Print quality' },
]

type EditableListKey = 'vocabulary' | 'phrases' | 'sentencePatterns' | 'speakingChallenges'

const MODULE_TITLES: Record<string, string> = {
  vocabulary: '01 · Vocabulary',
  phrases: '02 · Phrases',
  sentencePatterns: '03 · Sentence Patterns',
  modelResponse: '04 · Model Response',
  speakingChallenges: '05 · Speaking Challenge',
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EditorPage() {
  const { route, back } = useRouter()
  const {
    poster,
    updateContent,
    setTheme,
    setImageAdjust,
    savePoster,
    regenerateAll,
    regenerateModule,
    busyModule,
    demoMode,
    openPosterFromLibrary,
    notice,
    setNotice,
  } = useSession()
  const reducedMotion = useReducedMotion()
  const posterRef = useRef<HTMLDivElement>(null)

  const [mobileView, setMobileView] = useState<'preview' | 'edit'>('preview')
  const [exportScale, setExportScale] = useState(2)
  const [exporting, setExporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const routeId = route.name === 'editor' ? route.params.id : undefined

  // Open a poster straight from the library (/editor/:id).
  const needsLibraryLoad = Boolean(routeId) && poster?.id !== routeId
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!routeId || poster?.id === routeId) return
    let alive = true
    openPosterFromLibrary(routeId).catch((error: unknown) => {
      if (alive) setLoadError(error instanceof Error ? error.message : 'That poster could not be opened.')
    })
    return () => {
      alive = false
    }
  }, [routeId, poster?.id, openPosterFromLibrary])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice, setNotice])

  const handleExport = useCallback(async () => {
    const node = posterRef.current
    if (!node || !poster) return
    setExporting(true)
    setActionError(null)
    try {
      const blob = await posterNodeToPngBlob(node, { scale: exportScale })
      downloadBlob(blob, `${slugifyFileName(poster.content.title)}-${POSTER_EXPORT_SIZE(exportScale)}.png`)
      setNotice('Poster exported as PNG.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The poster could not be exported.')
    } finally {
      setExporting(false)
    }
  }, [poster, exportScale, setNotice])

  const handleSave = useCallback(async () => {
    const node = posterRef.current
    if (!node || !poster) return
    setSaving(true)
    setActionError(null)
    try {
      // A small JPEG keeps the library lightweight (PNG would be ~10x larger).
      const thumbBlob = await posterNodeToBlob(node, { scale: 0.3, mimeType: 'image/jpeg', quality: 0.78 })
      await savePoster(await blobToDataUrl(thumbBlob))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The poster could not be saved.')
    } finally {
      setSaving(false)
    }
  }, [poster, savePoster])

  const updateListItem = useCallback(
    (key: EditableListKey, index: number, patch: Record<string, unknown>) => {
      if (!poster) return
      const list = [...(poster.content[key] as unknown as Record<string, unknown>[])]
      if (!list[index]) return
      list[index] = { ...list[index], ...patch }
      updateContent({ [key]: list } as unknown as Partial<PosterContent>)
    },
    [poster, updateContent],
  )

  const addListItem = useCallback(
    (key: EditableListKey, empty: Record<string, unknown>) => {
      if (!poster) return
      const list = [...(poster.content[key] as unknown as Record<string, unknown>[]), empty]
      updateContent({ [key]: list } as unknown as Partial<PosterContent>)
    },
    [poster, updateContent],
  )

  const removeListItem = useCallback(
    (key: EditableListKey, index: number) => {
      if (!poster) return
      const list = [...(poster.content[key] as unknown as Record<string, unknown>[])]
      if (list.length <= 1) return
      list.splice(index, 1)
      updateContent({ [key]: list } as unknown as Partial<PosterContent>)
    },
    [poster, updateContent],
  )

  const regenerate = useCallback(
    (module: PosterModule) => {
      setActionError(null)
      void regenerateModule(module).catch((error: unknown) =>
        setActionError(error instanceof Error ? error.message : 'That module could not be regenerated.'),
      )
    },
    [regenerateModule],
  )

  if (needsLibraryLoad && !poster) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="flex items-center gap-3 text-[15px]" style={{ color: 'var(--color-ves-muted)' }}>
          <LoaderCircle size={18} className="ves-spin" style={{ color: 'var(--color-ves-violet)' }} />
          Opening your poster…
        </span>
      </div>
    )
  }

  if (!poster) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[560px] flex-col items-center justify-center px-5 text-center">
        <h1 className="ves-display text-[28px]">No poster open</h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
          {actionError ?? loadError ?? 'Start by adding a photo, or open a saved poster from your library.'}
        </p>
        <div className="mt-6 flex gap-3">
          <StudioLink to="/upload" className="ves-btn ves-btn-primary">
            <Sparkles size={16} strokeWidth={2} />
            Create a Poster
          </StudioLink>
          <StudioLink to="/library" className="ves-btn ves-btn-glass">
            <Bookmark size={16} strokeWidth={2} />
            My Library
          </StudioLink>
        </div>
      </div>
    )
  }

  const content = poster.content
  const modeLabel = MODE_OPTIONS.find((option) => option.id === poster.mode)?.label ?? poster.mode
  const difficultyLabel = DIFFICULTY_OPTIONS.find((option) => option.id === poster.difficulty)?.label ?? poster.difficulty

  /* ----------------------------- edit panel ----------------------------- */
  const editPanel = (
    <div className="flex flex-col gap-4">
      {/* Poster copy */}
      <section className="ves-glass-soft p-5">
        <h2 className="ves-label" style={{ marginBottom: 12 }}>
          Poster copy
        </h2>
        <label className="mb-1.5 block text-[12.5px] font-medium" style={{ color: 'var(--color-ves-muted)' }}>
          Title
        </label>
        <input
          className="ves-input"
          value={content.title}
          maxLength={48}
          onChange={(event) => updateContent({ title: event.target.value })}
        />
        <label className="mb-1.5 mt-4 block text-[12.5px] font-medium" style={{ color: 'var(--color-ves-muted)' }}>
          English subtitle
        </label>
        <input
          className="ves-input"
          value={content.subtitle}
          maxLength={96}
          onChange={(event) => updateContent({ subtitle: event.target.value })}
        />
        <label className="mb-1.5 mt-4 block text-[12.5px] font-medium" style={{ color: 'var(--color-ves-muted)' }}>
          Theme tag
        </label>
        <input
          className="ves-input"
          value={content.theme}
          maxLength={32}
          onChange={(event) => updateContent({ theme: event.target.value })}
        />
      </section>

      {/* Visual theme */}
      <section className="ves-glass-soft p-5">
        <h2 className="ves-label" style={{ marginBottom: 12 }}>
          Poster theme
        </h2>
        <div className="flex flex-wrap gap-2">
          {POSTER_THEMES.map((theme) => {
            const active = poster.theme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id)}
                aria-pressed={active}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold"
                style={{
                  background: active ? 'rgba(139, 92, 246, 0.16)' : 'rgba(11, 7, 23, 0.45)',
                  border: `1px solid ${active ? 'rgba(167, 139, 250, 0.6)' : 'var(--color-ves-line)'}`,
                  color: active ? '#fff' : 'var(--color-ves-muted)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: `linear-gradient(135deg, ${theme.bg} 55%, ${theme.accent} 55%)`,
                    border: '1px solid rgba(216,204,255,0.35)',
                  }}
                />
                {theme.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* 01 Vocabulary */}
      <ModuleCard
        title={MODULE_TITLES.vocabulary}
        module="vocabulary"
        onRegenerate={regenerate}
        busy={busyModule === 'vocabulary'}
        onAdd={() => addListItem('vocabulary', { term: '', translation: '', explanation: '' })}
      >
        {content.vocabulary.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl p-3" style={{ background: 'rgba(11, 7, 23, 0.35)' }}>
            <div className="flex gap-2">
              <input
                className="ves-input"
                value={item.term}
                placeholder="English term"
                onChange={(event) => updateListItem('vocabulary', index, { term: event.target.value })}
              />
              <input
                className="ves-input"
                value={item.translation}
                placeholder="中文"
                onChange={(event) => updateListItem('vocabulary', index, { translation: event.target.value })}
              />
            </div>
            <textarea
              className="ves-textarea"
              value={item.explanation}
              placeholder="Short English explanation"
              onChange={(event) => updateListItem('vocabulary', index, { explanation: event.target.value })}
            />
            <div className="flex justify-end">
              <RemoveButton onClick={() => removeListItem('vocabulary', index)} disabled={content.vocabulary.length <= 1} />
            </div>
          </div>
        ))}
      </ModuleCard>

      {/* 02 Phrases */}
      <ModuleCard
        title={MODULE_TITLES.phrases}
        module="phrases"
        onRegenerate={regenerate}
        busy={busyModule === 'phrases'}
        onAdd={() => addListItem('phrases', { phrase: '', translation: '', explanation: '', example: '' })}
      >
        {content.phrases.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl p-3" style={{ background: 'rgba(11, 7, 23, 0.35)' }}>
            <div className="flex gap-2">
              <input
                className="ves-input"
                value={item.phrase}
                placeholder="English phrase"
                onChange={(event) => updateListItem('phrases', index, { phrase: event.target.value })}
              />
              <input
                className="ves-input"
                value={item.translation}
                placeholder="中文"
                onChange={(event) => updateListItem('phrases', index, { translation: event.target.value })}
              />
            </div>
            <textarea
              className="ves-textarea"
              value={item.explanation}
              placeholder="When to use it"
              onChange={(event) => updateListItem('phrases', index, { explanation: event.target.value })}
            />
            <textarea
              className="ves-textarea"
              value={item.example}
              placeholder="Example sentence"
              onChange={(event) => updateListItem('phrases', index, { example: event.target.value })}
            />
            <div className="flex justify-end">
              <RemoveButton onClick={() => removeListItem('phrases', index)} disabled={content.phrases.length <= 1} />
            </div>
          </div>
        ))}
      </ModuleCard>

      {/* 03 Sentence patterns */}
      <ModuleCard
        title={MODULE_TITLES.sentencePatterns}
        module="sentencePatterns"
        onRegenerate={regenerate}
        busy={busyModule === 'sentencePatterns'}
        onAdd={() =>
          addListItem('sentencePatterns', {
            pattern: '',
            translation: '',
            example: '',
            exampleTranslation: '',
            substitutions: [],
          })
        }
      >
        {content.sentencePatterns.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl p-3" style={{ background: 'rgba(11, 7, 23, 0.35)' }}>
            <input
              className="ves-input"
              value={item.pattern}
              placeholder="Pattern, e.g. It's not just … , it's …"
              onChange={(event) => updateListItem('sentencePatterns', index, { pattern: event.target.value })}
            />
            <input
              className="ves-input"
              value={item.translation}
              placeholder="中文解释"
              onChange={(event) => updateListItem('sentencePatterns', index, { translation: event.target.value })}
            />
            <textarea
              className="ves-textarea"
              value={item.example}
              placeholder="Example sentence"
              onChange={(event) => updateListItem('sentencePatterns', index, { example: event.target.value })}
            />
            <textarea
              className="ves-textarea"
              value={item.exampleTranslation}
              placeholder="例句中文翻译"
              onChange={(event) => updateListItem('sentencePatterns', index, { exampleTranslation: event.target.value })}
            />
            <input
              className="ves-input"
              value={item.substitutions.join(' / ')}
              placeholder="Substitutions, separated by /"
              onChange={(event) =>
                updateListItem('sentencePatterns', index, {
                  substitutions: event.target.value
                    .split('/')
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
            <div className="flex justify-end">
              <RemoveButton
                onClick={() => removeListItem('sentencePatterns', index)}
                disabled={content.sentencePatterns.length <= 1}
              />
            </div>
          </div>
        ))}
      </ModuleCard>

      {/* 04 Model response */}
      <ModuleCard
        title={MODULE_TITLES.modelResponse}
        module="modelResponse"
        onRegenerate={regenerate}
        busy={busyModule === 'modelResponse'}
      >
        <textarea
          className="ves-textarea"
          style={{ minHeight: 130 }}
          value={content.modelResponse.english}
          placeholder="Model paragraph in English"
          onChange={(event) => updateContent({ modelResponse: { ...content.modelResponse, english: event.target.value } })}
        />
        <textarea
          className="ves-textarea"
          style={{ minHeight: 110 }}
          value={content.modelResponse.chinese}
          placeholder="中文翻译"
          onChange={(event) => updateContent({ modelResponse: { ...content.modelResponse, chinese: event.target.value } })}
        />
      </ModuleCard>

      {/* 05 Speaking challenge */}
      <ModuleCard
        title={MODULE_TITLES.speakingChallenges}
        module="speakingChallenges"
        onRegenerate={regenerate}
        busy={busyModule === 'speakingChallenges'}
        onAdd={() => addListItem('speakingChallenges', { question: '', translation: '' })}
      >
        {content.speakingChallenges.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl p-3" style={{ background: 'rgba(11, 7, 23, 0.35)' }}>
            <textarea
              className="ves-textarea"
              value={item.question}
              placeholder="Open question in English"
              onChange={(event) => updateListItem('speakingChallenges', index, { question: event.target.value })}
            />
            <input
              className="ves-input"
              value={item.translation}
              placeholder="中文翻译"
              onChange={(event) => updateListItem('speakingChallenges', index, { translation: event.target.value })}
            />
            <div className="flex justify-end">
              <RemoveButton
                onClick={() => removeListItem('speakingChallenges', index)}
                disabled={content.speakingChallenges.length <= 1}
              />
            </div>
          </div>
        ))}
      </ModuleCard>

      {/* Photo framing */}
      <section className="ves-glass-soft p-5">
        <h2 className="ves-label" style={{ marginBottom: 12 }}>
          Photo framing
        </h2>
        <SliderRow
          label="Horizontal"
          value={poster.imageAdjust.x}
          onChange={(value) => setImageAdjust({ x: value })}
        />
        <SliderRow
          label="Vertical"
          value={poster.imageAdjust.y}
          onChange={(value) => setImageAdjust({ y: value })}
        />
        <SliderRow
          label="Zoom"
          value={Math.round((poster.imageAdjust.zoom - 1) * 250)}
          onChange={(value) => setImageAdjust({ zoom: 1 + value / 250 })}
          suffix="%"
        />
        <button
          type="button"
          className="ves-btn ves-btn-ghost ves-btn-sm mt-2"
          onClick={() => setImageAdjust({ x: 50, y: 50, zoom: 1 })}
        >
          <RotateCcw size={14} strokeWidth={2} />
          Reset framing
        </button>
      </section>
    </div>
  )

  /* ------------------------------- render ------------------------------- */
  return (
    <div className="mx-auto w-full max-w-[1560px] px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
      {/* Mobile view switch (phones only) */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <button type="button" className="ves-btn ves-btn-ghost ves-btn-sm" onClick={back}>
          <ArrowLeft size={15} strokeWidth={2} />
          Back
        </button>
        <div className="ves-segment" role="tablist" aria-label="Editor view">
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'preview'}
            className="ves-segment-item"
            onClick={() => setMobileView('preview')}
          >
            {mobileView === 'preview' ? (
              <motion.span layoutId={reducedMotion ? undefined : 'editor-mobile-tab'} className="ves-segment-thumb" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            ) : null}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Eye size={14} strokeWidth={2} />
              Preview
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === 'edit'}
            className="ves-segment-item"
            onClick={() => setMobileView('edit')}
          >
            {mobileView === 'edit' ? (
              <motion.span layoutId={reducedMotion ? undefined : 'editor-mobile-tab'} className="ves-segment-thumb" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            ) : null}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Pencil size={14} strokeWidth={2} />
              Edit
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] lg:grid-cols-[220px_minmax(0,1fr)_380px]">
        {/* Left rail (desktop) */}
        <aside className="hidden lg:block">
          <div className="ves-glass sticky top-24 p-5">
            <nav className="flex flex-col gap-1">
              <RailLink to="/" icon={Home} label="Home" />
              <RailLink to="/library" icon={Bookmark} label="My Library" />
              <RailLink to="/upload" icon={Plus} label="New poster" />
            </nav>

            <div className="my-5" style={{ height: 1, background: 'var(--color-ves-line)' }} />

            <div className="flex flex-col gap-2">
              <span className="ves-label">This poster</span>
              <span className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--color-ves-text)' }}>
                {content.title}
              </span>
              <span className="text-[12.5px]" style={{ color: 'var(--color-ves-faint)' }}>
                {formatDate(poster.createdAt)}
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="ves-chip">{modeLabel}</span>
                <span className="ves-chip">{difficultyLabel}</span>
                {poster.source === 'demo' ? <span className="ves-chip ves-chip-accent">Demo sample</span> : null}
              </div>
            </div>

            <div className="my-5" style={{ height: 1, background: 'var(--color-ves-line)' }} />

            <div className="flex flex-col gap-2">
              <button type="button" className="ves-btn ves-btn-primary" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <LoaderCircle size={16} className="ves-spin" /> : <Save size={16} strokeWidth={2} />}
                Save Poster
              </button>
              <button
                type="button"
                className="ves-btn ves-btn-glass"
                onClick={() => void handleExport()}
                disabled={exporting}
              >
                {exporting ? <LoaderCircle size={16} className="ves-spin" /> : <Download size={16} strokeWidth={2} />}
                Export PNG
              </button>
              <button
                type="button"
                className="ves-btn ves-btn-ghost"
                onClick={() => {
                  setActionError(null)
                  void regenerateAll().catch((error: unknown) =>
                    setActionError(error instanceof Error ? error.message : 'Regeneration failed.'),
                  )
                }}
                disabled={busyModule === 'all'}
              >
                {busyModule === 'all' ? <LoaderCircle size={16} className="ves-spin" /> : <RefreshCw size={16} strokeWidth={2} />}
                Regenerate
              </button>
            </div>
          </div>
        </aside>

        {/* Poster canvas */}
        <section className={`${mobileView === 'preview' ? 'block' : 'hidden'} md:block`}>
          <div className="ves-stage px-3 py-5 sm:px-6 sm:py-8">
            <ScaledPoster poster={poster} posterRef={posterRef} maxWidth={560} className="ves-paper-shadow" />
          </div>

          {/* Tablet action bar (iPad portrait / small landscape) */}
          <div className="mt-4 hidden items-center gap-2 md:flex lg:hidden">
            <button type="button" className="ves-btn ves-btn-primary ves-btn-sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <LoaderCircle size={15} className="ves-spin" /> : <Save size={15} strokeWidth={2} />}
              Save Poster
            </button>
            <button
              type="button"
              className="ves-btn ves-btn-glass ves-btn-sm"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? <LoaderCircle size={15} className="ves-spin" /> : <Download size={15} strokeWidth={2} />}
              Export PNG
            </button>
            <button
              type="button"
              className="ves-btn ves-btn-ghost ves-btn-sm"
              onClick={() => {
                setActionError(null)
                void regenerateAll().catch((error: unknown) =>
                  setActionError(error instanceof Error ? error.message : 'Regeneration failed.'),
                )
              }}
              disabled={busyModule === 'all'}
            >
              {busyModule === 'all' ? <LoaderCircle size={15} className="ves-spin" /> : <RefreshCw size={15} strokeWidth={2} />}
              Regenerate
            </button>
          </div>

          <div className="ves-glass-soft mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2">
              <span className="ves-label" style={{ marginBottom: 0 }}>
                Export size
              </span>
              <div className="ves-segment" role="radiogroup" aria-label="Export size">
                {EXPORT_SCALES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={exportScale === option.value}
                    className="ves-segment-item"
                    onClick={() => setExportScale(option.value)}
                  >
                    {exportScale === option.value ? (
                      <motion.span
                        layoutId={reducedMotion ? undefined : 'export-scale-thumb'}
                        className="ves-segment-thumb"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    ) : null}
                    <span style={{ position: 'relative', zIndex: 1 }}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[12.5px]" style={{ color: 'var(--color-ves-faint)' }}>
              {EXPORT_SCALES.find((option) => option.value === exportScale)?.note} · PNG
            </span>
          </div>

          {actionError ? (
            <div
              className="mt-4 flex items-start gap-3 rounded-2xl p-4"
              role="alert"
              style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.35)' }}
            >
              <CircleAlert size={17} strokeWidth={2} style={{ color: 'var(--color-ves-danger)', flex: 'none', marginTop: 1 }} />
              <div className="flex-1">
                <p className="text-[13.5px]" style={{ color: '#FCA5A5' }}>
                  {actionError}
                </p>
              </div>
              <button type="button" className="ves-btn ves-btn-ghost ves-btn-sm" onClick={() => setActionError(null)}>
                Dismiss
              </button>
            </div>
          ) : null}

          {demoMode ? (
            <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-ves-faint)' }}>
              This poster uses sample content (demo mode) and is marked “Demo sample” on the poster itself.
            </p>
          ) : null}
        </section>

        {/* Content panel */}
        <section className={`${mobileView === 'edit' ? 'block' : 'hidden'} md:block`}>
          <div className="ves-glass p-4">
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
                <SquarePen size={16} strokeWidth={2} style={{ color: 'var(--color-ves-violet)' }} />
                Edit content
              </h2>
              <span className="text-[12px]" style={{ color: 'var(--color-ves-faint)' }}>
                Updates the poster live
              </span>
            </div>
            <div className="ves-scrollarea flex max-h-none flex-col gap-4 overflow-visible lg:max-h-[calc(100vh-190px)] lg:overflow-y-auto lg:pr-2">
              {editPanel}
            </div>
          </div>
        </section>
      </div>

      {/* Sticky action bar (phones only) */}
      <div
        className="ves-safe-bottom fixed inset-x-0 bottom-0 z-40 md:hidden"
        style={{
          background: 'rgba(11, 7, 23, 0.82)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          borderTop: '1px solid var(--color-ves-line)',
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            className="ves-btn ves-btn-glass ves-btn-sm flex-1"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <LoaderCircle size={15} className="ves-spin" /> : <Save size={15} strokeWidth={2} />}
            Save
          </button>
          <button
            type="button"
            className="ves-btn ves-btn-primary ves-btn-sm flex-1"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? <LoaderCircle size={15} className="ves-spin" /> : <Download size={15} strokeWidth={2} />}
            Export PNG
          </button>
          <button
            type="button"
            className="ves-btn ves-btn-ghost ves-btn-sm"
            aria-label="Regenerate content"
            onClick={() => {
              setActionError(null)
              void regenerateAll().catch((error: unknown) =>
                setActionError(error instanceof Error ? error.message : 'Regeneration failed.'),
              )
            }}
            disabled={busyModule === 'all'}
          >
            {busyModule === 'all' ? <LoaderCircle size={15} className="ves-spin" /> : <RefreshCw size={15} strokeWidth={2} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------- pieces -------------------------------- */

function POSTER_EXPORT_SIZE(scale: number): string {
  return `${800 * scale}x${1200 * scale}`
}

function RailLink({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <StudioLink
      to={to}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium"
      style={{ color: 'var(--color-ves-muted)' }}
    >
      <Icon size={16} strokeWidth={1.9} />
      {label}
    </StudioLink>
  )
}

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="ves-btn ves-btn-ghost ves-btn-sm"
      onClick={onClick}
      disabled={disabled}
      style={{ color: disabled ? 'var(--color-ves-faint)' : 'var(--color-ves-danger)', fontSize: 12.5 }}
    >
      <Trash2 size={13} strokeWidth={2} />
      Remove
    </button>
  )
}

function SliderRow({
  label,
  value,
  onChange,
  suffix = '',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
}) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 flex items-center justify-between text-[12.5px]" style={{ color: 'var(--color-ves-muted)' }}>
        {label}
        <span style={{ color: 'var(--color-ves-faint)' }}>
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        className="ves-range"
        min={0}
        max={100}
        value={Math.max(0, Math.min(100, Math.round(value)))}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function ModuleCard({
  title,
  module,
  children,
  onRegenerate,
  busy,
  onAdd,
}: {
  title: string
  module: PosterModule
  children: ReactNode
  onRegenerate: (module: PosterModule) => void
  busy?: boolean
  onAdd?: () => void
}) {
  return (
    <section className="ves-glass-soft p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold tracking-wide" style={{ color: 'var(--color-ves-text)' }}>
          {title}
        </h3>
        <div className="flex items-center gap-1">
          {onAdd ? (
            <button type="button" className="ves-btn ves-btn-ghost ves-btn-sm" onClick={onAdd} aria-label={`Add item to ${title}`}>
              <Plus size={14} strokeWidth={2.2} />
            </button>
          ) : null}
          <button
            type="button"
            className="ves-btn ves-btn-ghost ves-btn-sm"
            onClick={() => onRegenerate(module)}
            disabled={busy}
            title={busy ? 'Regenerating…' : 'Regenerate this module'}
          >
            {busy ? <LoaderCircle size={14} className="ves-spin" /> : <RefreshCw size={14} strokeWidth={2} />}
            <span className="hidden sm:inline" style={{ fontSize: 12.5 }}>
              Regenerate
            </span>
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}
