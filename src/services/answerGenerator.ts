/**
 * Speaking-coach service layer.
 *
 * Two sources of content:
 *   1. the real AI coach at /api/speaking-answer
 *   2. the built-in local template (always labelled as such)
 *
 * Both produce the SAME `SpeakingCoachResult` shape so the UI has one thing to
 * render, and `result.source` tells the UI which one it is. A template result
 * is never presented as an AI analysis.
 *
 * Caching lives here rather than in a component so that:
 *   - re-renders caused by the timer, the recorder or hover cannot re-request
 *   - concurrent callers asking for the same question share one in-flight request
 *   - switching topics shows that topic's result and cannot be overwritten by a
 *     late response for the previous one
 */

import type { Topic } from '../data/topics'
import { CATEGORIES, QUESTION_TYPES } from '../data/categories'
import {
  requestSpeakingPlan,
  SpeakingAiError,
  type SpeakingPlan,
  type SpeakingAnalysis,
  type SpeakingArgument,
  type SpeakingModelAnswer,
} from './speakingAiClient'
import { buildTemplateResult } from './speakingTemplate'

/* ------------------------------------------------------------------ *
 * Result shape
 * ------------------------------------------------------------------ */

export type AnswerSource = 'ai' | 'template'

export interface AnswerResult {
  analysis: SpeakingAnalysis
  arguments: SpeakingArgument[]
  modelAnswer: SpeakingModelAnswer | null
  /** Always exactly two entries. */
  language: { keyExpressions: string[]; sentencePatterns: string[]; vocabulary: string[] }
  source: AnswerSource
  /** Why the template was used, or null when the AI answered. */
  fallbackReason: string | null
  /** Server-side detail for developers; never shown verbatim to learners. */
  fallbackDetail: string | null
  /** How many AI attempts the server made (AI only). */
  attempts?: number
}

/* ------------------------------------------------------------------ *
 * Cache + in-flight de-duplication
 * ------------------------------------------------------------------ */

/**
 * Cache key covers every input that can change the answer: the verbatim
 * question plus the topic metadata sent to the server.
 */
export function cacheKeyFor(topic: Topic): string {
  const category = CATEGORIES.find((c) => c.id === topic.category)?.name ?? topic.category
  const type = QUESTION_TYPES.find((t) => t.id === topic.questionType)?.name ?? topic.questionType
  return [
    topic.question.trim().replace(/\s+/g, ' '),
    category,
    type,
    topic.difficulty,
    topic.preparationTime,
    topic.speakingTime,
  ].join('|')
}

const CACHE_LIMIT = 40
/** @type {Map<string, AnswerResult>} */
const cache = new Map<string, AnswerResult>()
/** @type {Map<string, Promise<AnswerResult>>} */
const inFlight = new Map<string, Promise<AnswerResult>>()

function cacheGet(key: string): AnswerResult | undefined {
  const hit = cache.get(key)
  if (hit) {
    // Refresh recency.
    cache.delete(key)
    cache.set(key, hit)
  }
  return hit
}

function cacheSet(key: string, value: AnswerResult): void {
  cache.set(key, value)
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

/** Test/debug helper. Clears memoised answers without touching practice data. */
export function clearSpeakingAnswerCache(): void {
  cache.clear()
  inFlight.clear()
}

export function getSpeakingAnswerCacheSize(): number {
  return cache.size
}

/* ------------------------------------------------------------------ *
 * Local template (fallback)
 *
 * Lives in ./speakingTemplate so it can be tested on its own.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

function planToResult(plan: SpeakingPlan, attempts?: number): AnswerResult {
  return {
    analysis: plan.analysis,
    arguments: plan.arguments.slice(0, 2),
    modelAnswer: plan.modelAnswer,
    language: plan.language,
    source: 'ai',
    fallbackReason: null,
    fallbackDetail: null,
    attempts,
  }
}

/**
 * Resolve the speaking plan for a topic.
 *
 * Never rejects: any AI failure degrades to the labelled local template, and
 * the reason travels with the result so the UI can explain it.
 *
 * @param force bypass the cache and in-flight de-duplication (the
 *              "Analyse again" button).
 */
export async function getSpeakingPlan(topic: Topic, force = false): Promise<AnswerResult> {
  const key = cacheKeyFor(topic)

  if (!force) {
    const cached = cacheGet(key)
    if (cached) return cached

    const pending = inFlight.get(key)
    if (pending) return pending
  }

  const request = (async (): Promise<AnswerResult> => {
    try {
      const plan = await requestSpeakingPlan(topic)
      const result = planToResult(plan)
      cacheSet(key, result)
      return result
    } catch (error) {
      let reason: string
      let detail: string | undefined
      if (error instanceof SpeakingAiError) {
        reason = error.userMessage
        detail = error.detail ? `${error.message} (${error.detail})` : error.message
      } else if (error instanceof Error) {
        reason = 'The AI service could not be reached.'
        detail = error.message
      } else {
        reason = 'The AI service could not be reached.'
        detail = String(error)
      }
      // Deliberately NOT cached: a transient failure should be retryable.
      return buildTemplateResult(topic, reason, detail)
    }
  })()

  inFlight.set(key, request)
  try {
    return await request
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key)
  }
}

/**
 * Peek at a cached plan without triggering anything.
 * Used to avoid a loading flash when switching back to a seen topic.
 */
export function peekSpeakingPlan(topic: Topic): AnswerResult | undefined {
  return cacheGet(cacheKeyFor(topic))
}
