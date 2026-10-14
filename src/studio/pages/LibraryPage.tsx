/**
 * Library — posters saved on this device (IndexedDB).
 * Tap a poster to reopen it in the editor; delete what you no longer need.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Bookmark, BookOpen, LoaderCircle, Sparkles, Trash2 } from 'lucide-react'

import { StudioLink, useRouter } from '../router'
import { estimateStorage, type StorageEstimate } from '../services/libraryDb'
import { useSession } from '../session/SessionProvider'
import { MODE_OPTIONS, POSTER_THEMES } from '../types/poster'
import type { LibraryRecord, PosterThemeId } from '../types/poster'

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function LibraryPage() {
  const { navigate } = useRouter()
  const { libraryRecords, refreshLibrary, deletePoster, openPosterFromLibrary } = useSession()
  const reducedMotion = useReducedMotion()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [themeFilter, setThemeFilter] = useState<PosterThemeId | 'all'>('all')

  useEffect(() => {
    void refreshLibrary()
    void estimateStorage().then(setEstimate)
  }, [refreshLibrary])

  const records = useMemo(
    () => (themeFilter === 'all' ? libraryRecords : libraryRecords.filter((record) => record.theme === themeFilter)),
    [libraryRecords, themeFilter],
  )

  const open = async (record: LibraryRecord) => {
    setLoadingId(record.id)
    try {
      await openPosterFromLibrary(record.id)
      navigate(`/editor/${record.id}`)
    } finally {
      setLoadingId(null)
    }
  }

  const remove = async (record: LibraryRecord) => {
    await deletePoster(record.id)
    setConfirmId(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="ves-chip">
            <Bookmark size={13} strokeWidth={2} style={{ color: 'var(--color-ves-violet)' }} />
            Saved on this device
          </span>
          <h1 className="ves-display mt-4" style={{ fontSize: 'clamp(30px, 4.4vw, 42px)' }}>
            My Library
          </h1>
          <p className="mt-3 max-w-[560px] text-[14.5px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
            {libraryRecords.length === 0
              ? 'Posters you save will appear here. They are stored in this browser only.'
              : `${libraryRecords.length} poster${libraryRecords.length === 1 ? '' : 's'} · stored in this browser on this device. They are not synced anywhere.`}
          </p>
        </div>
        <StudioLink to="/upload" className="ves-btn ves-btn-primary">
          <Sparkles size={16} strokeWidth={2} />
          Create a Poster
        </StudioLink>
      </div>

      {libraryRecords.length > 0 ? (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="ves-eyebrow" style={{ marginRight: 6 }}>
            Filter by theme
          </span>
          <button
            type="button"
            className="ves-chip"
            aria-pressed={themeFilter === 'all'}
            onClick={() => setThemeFilter('all')}
            style={
              themeFilter === 'all'
                ? {
                    color: 'var(--color-ves-accent-on-tint)',
                    borderColor: 'var(--color-ves-accent-edge-strong)',
                    background: 'var(--color-ves-accent-tint-strong)',
                  }
                : undefined
            }
          >
            All
          </button>
          {POSTER_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="ves-chip"
              aria-pressed={themeFilter === theme.id}
              onClick={() => setThemeFilter(theme.id)}
              style={
                themeFilter === theme.id
                  ? {
                      color: 'var(--color-ves-accent-on-tint)',
                      borderColor: 'var(--color-ves-accent-edge-strong)',
                      background: 'var(--color-ves-accent-tint-strong)',
                    }
                  : undefined
              }
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: `linear-gradient(135deg, ${theme.bg} 55%, ${theme.accent} 55%)`,
                  border: '1px solid rgba(16, 35, 74, 0.22)',
                }}
              />
              {theme.label}
            </button>
          ))}
        </div>
      ) : null}

      {records.length === 0 ? (
        <div className="ves-glass mt-10 flex flex-col items-center justify-center px-6 py-20 text-center">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: 'var(--color-ves-accent-tint)', border: '1px solid var(--color-ves-accent-edge)' }}
          >
            <BookOpen size={22} strokeWidth={1.8} style={{ color: 'var(--color-ves-accent-on-tint)' }} />
          </span>
          <h2 className="mt-5 text-[18px] font-semibold" style={{ color: 'var(--color-ves-text)' }}>
            {libraryRecords.length === 0 ? 'Your library is empty' : 'No posters with that theme'}
          </h2>
          <p className="mt-2 max-w-[380px] text-[13.5px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
            {libraryRecords.length === 0
              ? 'Create a poster from one of your photos — it will be saved here so you can reopen, edit and export it again.'
              : 'Try a different theme filter.'}
          </p>
          {libraryRecords.length === 0 ? (
            <StudioLink to="/upload" className="ves-btn ves-btn-primary mt-6">
              <Sparkles size={16} strokeWidth={2} />
              Create your first poster
            </StudioLink>
          ) : null}
        </div>
      ) : (
        <motion.ul
          {...(reducedMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35 } })}
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {records.map((record) => {
            const modeLabel = MODE_OPTIONS.find((option) => option.id === record.mode)?.label ?? record.mode
            return (
              <li key={record.id} className="ves-glass overflow-hidden">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => void open(record)}
                  aria-label={`Open ${record.title}`}
                >
                  <div className="relative" style={{ background: 'var(--color-ves-sunk)' }}>
                    <img
                      src={record.thumbnailDataUrl}
                      alt={`${record.title} poster preview`}
                      style={{ display: 'block', width: '100%', aspectRatio: '2 / 3', objectFit: 'cover' }}
                    />
                    {loadingId === record.id ? (
                      <span
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'var(--color-ves-sunk)' }}
                      >
                        <LoaderCircle size={22} className="ves-spin" style={{ color: 'var(--color-ves-violet)' }} />
                      </span>
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h2 className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--color-ves-text)' }}>
                      {record.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--color-ves-muted)' }}>
                      {record.subtitle}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="ves-chip">{modeLabel}</span>
                      <span className="ves-chip">{record.difficulty}</span>
                      {record.source === 'demo' ? <span className="ves-chip ves-chip-accent">Demo sample</span> : null}
                    </div>
                    <p className="mt-3 text-[11.5px]" style={{ color: 'var(--color-ves-faint)' }}>
                      {formatDate(record.createdAt)}
                    </p>
                  </div>
                </button>
                <div className="flex items-center justify-end gap-1 px-3 pb-3">
                  {confirmId === record.id ? (
                    <>
                      <span className="mr-auto text-[12px]" style={{ color: 'var(--color-ves-muted)' }}>
                        Delete this poster?
                      </span>
                      <button type="button" className="ves-btn ves-btn-ghost ves-btn-sm" onClick={() => setConfirmId(null)}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="ves-btn ves-btn-sm"
                        style={{ color: 'var(--color-ves-danger)', background: 'rgba(192, 52, 44, 0.09)' }}
                        onClick={() => void remove(record)}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ves-btn ves-btn-ghost ves-btn-sm"
                      onClick={() => setConfirmId(record.id)}
                    >
                      <Trash2 size={13} strokeWidth={2} />
                      Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </motion.ul>
      )}

      {estimate ? (
        <p className="mt-10 text-[12px]" style={{ color: 'var(--color-ves-faint)' }}>
          Local storage used by this site: {formatBytes(estimate.usageBytes)}
          {estimate.quotaBytes > 0 ? ` of about ${formatBytes(estimate.quotaBytes)} available` : ''}. Saving posters in a
          private browser window may not persist after the window is closed.
        </p>
      ) : null}
    </div>
  )
}
