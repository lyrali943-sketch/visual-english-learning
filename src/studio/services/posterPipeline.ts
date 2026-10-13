/**
 * The generation pipeline: photo → analysis → structured content → poster.
 *
 * Every step is a real stage of the real pipeline (no fake progress bars).
 * In demo mode the same code path runs against clearly-labelled sample data.
 */

import { AiServiceError, generateLearningContent, identifyPhoto, regenerateModule } from './aiClient'
import { parsePosterContent, validateModule } from './contentValidation'
import { buildDemoContent, buildDemoModule } from './demoContent'
import { createPoster } from './posterFactory'
import type { PosterModule } from './aiClient'
import type {
  DetectedObject,
  Difficulty,
  LearningMode,
  Poster,
  PosterContent,
  PosterThemeId,
  PreparedPhoto,
} from '../types/poster'

export interface AnalysisStep {
  id: string
  label: string
  detail: string
}

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { id: 'read', label: 'Reading your photo...', detail: 'Preparing the image' },
  { id: 'identify', label: 'Identifying objects...', detail: 'Only what is really visible' },
  { id: 'expressions', label: 'Finding useful expressions...', detail: 'Vocabulary, phrases, patterns' },
  { id: 'build', label: 'Building your poster...', detail: 'Laying out your page' },
]

export interface GeneratePosterInput {
  photo: PreparedPhoto
  mode: LearningMode
  difficulty: Difficulty
  /** Demo mode: sample content is used instead of a real AI call. */
  demo: boolean
  theme?: PosterThemeId
}

export interface GeneratePosterHooks {
  onStep?: (index: number) => void
  onObjects?: (objects: DetectedObject[]) => void
}

/**
 * Wait for the next animation frame — but never longer than ~50ms.
 * requestAnimationFrame does not fire in background tabs (or when the window
 * is occluded), so the pipeline must not depend on it.
 */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(finish)
    setTimeout(finish, 50)
  })

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function friendlyError(error: unknown): Error {
  if (error instanceof AiServiceError) {
    return new AiServiceError(error.message, error.detail)
  }
  if (error instanceof Error) return error
  return new Error('Something went wrong while creating your poster.')
}

/** Full pipeline: photo → identified objects → learning content → Poster. */
export async function generatePoster(
  input: GeneratePosterInput,
  hooks: GeneratePosterHooks = {},
  signal?: AbortSignal,
): Promise<Poster> {
  const { photo, mode, difficulty, demo } = input
  const step = (index: number) => hooks.onStep?.(index)

  try {
    // 1 — read the photo
    step(0)
    await nextFrame()
    await pause(320)

    // 2 — identify what is actually in the photo
    step(1)
    let objects: DetectedObject[]
    if (demo) {
      await pause(700)
      objects = buildDemoContent(mode, difficulty).detectedObjects
    } else {
      objects = await identifyPhoto(photo.analysisDataUrl, mode, signal)
    }
    hooks.onObjects?.(objects)

    // 3 — generate the learning content
    step(2)
    let content: PosterContent
    if (demo) {
      await pause(900)
      content = buildDemoContent(mode, difficulty)
    } else {
      const raw = await generateLearningContent(photo.analysisDataUrl, mode, difficulty, objects, signal)
      const parsed = parsePosterContent(raw)
      if (!parsed.ok || !parsed.content) {
        throw new AiServiceError(parsed.error ?? 'The generated content could not be used.')
      }
      content = parsed.content
    }

    // 4 — build the poster
    step(3)
    await pause(420)

    return createPoster({
      content,
      mode,
      difficulty,
      theme: input.theme,
      photoDataUrl: photo.previewDataUrl,
      source: demo ? 'demo' : 'ai',
    })
  } catch (error) {
    throw friendlyError(error)
  }
}

/** Regenerate everything or just one module of an existing poster. */
export async function regeneratePoster(
  poster: Poster,
  module: PosterModule | null,
  demo: boolean,
  signal?: AbortSignal,
): Promise<Poster> {
  try {
    if (module === null) {
      const fresh = await generatePoster(
        {
          photo: {
            previewDataUrl: poster.photoDataUrl,
            analysisDataUrl: poster.photoDataUrl,
            width: 0,
            height: 0,
            fileName: 'poster',
            fileSize: 0,
          },
          mode: poster.mode,
          difficulty: poster.difficulty,
          demo,
          theme: poster.theme,
        },
        {},
        signal,
      )
      return { ...fresh, id: poster.id, createdAt: poster.createdAt }
    }

    if (demo) {
      const value = buildDemoModule(poster.mode, poster.difficulty, module as never)
      const check = validateModule(module, value)
      if (!check.ok) throw new AiServiceError(check.error)
      return {
        ...poster,
        content: { ...poster.content, [module]: check.value } as PosterContent,
        updatedAt: Date.now(),
      }
    }

    const raw = await regenerateModule(
      module,
      poster.photoDataUrl,
      poster.mode,
      poster.difficulty,
      poster.content,
      signal,
    )
    const check = validateModule(module, raw)
    if (!check.ok) throw new AiServiceError(check.error)
    return {
      ...poster,
      content: { ...poster.content, [module]: check.value } as PosterContent,
      updatedAt: Date.now(),
    }
  } catch (error) {
    throw friendlyError(error)
  }
}
