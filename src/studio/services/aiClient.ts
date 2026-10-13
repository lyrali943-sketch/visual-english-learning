/**
 * Client for the secure backend API (see /server).
 *
 * The browser never sees an API key — it only talks to same-origin endpoints
 * (`/api/*`) which are served by the Vite dev plugin or the bundled Node
 * server. When no AI provider is configured the server reports
 * `configured: false` and the app switches to clearly-labelled demo content.
 */

import type { DetectedObject, Difficulty, LearningMode, PosterContent } from '../types/poster'

export type PosterModule =
  | 'vocabulary'
  | 'phrases'
  | 'sentencePatterns'
  | 'modelResponse'
  | 'speakingChallenges'
  | 'detectedObjects'

export class AiServiceError extends Error {
  detail?: string
  constructor(message: string, detail?: string) {
    super(message)
    this.name = 'AiServiceError'
    this.detail = detail
  }
}

export interface ServiceStatus {
  configured: boolean
  provider: string
  model: string | null
}

const REQUEST_TIMEOUT_MS = 120_000

async function postJson<T>(path: string, body: unknown, externalSignal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new AiServiceError('The request timed out.')), REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort(externalSignal?.reason)
  externalSignal?.addEventListener('abort', onAbort)
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      throw new AiServiceError(`The server returned an unreadable response (HTTP ${response.status}).`)
    }
    const record = (payload ?? {}) as Record<string, unknown>
    if (!response.ok || record.ok === false) {
      const message =
        typeof record.error === 'string' ? record.error : `The request failed (HTTP ${response.status}).`
      throw new AiServiceError(message, typeof record.detail === 'string' ? record.detail : undefined)
    }
    return (record.data ?? {}) as T
  } catch (error) {
    if (error instanceof AiServiceError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AiServiceError('The request was cancelled.')
    }
    throw new AiServiceError('The learning service could not be reached. Is the server running?')
  } finally {
    clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', onAbort)
  }
}

export async function fetchServiceStatus(externalSignal?: AbortSignal): Promise<ServiceStatus> {
  try {
    const response = await fetch('/api/status', { signal: externalSignal })
    if (!response.ok) return { configured: false, provider: 'offline', model: null }
    const payload = (await response.json()) as Record<string, unknown>
    const data = (payload.data ?? {}) as Record<string, unknown>
    return {
      configured: Boolean(data.configured),
      provider: typeof data.provider === 'string' ? data.provider : 'unknown',
      model: typeof data.model === 'string' ? data.model : null,
    }
  } catch {
    return { configured: false, provider: 'offline', model: null }
  }
}

/** Stage 1 — what is actually visible in the photo. */
export async function identifyPhoto(
  photoDataUrl: string,
  mode: LearningMode,
  externalSignal?: AbortSignal,
): Promise<DetectedObject[]> {
  const data = await postJson<{ objects: DetectedObject[] }>('/api/identify', { photoDataUrl, mode }, externalSignal)
  return Array.isArray(data.objects) ? data.objects : []
}

/** Stage 2 — the five learning modules. */
export async function generateLearningContent(
  photoDataUrl: string,
  mode: LearningMode,
  difficulty: Difficulty,
  objects: DetectedObject[],
  externalSignal?: AbortSignal,
): Promise<PosterContent> {
  return postJson<PosterContent>(
    '/api/generate',
    { photoDataUrl, mode, difficulty, objects },
    externalSignal,
  )
}

/** Regenerate a single module, keeping the rest of the poster. */
export async function regenerateModule(
  module: PosterModule,
  photoDataUrl: string,
  mode: LearningMode,
  difficulty: Difficulty,
  content: PosterContent,
  externalSignal?: AbortSignal,
): Promise<unknown> {
  const data = await postJson<{ module: PosterModule; value: unknown }>(
    '/api/generate-module',
    { module, photoDataUrl, mode, difficulty, content },
    externalSignal,
  )
  return data.value
}
