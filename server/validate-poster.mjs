/**
 * Server-side structural validation of AI output.
 *
 * This mirrors src/studio/services/contentValidation.ts so the API never
 * returns unusable content. If you change one, change the other.
 */

const LIMITS = {
  title: 42,
  subtitle: 90,
  theme: 32,
  vocabulary: { min: 4, max: 6, term: 30, translation: 18, explanation: 76 },
  phrases: { min: 3, max: 5, phrase: 44, translation: 26, explanation: 84, example: 104 },
  patterns: { min: 1, max: 2, pattern: 70, translation: 30, example: 130, substitutions: 4 },
  modelResponse: { english: 320, chinese: 140 },
  challenges: { min: 2, max: 3, question: 84, translation: 40 },
  detectedObjects: { max: 4, label: 24, translation: 18 },
}

const clean = (value, maxLength) => {
  if (typeof value !== 'string') return undefined
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text
}

const dedupe = (items, key) => {
  const seen = new Set()
  return items.filter((item) => {
    const k = key(item).toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function parseVocabulary(raw) {
  if (!Array.isArray(raw)) return []
  const items = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const term = clean(row.term, LIMITS.vocabulary.term)
    const translation = clean(row.translation, LIMITS.vocabulary.translation)
    if (!term || !translation) continue
    const confidence = typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1 ? row.confidence : undefined
    items.push({ term, translation, explanation: clean(row.explanation, LIMITS.vocabulary.explanation) ?? '', ...(confidence === undefined ? {} : { confidence }) })
  }
  return dedupe(items, (item) => item.term).slice(0, LIMITS.vocabulary.max)
}

function parsePhrases(raw) {
  if (!Array.isArray(raw)) return []
  const items = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const phrase = clean(row.phrase, LIMITS.phrases.phrase)
    const translation = clean(row.translation, LIMITS.phrases.translation)
    if (!phrase || !translation) continue
    items.push({
      phrase,
      translation,
      explanation: clean(row.explanation, LIMITS.phrases.explanation) ?? '',
      example: clean(row.example, LIMITS.phrases.example) ?? '',
      ...(clean(row.usageNote, 90) ? { usageNote: clean(row.usageNote, 90) } : {}),
    })
  }
  return dedupe(items, (item) => item.phrase).slice(0, LIMITS.phrases.max)
}

function parsePatterns(raw) {
  if (!Array.isArray(raw)) return []
  const items = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const pattern = clean(row.pattern, LIMITS.patterns.pattern)
    const translation = clean(row.translation, LIMITS.patterns.translation)
    const example = clean(row.example, LIMITS.patterns.example)
    if (!pattern || !translation || !example) continue
    const substitutions = Array.isArray(row.substitutions)
      ? row.substitutions.map((value) => clean(value, 60)).filter(Boolean).slice(0, LIMITS.patterns.substitutions)
      : []
    items.push({
      pattern,
      translation,
      example,
      exampleTranslation: clean(row.exampleTranslation, 60) ?? '',
      substitutions,
    })
  }
  return items.slice(0, LIMITS.patterns.max)
}

function parseChallenges(raw) {
  if (!Array.isArray(raw)) return []
  const items = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    let question = clean(row.question, LIMITS.challenges.question)
    const translation = clean(row.translation, LIMITS.challenges.translation)
    if (!question || !translation) continue
    if (!/[?？]\s*$/.test(question)) question += '?'
    items.push({ question, translation })
  }
  return dedupe(items, (item) => item.question).slice(0, LIMITS.challenges.max)
}

function parseDetected(raw) {
  if (!Array.isArray(raw)) return []
  const items = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const label = clean(row.label, LIMITS.detectedObjects.label)
    const translation = clean(row.translation, LIMITS.detectedObjects.translation)
    if (!label || !translation) continue
    items.push({ label, translation })
  }
  return dedupe(items, (item) => item.label).slice(0, LIMITS.detectedObjects.max)
}

/** Validate the full poster content. Returns { ok, data?, error? }. */
export function validatePosterContent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'The model did not return an object.' }

  const title = clean(raw.title, LIMITS.title)
  const subtitle = clean(raw.subtitle, LIMITS.subtitle)
  const theme = clean(raw.theme, LIMITS.theme)
  if (!title) return { ok: false, error: 'Missing poster title.' }
  if (!subtitle) return { ok: false, error: 'Missing poster subtitle.' }
  if (!theme) return { ok: false, error: 'Missing theme tag.' }

  const vocabulary = parseVocabulary(raw.vocabulary)
  const phrases = parsePhrases(raw.phrases)
  const sentencePatterns = parsePatterns(raw.sentencePatterns)
  const speakingChallenges = parseChallenges(raw.speakingChallenges)
  const detectedObjects = parseDetected(raw.detectedObjects)

  const model = raw.modelResponse && typeof raw.modelResponse === 'object' ? raw.modelResponse : {}
  const english = clean(model.english, LIMITS.modelResponse.english)
  const chinese = clean(model.chinese, LIMITS.modelResponse.chinese)

  if (vocabulary.length < LIMITS.vocabulary.min) return { ok: false, error: `Too few vocabulary items (${vocabulary.length}).` }
  if (phrases.length < LIMITS.phrases.min) return { ok: false, error: `Too few phrases (${phrases.length}).` }
  if (sentencePatterns.length < LIMITS.patterns.min) return { ok: false, error: 'No usable sentence pattern.' }
  if (speakingChallenges.length < LIMITS.challenges.min) return { ok: false, error: 'Too few speaking challenges.' }
  if (!english || !chinese) return { ok: false, error: 'Incomplete model response.' }

  return {
    ok: true,
    data: {
      title,
      subtitle,
      theme,
      detectedObjects,
      vocabulary,
      phrases,
      sentencePatterns,
      modelResponse: { english, chinese },
      speakingChallenges,
    },
  }
}

/** Validate one regenerated module. Returns { ok, value?, error? }. */
export function validateModuleValue(module, raw) {
  switch (module) {
    case 'vocabulary': {
      const value = parseVocabulary(raw)
      return value.length >= LIMITS.vocabulary.min ? { ok: true, value } : { ok: false, error: 'Too few vocabulary items.' }
    }
    case 'phrases': {
      const value = parsePhrases(raw)
      return value.length >= LIMITS.phrases.min ? { ok: true, value } : { ok: false, error: 'Too few phrases.' }
    }
    case 'sentencePatterns': {
      const value = parsePatterns(raw)
      return value.length >= LIMITS.patterns.min ? { ok: true, value } : { ok: false, error: 'No usable pattern.' }
    }
    case 'speakingChallenges': {
      const value = parseChallenges(raw)
      return value.length >= LIMITS.challenges.min ? { ok: true, value } : { ok: false, error: 'Too few challenges.' }
    }
    case 'modelResponse': {
      if (!raw || typeof raw !== 'object') return { ok: false, error: 'Model response is not an object.' }
      const english = clean(raw.english, LIMITS.modelResponse.english)
      const chinese = clean(raw.chinese, LIMITS.modelResponse.chinese)
      return english && chinese ? { ok: true, value: { english, chinese } } : { ok: false, error: 'Incomplete model response.' }
    }
    case 'detectedObjects': {
      const value = parseDetected(raw)
      return { ok: true, value }
    }
    default:
      return { ok: false, error: `Unknown module "${module}".` }
  }
}
