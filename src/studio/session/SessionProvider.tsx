/**
 * Session state: the photo being processed, the poster being edited and the
 * analysis pipeline. Kept in memory (a photo or draft does not need to
 * survive a reload — saved posters live in the Library instead).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { fetchServiceStatus, type PosterModule } from '../services/aiClient'
import { generatePoster, regeneratePoster } from '../services/posterPipeline'
import {
  deleteLibraryRecord,
  getLibraryRecord,
  listLibraryRecords,
  savePosterToLibrary,
} from '../services/libraryDb'
import type {
  DetectedObject,
  Difficulty,
  ImageAdjust,
  LearningMode,
  LibraryRecord,
  Poster,
  PosterContent,
  PosterThemeId,
  PreparedPhoto,
} from '../types/poster'

export type AnalysisStatus = 'idle' | 'running' | 'error' | 'done'

export interface AnalysisState {
  status: AnalysisStatus
  /** Index into ANALYSIS_STEPS while running. */
  step: number
  objects: DetectedObject[]
  error: string | null
  errorDetail?: string
}

const IDLE_ANALYSIS: AnalysisState = { status: 'idle', step: -1, objects: [], error: null }

interface SessionValue {
  photo: PreparedPhoto | null
  setPhoto: (photo: PreparedPhoto | null) => void
  mode: LearningMode
  setMode: (mode: LearningMode) => void
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
  /** True when an AI provider is configured on the server. */
  serviceConfigured: boolean
  /** True when the user explicitly chose to continue with sample content. */
  useDemoContent: boolean
  /** Demo mode = no AI configured, or the user asked for sample content. */
  demoMode: boolean
  analysis: AnalysisState
  poster: Poster | null
  /** Load an existing poster into the editor (library or sample content). */
  loadPoster: (poster: Poster) => void
  runAnalysis: () => Promise<Poster>
  retryAnalysis: () => Promise<Poster>
  continueWithSample: () => Promise<Poster>
  regenerateAll: () => Promise<void>
  regenerateModule: (module: PosterModule) => Promise<void>
  busyModule: PosterModule | 'all' | null
  updateContent: (patch: Partial<PosterContent>) => void
  setTheme: (theme: PosterThemeId) => void
  setImageAdjust: (adjust: Partial<ImageAdjust>) => void
  savePoster: (thumbnailDataUrl: string) => Promise<LibraryRecord>
  libraryRecords: LibraryRecord[]
  refreshLibrary: () => Promise<void>
  openPosterFromLibrary: (id: string) => Promise<Poster>
  deletePoster: (id: string) => Promise<void>
  notice: string | null
  setNotice: (notice: string | null) => void
  /** Abort an in-flight analysis (used when leaving the analysis page). */
  cancelAnalysis: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [photo, setPhotoState] = useState<PreparedPhoto | null>(null)
  const [mode, setModeState] = useState<LearningMode>('everyday')
  const [difficulty, setDifficultyState] = useState<Difficulty>('intermediate')
  const [serviceConfigured, setServiceConfigured] = useState(false)
  const [useDemoContent, setUseDemoContent] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState>(IDLE_ANALYSIS)
  const [poster, setPoster] = useState<Poster | null>(null)
  const [busyModule, setBusyModule] = useState<PosterModule | 'all' | null>(null)
  const [libraryRecords, setLibraryRecords] = useState<LibraryRecord[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let alive = true
    fetchServiceStatus().then((status) => {
      if (alive) setServiceConfigured(status.configured)
    })
    return () => {
      alive = false
    }
  }, [])

  const refreshLibrary = useCallback(async () => {
    try {
      setLibraryRecords(await listLibraryRecords())
    } catch {
      setLibraryRecords([])
    }
  }, [])

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  const demoMode = !serviceConfigured || useDemoContent

  const setPhoto = useCallback((next: PreparedPhoto | null) => {
    setPhotoState(next)
    setAnalysis(IDLE_ANALYSIS)
  }, [])

  const loadPoster = useCallback((next: Poster) => {
    setUseDemoContent(next.source === 'demo')
    setPoster(next)
    setAnalysis({ status: 'done', step: 3, objects: [], error: null })
  }, [])

  const run = useCallback(
    async (demo: boolean): Promise<Poster> => {
      if (!photo) throw new Error('No photo selected yet.')
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setAnalysis({ status: 'running', step: 0, objects: [], error: null })
      try {
        const result = await generatePoster(
          { photo, mode, difficulty, demo },
          {
            onStep: (step) => setAnalysis((prev) => ({ ...prev, step })),
            onObjects: (objects) => setAnalysis((prev) => ({ ...prev, objects })),
          },
          controller.signal,
        )
        setPoster(result)
        setAnalysis({ status: 'done', step: 3, objects: [], error: null })
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The poster could not be created.'
        const detail = error instanceof Error && 'detail' in error ? String((error as { detail?: unknown }).detail ?? '') : ''
        setAnalysis({
          status: 'error',
          step: Math.max(0, Math.min(3, analysis.step)),
          objects: [],
          error: message,
          errorDetail: detail || undefined,
        })
        throw error
      }
    },
    [photo, mode, difficulty, analysis.step],
  )

  const runAnalysis = useCallback(() => run(demoMode), [run, demoMode])
  const retryAnalysis = useCallback(() => run(demoMode), [run, demoMode])
  const continueWithSample = useCallback(async () => {
    setUseDemoContent(true)
    return run(true)
  }, [run])

  const regenerateAll = useCallback(async () => {
    if (!poster) return
    setBusyModule('all')
    try {
      const updated = await regeneratePoster(poster, null, demoMode)
      setPoster(updated)
      setNotice(demoMode ? 'Sample content restored (demo mode).' : 'A fresh version of your poster is ready.')
    } finally {
      setBusyModule(null)
    }
  }, [poster, demoMode])

  const regenerateModule = useCallback(
    async (module: PosterModule) => {
      if (!poster) return
      setBusyModule(module)
      try {
        const updated = await regeneratePoster(poster, module, demoMode)
        setPoster(updated)
      } finally {
        setBusyModule(null)
      }
    },
    [poster, demoMode],
  )

  const updateContent = useCallback((patch: Partial<PosterContent>) => {
    setPoster((prev) => (prev ? { ...prev, content: { ...prev.content, ...patch }, updatedAt: Date.now() } : prev))
  }, [])

  const setTheme = useCallback((theme: PosterThemeId) => {
    setPoster((prev) => (prev ? { ...prev, theme, updatedAt: Date.now() } : prev))
  }, [])

  const setImageAdjust = useCallback((adjust: Partial<ImageAdjust>) => {
    setPoster((prev) =>
      prev ? { ...prev, imageAdjust: { ...prev.imageAdjust, ...adjust }, updatedAt: Date.now() } : prev,
    )
  }, [])

  const savePoster = useCallback(
    async (thumbnailDataUrl: string) => {
      if (!poster) throw new Error('There is no poster to save yet.')
      const record = await savePosterToLibrary(poster, thumbnailDataUrl)
      await refreshLibrary()
      setNotice('Saved to your library.')
      return record
    },
    [poster, refreshLibrary],
  )

  const openPosterFromLibrary = useCallback(async (id: string) => {
    const record = await getLibraryRecord(id)
    if (!record) throw new Error('That poster no longer exists in your library.')
    setUseDemoContent(record.poster.source === 'demo')
    setModeState(record.poster.mode)
    setDifficultyState(record.poster.difficulty)
    setPoster(record.poster)
    setAnalysis({ status: 'done', step: 3, objects: [], error: null })
    return record.poster
  }, [])

  const deletePoster = useCallback(
    async (id: string) => {
      await deleteLibraryRecord(id)
      await refreshLibrary()
      setNotice('Poster deleted.')
    },
    [refreshLibrary],
  )

  const cancelAnalysis = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      photo,
      setPhoto,
      mode,
      setMode: setModeState,
      difficulty,
      setDifficulty: setDifficultyState,
      serviceConfigured,
      useDemoContent,
      demoMode,
      analysis,
      poster,
      loadPoster,
      runAnalysis,
      retryAnalysis,
      continueWithSample,
      regenerateAll,
      regenerateModule,
      busyModule,
      updateContent,
      setTheme,
      setImageAdjust,
      savePoster,
      libraryRecords,
      refreshLibrary,
      openPosterFromLibrary,
      deletePoster,
      notice,
      setNotice,
      cancelAnalysis,
    }),
    [
      photo,
      setPhoto,
      mode,
      difficulty,
      serviceConfigured,
      useDemoContent,
      demoMode,
      analysis,
      poster,
      loadPoster,
      runAnalysis,
      retryAnalysis,
      continueWithSample,
      regenerateAll,
      regenerateModule,
      busyModule,
      updateContent,
      setTheme,
      setImageAdjust,
      savePoster,
      libraryRecords,
      refreshLibrary,
      openPosterFromLibrary,
      deletePoster,
      notice,
      cancelAnalysis,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <SessionProvider>')
  return value
}
