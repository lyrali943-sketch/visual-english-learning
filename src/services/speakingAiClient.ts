/**
 * Client for the NEON SPEAK AI speaking-coach endpoint.
 *
 * Talks to the same-origin `/api/speaking-answer` route that is mounted both by
 * the Vite dev server (vite.config.ts) and by the bundled production server
 * (server/ves-server.mjs). The API key never reaches the browser: it is read
 * only by server/config.mjs.
 *
 * Every failure path produces a typed error so the UI can explain what happened
 * and fall back to the local template without ever implying the template came
 * from a model.
 */

import type { Topic } from '../data/topics'
import { CATEGORIES, QUESTION_TYPES } from '../data/categories'

/* ------------------------------------------------------------------ *
 * Types — mirror of the contract in server/validate-speaking.mjs
 * ------------------------------------------------------------------ */

export interface SpeakingAnalysis {
  taskType: string
  coreQuestion: string
  requirements: string[]
  constraints: string[]
  stanceHint: string
  subject: string[]
}

export interface SpeakingScenario {
  isHypothetical: boolean
  setup: string
  action: string
  result: string
  whyItSupports: string
}

export interface SpeakingArgument {
  label: string
  title: string
  explanation: string
  scenario: SpeakingScenario
}

export interface SpeakingLanguage {
  keyExpressions: string[]
  sentencePatterns: string[]
  vocabulary: string[]
}

export interface SpeakingModelAnswer {
  english: string
  chinese: string
  wordCount: number
  note: string
}

export interface SpeakingRelevance {
  addressesQuestion: boolean
  notes: string
  lexicalOverlap: number
  analysisOverlap: number
  argumentsOverlap: number
}

/** A validated speaking plan. */
export interface SpeakingPlan {
  analysis: SpeakingAnalysis
  arguments: SpeakingArgument[]
  language: SpeakingLanguage
  modelAnswer: SpeakingModelAnswer | null
  relevance: SpeakingRelevance
  source: 'ai'
}

/** Shapes returned by the endpoint that are not a plan. */
interface ApiErrorBody {
  ok?: boolean
  error?: string
  detail?: string
  retryAfter?: number
}

export type SpeakingErrorKind =
  | 'not-configured' // server has no AI key (503)
  | 'bad-request' // 400 — our payload was wrong
  | 'rate-limited' // 429
  | 'unusable' // 502 — AI answered but failed validation twice
  | 'server' // any other non-2xx
  | 'network' // fetch rejected / offline
  | 'timeout' // aborted by our own timer
  | 'malformed' // 2xx but the body was not the shape we expect

export class SpeakingAiError extends Error {
  readonly kind: SpeakingErrorKind
  /** Extra sentence from the server, useful for developers. */
  readonly detail?: string
  readonly retryAfter?: number

  constructor(kind: SpeakingErrorKind, message: string, detail?: string, retryAfter?: number) {
    super(message)
    this.name = 'SpeakingAiError'
    this.kind = kind
    this.detail = detail
    this.retryAfter = retryAfter
  }

  /** Short sentence safe to show a learner. */
  get userMessage(): string {
    switch (this.kind) {
      case 'not-configured':
        return 'AI is not configured on this server.'
      case 'bad-request':
        return 'This question could not be sent for analysis.'
      case 'rate-limited':
        return this.retryAfter
          ? `Too many analyses just now. Try again in ${this.retryAfter}s.`
          : 'Too many analyses just now. Try again in a minute.'
      case 'unusable':
        return 'The AI could not produce a usable plan for this question.'
      case 'timeout':
        return 'The AI took too long to answer.'
      case 'network':
        return 'The AI service could not be reached.'
      case 'malformed':
        return 'The AI service sent an unexpected response.'
      case 'server':
      default:
        return 'The AI service returned an error.'
    }
  }
}

/* ------------------------------------------------------------------ *
 * Request helpers
 * ------------------------------------------------------------------ */

/** Exactly the fields server/ai-handler.mjs reads. Nothing else is sent. */
function buildRequestBody(topic: Topic) {
  const categoryName = CATEGORIES.find((c) => c.id === topic.category)?.name ?? ''
  const typeName = QUESTION_TYPES.find((t) => t.id === topic.questionType)?.name ?? ''
  return {
    question: topic.question,
    category: categoryName,
    questionType: typeName,
    difficulty: topic.difficulty,
    preparationTime: topic.preparationTime,
    speakingTime: topic.speakingTime,
  }
}

const REQUEST_TIMEOUT_MS = 60_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

/**
 * Shape-check the 200 response. The server already validated it; this guards
 * against a partial deploy where the frontend is newer than the backend.
 */
function parsePlan(payload: unknown): SpeakingPlan {
  if (!isRecord(payload) || !isRecord(payload.analysis) || !Array.isArray(payload.arguments)) {
    throw new SpeakingAiError('malformed', 'Response did not contain an analysis and arguments.')
  }

  const a = payload.analysis
  const args = payload.arguments

  const argumentsOut: SpeakingArgument[] = []
  for (const raw of args) {
    if (!isRecord(raw) || !isRecord(raw.scenario)) continue
    const s = raw.scenario
    argumentsOut.push({
      label: typeof raw.label === 'string' ? raw.label : 'Argument',
      title: typeof raw.title === 'string' ? raw.title : '',
      explanation: typeof raw.explanation === 'string' ? raw.explanation : '',
      scenario: {
        isHypothetical: s.isHypothetical === true,
        setup: typeof s.setup === 'string' ? s.setup : '',
        action: typeof s.action === 'string' ? s.action : '',
        result: typeof s.result === 'string' ? s.result : '',
        whyItSupports: typeof s.whyItSupports === 'string' ? s.whyItSupports : '',
      },
    })
  }

  if (argumentsOut.length < 2) {
    throw new SpeakingAiError('malformed', `Expected 2 arguments, received ${argumentsOut.length}.`)
  }

  const lang = isRecord(payload.language) ? payload.language : {}
  const ma = isRecord(payload.modelAnswer) ? payload.modelAnswer : null
  const rel = isRecord(payload.relevance) ? payload.relevance : {}

  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

  return {
    analysis: {
      taskType: typeof a.taskType === 'string' ? a.taskType : 'unknown',
      coreQuestion: typeof a.coreQuestion === 'string' ? a.coreQuestion : '',
      requirements: readStringArray(a.requirements),
      constraints: readStringArray(a.constraints),
      stanceHint: typeof a.stanceHint === 'string' ? a.stanceHint : '',
      subject: readStringArray(a.subject),
    },
    arguments: argumentsOut.slice(0, 2),
    language: {
      keyExpressions: readStringArray(lang.keyExpressions),
      sentencePatterns: readStringArray(lang.sentencePatterns),
      vocabulary: readStringArray(lang.vocabulary),
    },
    modelAnswer: ma && typeof ma.english === 'string' && ma.english
      ? {
          english: ma.english,
          chinese: typeof ma.chinese === 'string' ? ma.chinese : '',
          wordCount: num(ma.wordCount, 0),
          note: typeof ma.note === 'string' ? ma.note : '',
        }
      : null,
    relevance: {
      addressesQuestion: rel.addressesQuestion === true,
      notes: typeof rel.notes === 'string' ? rel.notes : '',
      lexicalOverlap: num(rel.lexicalOverlap, 0),
      analysisOverlap: num(rel.analysisOverlap, 0),
      argumentsOverlap: num(rel.argumentsOverlap, 0),
    },
    source: 'ai',
  }
}

/**
 * Ask the server to analyse `topic`.
 *
 * @throws {SpeakingAiError} for every failure, including timeouts and
 *         non-2xx responses. Never resolves with a fabricated plan.
 */
export async function requestSpeakingPlan(topic: Topic, signal?: AbortSignal): Promise<SpeakingPlan> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const onOuterAbort = () => controller.abort()
  signal?.addEventListener('abort', onOuterAbort)

  let response: Response
  try {
    response = await fetch('/api/speaking-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody(topic)),
      signal: controller.signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    if (controller.signal.aborted) {
      throw new SpeakingAiError('timeout', `The request exceeded ${REQUEST_TIMEOUT_MS / 1000}s.`)
    }
    throw new SpeakingAiError(
      'network',
      error instanceof Error ? error.message : 'fetch failed',
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new SpeakingAiError('malformed', `Server returned a non-JSON body (HTTP ${response.status}).`)
  }

  if (!response.ok || (isRecord(payload) && payload.ok === false)) {
    const body = (payload ?? {}) as ApiErrorBody
    const message = typeof body.error === 'string' ? body.error : `HTTP ${response.status}`
    const detail = typeof body.detail === 'string' ? body.detail : undefined

    if (response.status === 503) {
      throw new SpeakingAiError('not-configured', message, detail)
    }
    if (response.status === 400) {
      throw new SpeakingAiError('bad-request', message, detail)
    }
    if (response.status === 429) {
      throw new SpeakingAiError(
        'rate-limited',
        message,
        detail,
        typeof body.retryAfter === 'number' ? body.retryAfter : undefined,
      )
    }
    if (response.status === 502) {
      throw new SpeakingAiError('unusable', message, detail)
    }
    throw new SpeakingAiError('server', message, detail)
  }

  const data = isRecord(payload) && 'data' in payload ? (payload as { data: unknown }).data : payload
  return parsePlan(data)
}

/** Whether the server currently has an AI provider configured. */
export async function fetchAiStatus(signal?: AbortSignal): Promise<{ configured: boolean; model: string | null }> {
  const response = await fetch('/api/status', { signal })
  const payload = (await response.json().catch(() => null)) as
    | { data?: { configured?: unknown; model?: unknown } }
    | null
  const data = payload?.data
  return {
    configured: data?.configured === true,
    model: typeof data?.model === 'string' ? data.model : null,
  }
}
