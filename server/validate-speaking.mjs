/**
 * Validation for the NEON SPEAK answering endpoint.
 *
 * This deliberately does NOT trust the model's own `relevanceCheck` claim.
 * That claim is part of the payload the model produced, so a template answer
 * would happily assert `addressesQuestion: true`. Instead we run a cheap,
 * deterministic lexical check: the question's significant words must actually
 * reappear in the plan and the model answer.
 *
 * @typedef {Object} SpeakingSection
 * @property {string} role
 * @property {string} label
 * @property {string} content
 * @property {string} [example]
 *
 * @typedef {Object} ValidatedSpeaking
 * @property {string} taskType
 * @property {string} coreQuestion
 * @property {string[]} requirements
 * @property {string[]} subject
 * @property {SpeakingSection[]} sections
 * @property {{ english: string, chinese: string }} modelAnswer
 * @property {{ keyVocabulary: string[], commonMistakes: string[] }} tips
 * @property {{ addressesQuestion: boolean, notes: string, lexicalOverlap: number }} relevance
 */

const LIMITS = {
  coreQuestion: 200,
  label: 40,
  content: 400,
  example: 300,
  translation: 1200,
  vocabularyItem: 48,
  notes: 200,
  sections: { min: 2, max: 8 },
  requirements: { min: 1, max: 6 },
  subject: { min: 1, max: 8 },
  vocab: { min: 2, max: 6 },
  mistakes: { min: 1, max: 4 },
}

/** Word-count bands per requested answer length. */
const WORD_BANDS = {
  short: { min: 60, max: 130 },
  standard: { min: 80, max: 150 },
  extended: { min: 100, max: 200 },
}

/**
 * Minimum share of the question's significant words that must reappear in
 * both the plan and the model answer.
 *
 * Calibrated against real cases: a generic template answer that ignores the
 * question scores ~0.09, while a genuine on-topic answer scores ~0.36. 0.20
 * sits in the gap with room on both sides.
 */
const MIN_RELEVANCE_OVERLAP = 0.25

/**
 * Stop words that would make any two English sentences look "related" if we
 * counted them. Kept small on purpose: we want real content words.
 */
const STOP_WORDS = new Set([
  'a', 'about', 'after', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'been', 'being', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'for', 'from', 'had', 'has', 'have', 'he', 'her', 'here', 'hers', 'him', 'his',
  'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'my', 'no', 'nor', 'not', 'now', 'of', 'on', 'once', 'only', 'or', 'other',
  'our', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will',
  'with', 'would', 'you', 'your', 'yours',
])

/**
 * Lowercase alphabetic runs of 4+ characters, minus stop words.
 * "agree or disagree" -> ['agree','disagree']; both survive because 6 chars.
 */
function significantWords(text) {
  const out = []
  for (const raw of String(text ?? '').toLowerCase().split(/[^a-z]+/)) {
    if (raw.length >= 4 && !STOP_WORDS.has(raw)) out.push(raw)
  }
  return out
}

export function countWords(text) {
  const trimmed = String(text ?? '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function clean(value, max) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function cleanList(value, { min, max }, itemMax) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    const text = clean(item, itemMax)
    if (text) out.push(text)
    if (out.length >= max) break
  }
  return out.length >= min ? out : []
}

/**
 * Fraction of the question's significant words that reappear in the answer.
 * A genuinely on-topic answer scores high; a generic template scores low
 * because it never mentions the question's actual subject.
 */
export function lexicalOverlap(question, answerText) {
  const asked = significantWords(question)
  if (asked.length === 0) return 1

  const unique = [...new Set(asked)]
  const haystack = new Set(significantWords(answerText))
  const hits = unique.filter((word) => haystack.has(word)).length
  return Math.round((hits / unique.length) * 100) / 100
}

/**
 * @returns {{ ok: true, data: ValidatedSpeaking } | { ok: false, error: string }}
 */
export function validateSpeakingAnswer(raw, { question = '', lengthMode = 'standard' } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'The AI did not return a JSON object.' }
  }

  const taskType = clean(raw.taskType, 32)
  if (!taskType) return { ok: false, error: 'The AI did not identify the task type.' }

  const coreQuestion = clean(raw.coreQuestion, LIMITS.coreQuestion)
  if (coreQuestion.length < 5) return { ok: false, error: 'The restated question is missing or too short.' }

  const requirements = cleanList(raw.requirements, LIMITS.requirements, 160)
  if (requirements.length === 0) return { ok: false, error: 'No answer requirements were provided.' }

  const subject = cleanList(raw.subject, LIMITS.subject, 60)
  if (subject.length === 0) return { ok: false, error: 'The AI did not identify what the question is about.' }

  if (!Array.isArray(raw.sections)) return { ok: false, error: 'The answer plan has no sections.' }
  if (raw.sections.length < LIMITS.sections.min || raw.sections.length > LIMITS.sections.max) {
    return {
      ok: false,
      error: `The answer plan must have ${LIMITS.sections.min}-${LIMITS.sections.max} sections, got ${raw.sections.length}.`,
    }
  }

  const sections = []
  for (const item of raw.sections) {
    if (!item || typeof item !== 'object') continue
    const content = clean(item.content, LIMITS.content)
    if (!content) continue
    const section = {
      role: clean(item.role, 32) || 'step',
      label: clean(item.label, LIMITS.label) || 'Step',
      content,
    }
    const example = clean(item.example, LIMITS.example)
    if (example) section.example = example
    sections.push(section)
  }
  if (sections.length < LIMITS.sections.min) {
    return { ok: false, error: 'The answer plan sections were empty.' }
  }

  const english = clean(raw.modelAnswer?.english, LIMITS.translation)
  if (!english) return { ok: false, error: 'The model answer is missing.' }

  const chinese = clean(raw.modelAnswer?.chinese, LIMITS.translation)
  if (!chinese) return { ok: false, error: 'The model answer has no Chinese translation.' }

  const band = WORD_BANDS[lengthMode] ?? WORD_BANDS.standard
  const wordCount = countWords(english)
  if (wordCount < band.min || wordCount > band.max) {
    return {
      ok: false,
      error: `The model answer is ${wordCount} words, outside the ${band.min}-${band.max} word range for "${lengthMode}".`,
    }
  }

  const keyVocabulary = cleanList(raw.tips?.keyVocabulary, LIMITS.vocab, LIMITS.vocabularyItem)
  const commonMistakes = cleanList(raw.tips?.commonMistakes, LIMITS.mistakes, LIMITS.notes)

  // --- Objective relevance check -------------------------------------------
  // Measure across the plan AND the answer, and take the stricter of the two,
  // so a good plan cannot rescue a generic essay and vice versa.
  //
  // The threshold is deliberately low. Its job is to catch the failure mode
  // we actually saw: an answer that never mentions the question's subject
  // (those score ~0.00-0.10). A real answer that paraphrases instead of
  // repeating the question verbatim still scores well above the bar, and we
  // would rather let a slightly vague answer through than reject a good one
  // and silently fall back to the template.
  const planText = [
    coreQuestion,
    ...requirements,
    ...subject,
    ...sections.map((s) => `${s.label} ${s.content} ${s.example ?? ''}`),
  ].join(' ')
  const overlap = Math.min(lexicalOverlap(question, planText), lexicalOverlap(question, english))

  if (overlap < MIN_RELEVANCE_OVERLAP) {
    return {
      ok: false,
      error: `The answer does not address this question (only ${Math.round(overlap * 100)}% of its key words appear in the answer).`,
    }
  }

  return {
    ok: true,
    data: {
      taskType,
      coreQuestion,
      requirements,
      subject,
      sections,
      modelAnswer: { english, chinese, wordCount },
      tips: { keyVocabulary, commonMistakes },
      relevance: {
        addressesQuestion: true,
        notes: clean(raw.relevanceCheck?.notes, LIMITS.notes),
        lexicalOverlap: overlap,
      },
    },
  }
}
