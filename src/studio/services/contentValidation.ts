/**
 * Strict runtime validation for AI-generated learning content.
 *
 * The AI (or the demo generator) returns arbitrary JSON; everything that
 * reaches the poster renderer must pass through this module. Invalid data is
 * never silently replaced with fake content — the caller gets an explicit
 * error so the UI can offer a retry.
 */

import {
  CONTENT_LIMITS,
  type DetectedObject,
  type PhraseItem,
  type PosterContent,
  type SentencePattern,
  type SpeakingChallenge,
  type VocabularyItem,
} from '../types/poster'

export interface ContentValidation {
  ok: boolean
  content?: PosterContent
  /** Non-fatal issues that were repaired while parsing. */
  warnings: string[]
  /** Fatal problem description. */
  error?: string
}

const fail = (error: string, warnings: string[] = []): ContentValidation => ({ ok: false, error, warnings })

function asString(value: unknown, maxLength: number, field: string, warnings: string[]): string | undefined {
  if (typeof value !== 'string') return undefined
  let text = value.replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim()
    warnings.push(`${field} was shortened to fit the poster layout.`)
  }
  return text
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyOf(item).toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function parseVocabulary(raw: unknown, warnings: string[]): VocabularyItem[] {
  const rows = asArray(raw)
  if (!rows) return []
  const items: VocabularyItem[] = []
  for (const row of rows) {
    const obj = asObject(row)
    if (!obj) continue
    const term = asString(obj.term, CONTENT_LIMITS.vocabulary.term, 'vocabulary.term', warnings)
    const translation = asString(obj.translation, CONTENT_LIMITS.vocabulary.translation, 'vocabulary.translation', warnings)
    if (!term || !translation) continue
    const explanation = asString(
      obj.explanation,
      CONTENT_LIMITS.vocabulary.explanation,
      'vocabulary.explanation',
      warnings,
    )
    const confidence = typeof obj.confidence === 'number' && obj.confidence >= 0 && obj.confidence <= 1 ? obj.confidence : undefined
    items.push({ term, translation, explanation: explanation ?? '', confidence })
  }
  return dedupeBy(items, (item) => item.term).slice(0, CONTENT_LIMITS.vocabulary.max)
}

function parsePhrases(raw: unknown, warnings: string[]): PhraseItem[] {
  const rows = asArray(raw)
  if (!rows) return []
  const items: PhraseItem[] = []
  for (const row of rows) {
    const obj = asObject(row)
    if (!obj) continue
    const phrase = asString(obj.phrase, CONTENT_LIMITS.phrases.phrase, 'phrases.phrase', warnings)
    const translation = asString(obj.translation, CONTENT_LIMITS.phrases.translation, 'phrases.translation', warnings)
    if (!phrase || !translation) continue
    const explanation = asString(obj.explanation, CONTENT_LIMITS.phrases.explanation, 'phrases.explanation', warnings)
    const example = asString(obj.example, CONTENT_LIMITS.phrases.example, 'phrases.example', warnings)
    const usageNote = asString(obj.usageNote, 90, 'phrases.usageNote', warnings)
    items.push({
      phrase,
      translation,
      explanation: explanation ?? '',
      example: example ?? '',
      ...(usageNote ? { usageNote } : {}),
    })
  }
  return dedupeBy(items, (item) => item.phrase).slice(0, CONTENT_LIMITS.phrases.max)
}

function parsePatterns(raw: unknown, warnings: string[]): SentencePattern[] {
  const rows = asArray(raw)
  if (!rows) return []
  const items: SentencePattern[] = []
  for (const row of rows) {
    const obj = asObject(row)
    if (!obj) continue
    const pattern = asString(obj.pattern, CONTENT_LIMITS.patterns.pattern, 'patterns.pattern', warnings)
    const translation = asString(obj.translation, CONTENT_LIMITS.patterns.translation, 'patterns.translation', warnings)
    const example = asString(obj.example, CONTENT_LIMITS.patterns.example, 'patterns.example', warnings)
    const exampleTranslation = asString(
      obj.exampleTranslation,
      60,
      'patterns.exampleTranslation',
      warnings,
    )
    if (!pattern || !translation || !example) continue
    const substitutions = (asArray(obj.substitutions) ?? [])
      .map((value) => asString(value, 60, 'patterns.substitutions', warnings))
      .filter((value): value is string => Boolean(value))
      .slice(0, CONTENT_LIMITS.patterns.substitutions)
    items.push({ pattern, translation, example, exampleTranslation: exampleTranslation ?? '', substitutions })
  }
  return items.slice(0, CONTENT_LIMITS.patterns.max)
}

function parseChallenges(raw: unknown, warnings: string[]): SpeakingChallenge[] {
  const rows = asArray(raw)
  if (!rows) return []
  const items: SpeakingChallenge[] = []
  for (const row of rows) {
    const obj = asObject(row)
    if (!obj) continue
    let question = asString(obj.question, CONTENT_LIMITS.challenges.question, 'challenges.question', warnings)
    const translation = asString(obj.translation, CONTENT_LIMITS.challenges.translation, 'challenges.translation', warnings)
    if (!question || !translation) continue
    if (!/[?？]\s*$/.test(question)) question = `${question}?`
    items.push({ question, translation })
  }
  return dedupeBy(items, (item) => item.question).slice(0, CONTENT_LIMITS.challenges.max)
}

function parseDetectedObjects(raw: unknown, warnings: string[]): DetectedObject[] {
  const rows = asArray(raw)
  if (!rows) return []
  const items: DetectedObject[] = []
  for (const row of rows) {
    const obj = asObject(row)
    if (!obj) continue
    const label = asString(obj.label, CONTENT_LIMITS.detectedObjects.label, 'detectedObjects.label', warnings)
    const translation = asString(
      obj.translation,
      CONTENT_LIMITS.detectedObjects.translation,
      'detectedObjects.translation',
      warnings,
    )
    if (!label || !translation) continue
    items.push({ label, translation })
  }
  return dedupeBy(items, (item) => item.label).slice(0, CONTENT_LIMITS.detectedObjects.max)
}

/**
 * Validate and normalise a raw payload into `PosterContent`.
 * Returns `ok: false` with a readable error when the payload cannot be used.
 */
export function parsePosterContent(raw: unknown): ContentValidation {
  const warnings: string[] = []
  const root = asObject(raw)
  if (!root) return fail('The learning content was not a valid object. Please try generating again.')

  const title = asString(root.title, CONTENT_LIMITS.title, 'title', warnings)
  const subtitle = asString(root.subtitle, CONTENT_LIMITS.subtitle, 'subtitle', warnings)
  const theme = asString(root.theme, CONTENT_LIMITS.theme, 'theme', warnings)
  if (!title) return fail('The content is missing a poster title.')
  if (!subtitle) return fail('The content is missing a poster subtitle.')
  if (!theme) return fail('The content is missing a theme.')

  const vocabulary = parseVocabulary(root.vocabulary, warnings)
  const phrases = parsePhrases(root.phrases, warnings)
  const sentencePatterns = parsePatterns(root.sentencePatterns, warnings)
  const speakingChallenges = parseChallenges(root.speakingChallenges, warnings)
  const detectedObjects = parseDetectedObjects(root.detectedObjects, warnings)

  const modelRaw = asObject(root.modelResponse)
  const modelEnglish = modelRaw
    ? asString(modelRaw.english, CONTENT_LIMITS.modelResponse.english, 'modelResponse.english', warnings)
    : undefined
  const modelChinese = modelRaw
    ? asString(modelRaw.chinese, CONTENT_LIMITS.modelResponse.chinese, 'modelResponse.chinese', warnings)
    : undefined

  if (vocabulary.length < CONTENT_LIMITS.vocabulary.min) {
    return fail(`Only ${vocabulary.length} usable vocabulary items were returned (at least ${CONTENT_LIMITS.vocabulary.min} needed).`)
  }
  if (phrases.length < CONTENT_LIMITS.phrases.min) {
    return fail(`Only ${phrases.length} usable phrases were returned (at least ${CONTENT_LIMITS.phrases.min} needed).`)
  }
  if (sentencePatterns.length < CONTENT_LIMITS.patterns.min) {
    return fail('No usable sentence pattern was returned.')
  }
  if (speakingChallenges.length < CONTENT_LIMITS.challenges.min) {
    return fail(`Only ${speakingChallenges.length} usable speaking challenges were returned.`)
  }
  if (!modelEnglish || !modelChinese) {
    return fail('The model response is missing its English paragraph or Chinese translation.')
  }

  return {
    ok: true,
    warnings,
    content: {
      title,
      subtitle,
      theme,
      detectedObjects,
      vocabulary,
      phrases,
      sentencePatterns,
      modelResponse: { english: modelEnglish, chinese: modelChinese },
      speakingChallenges,
    },
  }
}

/** Validate a single module after a per-module regeneration. */
export function validateModule<K extends keyof PosterContent>(
  key: K,
  raw: unknown,
): { ok: true; value: PosterContent[K]; warnings: string[] } | { ok: false; error: string } {
  const warnings: string[] = []
  switch (key) {
    case 'vocabulary': {
      const items = parseVocabulary(raw, warnings)
      if (items.length < CONTENT_LIMITS.vocabulary.min) return { ok: false, error: 'Regenerated vocabulary was incomplete.' }
      return { ok: true, value: items as PosterContent[K], warnings }
    }
    case 'phrases': {
      const items = parsePhrases(raw, warnings)
      if (items.length < CONTENT_LIMITS.phrases.min) return { ok: false, error: 'Regenerated phrases were incomplete.' }
      return { ok: true, value: items as PosterContent[K], warnings }
    }
    case 'sentencePatterns': {
      const items = parsePatterns(raw, warnings)
      if (items.length < CONTENT_LIMITS.patterns.min) return { ok: false, error: 'Regenerated sentence patterns were incomplete.' }
      return { ok: true, value: items as PosterContent[K], warnings }
    }
    case 'speakingChallenges': {
      const items = parseChallenges(raw, warnings)
      if (items.length < CONTENT_LIMITS.challenges.min) return { ok: false, error: 'Regenerated speaking challenges were incomplete.' }
      return { ok: true, value: items as PosterContent[K], warnings }
    }
    case 'modelResponse': {
      const obj = asObject(raw)
      if (!obj) return { ok: false, error: 'Regenerated model response was not an object.' }
      const english = asString(obj.english, CONTENT_LIMITS.modelResponse.english, 'modelResponse.english', warnings)
      const chinese = asString(obj.chinese, CONTENT_LIMITS.modelResponse.chinese, 'modelResponse.chinese', warnings)
      if (!english || !chinese) return { ok: false, error: 'Regenerated model response was incomplete.' }
      return { ok: true, value: { english, chinese } as PosterContent[K], warnings }
    }
    case 'detectedObjects': {
      const items = parseDetectedObjects(raw, warnings)
      return { ok: true, value: items as PosterContent[K], warnings }
    }
    default:
      return { ok: false, error: `Module "${String(key)}" cannot be regenerated individually.` }
  }
}
