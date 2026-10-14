/**
 * Validation for the NEON SPEAK speaking-coach endpoint.
 *
 * Contract (see server/prompts.mjs):
 *   analysis   { taskType, coreQuestion, requirements, constraints, stanceHint, subject }
 *   arguments  [ exactly 2 × { title, explanation, scenario } ]
 *   scenario   { isHypothetical, setup, action, result, whyItSupports }
 *   language   { keyExpressions, sentencePatterns, vocabulary }
 *   modelAnswer{ english, chinese, note }   ← optional
 *
 * Two design notes worth keeping in mind when editing this file:
 *
 * 1. We do NOT trust the model's own `relevanceCheck` claim — it is part of
 *    the payload the model wrote, so a template answer would happily claim
 *    `addressesQuestion: true`. Relevance is recomputed here from the question
 *    text, so it measures the actual question stem rather than the broad
 *    topic category.
 *
 * 2. Hypothetical framing is checked POSITIVELY (the scenario must contain an
 *    imagining cue) rather than by blocklisting research-ish words. A
 *    blocklist would misfire on perfectly good practice material; requiring
 *    positive evidence of framing cannot.
 */

/** @typedef {{ isHypothetical: boolean, setup: string, action: string, result: string, whyItSupports: string }} Scenario */
/** @typedef {{ title: string, explanation: string, scenario: Scenario }} Argument */
/** @typedef {{ title: string, explanation: string, scenario: Scenario, label: string }} ValidatedArgument */

const LIMITS = {
  taskType: 40,
  coreQuestion: 240,
  stanceHint: 160,
  analysisItem: 200,
  subjectItem: 60,
  title: 90,
  explanation: 600,
  setup: 400,
  action: 400,
  result: 300,
  whyItSupports: 400,
  expression: 160,
  pattern: 200,
  vocabularyItem: 60,
  modelAnswer: 2000,
  translation: 1500,
  note: 200,
  list: { min: 1, max: 8 },
  vocabularyList: { min: 2, max: 12 },
}

/** Exactly two arguments, per the product decision. */
const EXPECTED_ARGUMENTS = 2

/**
 * Minimum share of the question's significant words that must reappear in the
 * analysis and in the arguments. See MIN_RELEVANCE_OVERLAP calibration notes.
 */
const MIN_RELEVANCE_OVERLAP = 0.25

/**
 * Jaccard similarity above which two arguments are considered the same idea.
 * 0.55 keeps two genuinely different angles while catching "cost" restated.
 */
const DUPLICATE_SIMILARITY = 0.55

/**
 * Words that mark a scenario as invented. We require at least one so the
 * learner is never shown something that reads like a real anecdote or study.
 */
const HYPOTHETICAL_CUES = [
  'imagine',
  'imagine that',
  'suppose',
  'supposing',
  'assume',
  'pretend',
  'what if',
  "let's say",
  'lets say',
  'picture',
  'consider',
  'if you',
  'if a ',
  'if your',
  'if someone',
  'if my',
  'if i ',
  'hypothetical',
  'say you',
]

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

export function countWords(text) {
  const trimmed = String(text ?? '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function clean(value, max) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Returns [] when the value is not an array, so wrong types fail downstream. */
function cleanList(value, { min, max }, itemMax) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const text = clean(item, itemMax)
    if (text) out.push(text)
    if (out.length >= max) break
  }
  return out.length >= min ? out : []
}

/** Content tokens (4+ chars, stop words removed), de-duplicated. */
function contentTokens(text) {
  const out = new Set()
  for (const raw of String(text ?? '').toLowerCase().split(/[^a-z]+/)) {
    if (raw.length >= 4 && !STOP_WORDS.has(raw)) out.add(raw)
  }
  return out
}

/**
 * Cheap English inflection handling.
 *
 * Exact token matching alone produces false rejections: the question says
 * "graduation" while a perfectly good answer says "graduates", or the
 * question says "job" and the answer says "jobs". Without this, the relevance
 * check punishes answers for using different but equivalent word forms.
 *
 * This is deliberately not a real stemmer — no external dependency, and a full
 * Porter stemmer would also merge unrelated words. Each word contributes a few
 * variants, and any shared variant counts as a match.
 */
function singularize(word) {
  if (word.length < 5) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.endsWith('sses')) return word.slice(0, -2)
  if (word.endsWith('ses')) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/** Match keys for one word: exact, singular, and a 5-character prefix. */
function variantsOf(word) {
  const singular = singularize(word)
  const out = new Set([word, singular])
  const prefix = word.length >= 5 ? word.slice(0, 5) : word
  const singularPrefix = singular.length >= 5 ? singular.slice(0, 5) : singular
  out.add(prefix)
  out.add(singularPrefix)
  return out
}

function stemSet(text) {
  const out = new Set()
  for (const token of contentTokens(text)) {
    for (const variant of variantsOf(token)) out.add(variant)
  }
  return out
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const word of a) if (b.has(word)) shared += 1
  return shared / (a.size + b.size - shared)
}

/**
 * Fraction of the question's significant words that reappear in the text.
 * Inflection variants count, so "job"/"jobs" and
 * "graduates"/"graduation" are treated as the same word.
 * Returns 1 when the question has no significant words (nothing to check).
 */
export function lexicalOverlap(question, answerText) {
  const asked = [...contentTokens(question)]
  if (asked.length === 0) return 1
  const haystack = stemSet(answerText)

  let hits = 0
  for (const word of asked) {
    const variants = variantsOf(word)
    for (const variant of variants) {
      if (haystack.has(variant)) {
        hits += 1
        break
      }
    }
  }
  return Math.round((hits / asked.length) * 100) / 100
}

function hasHypotheticalCue(text) {
  const lower = ` ${String(text ?? '').toLowerCase()} `
  return HYPOTHETICAL_CUES.some((cue) => lower.includes(cue))
}

function validateScenario(scenario, index) {
  const where = `arguments[${index}].scenario`

  if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario)) {
    return { error: `${where} is missing.` }
  }

  // Strictly true. Accepting a truthy string would let "false" through.
  if (scenario.isHypothetical !== true) {
    return { error: `${where}.isHypothetical must be exactly true (got ${JSON.stringify(scenario.isHypothetical)}).` }
  }

  const setup = clean(scenario.setup, LIMITS.setup)
  const action = clean(scenario.action, LIMITS.action)
  const result = clean(scenario.result, LIMITS.result)
  const whyItSupports = clean(scenario.whyItSupports, LIMITS.whyItSupports)

  if (!setup) return { error: `${where}.setup is empty.` }
  if (!action) return { error: `${where}.action is empty.` }
  if (!result) return { error: `${where}.result is empty.` }
  if (!whyItSupports) return { error: `${where}.whyItSupports is empty.` }

  // Positive check: the scenario must actually read as invented material.
  if (!hasHypotheticalCue(`${setup} ${action}`)) {
    return {
      error: `${where} does not read as invented practice material — no imagining cue (e.g. "Imagine…", "Suppose…", "If you…") was found.`,
    }
  }

  return {
    value: {
      isHypothetical: true,
      setup,
      action,
      result,
      whyItSupports,
    },
  }
}

/**
 * @returns {{ ok: true, data: object } | { ok: false, error: string }}
 */
export function validateSpeakingAnswer(raw, { question = '' } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'The AI did not return a JSON object.' }
  }

  // --- analysis -----------------------------------------------------------
  const analysis = raw.analysis
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    return { ok: false, error: 'The "analysis" object is missing.' }
  }

  const taskType = clean(analysis.taskType, LIMITS.taskType)
  if (!taskType) return { ok: false, error: 'analysis.taskType is missing.' }

  const coreQuestion = clean(analysis.coreQuestion, LIMITS.coreQuestion)
  if (coreQuestion.length < 8) {
    return { ok: false, error: 'analysis.coreQuestion is missing or too short.' }
  }

  const requirements = cleanList(analysis.requirements, LIMITS.list, LIMITS.analysisItem)
  if (requirements.length === 0) return { ok: false, error: 'analysis.requirements is empty.' }

  // constraints and stanceHint are allowed to be absent/empty.
  const constraints = cleanList(analysis.constraints, { min: 0, max: LIMITS.list.max }, LIMITS.analysisItem)
  const stanceHint = clean(analysis.stanceHint, LIMITS.stanceHint)

  const subject = cleanList(analysis.subject, LIMITS.list, LIMITS.subjectItem)
  if (subject.length === 0) {
    return { ok: false, error: 'analysis.subject is empty — the AI must say what the question is about.' }
  }

  // --- arguments ----------------------------------------------------------
  if (!Array.isArray(raw.arguments)) {
    return { ok: false, error: 'The "arguments" array is missing.' }
  }
  if (raw.arguments.length !== EXPECTED_ARGUMENTS) {
    return {
      ok: false,
      error: `Exactly ${EXPECTED_ARGUMENTS} arguments are required, got ${raw.arguments.length}.`,
    }
  }

  const argumentsOut = []
  for (let i = 0; i < raw.arguments.length; i += 1) {
    const arg = raw.arguments[i]
    if (!arg || typeof arg !== 'object' || Array.isArray(arg)) {
      return { ok: false, error: `arguments[${i}] is not an object.` }
    }

    const title = clean(arg.title, LIMITS.title)
    if (!title) return { ok: false, error: `arguments[${i}].title is empty.` }

    const explanation = clean(arg.explanation, LIMITS.explanation)
    if (!explanation) return { ok: false, error: `arguments[${i}].explanation is empty.` }

    const scenario = validateScenario(arg.scenario, i)
    if (scenario.error) return { ok: false, error: scenario.error }

    argumentsOut.push({
      label: i === 0 ? 'Argument A' : 'Argument B',
      title,
      explanation,
      scenario: scenario.value,
    })
  }

  // Two arguments must be genuinely different ideas.
  const [a, b] = argumentsOut
  const similarity = Math.max(
    jaccard(contentTokens(`${a.title} ${a.explanation}`), contentTokens(`${b.title} ${b.explanation}`)),
    jaccard(
      contentTokens(`${a.title} ${a.explanation} ${a.scenario.setup} ${a.scenario.result}`),
      contentTokens(`${b.title} ${b.explanation} ${b.scenario.setup} ${b.scenario.result}`),
    ),
  )
  if (similarity >= DUPLICATE_SIMILARITY) {
    return {
      ok: false,
      error: `Both arguments make the same point (${Math.round(similarity * 100)}% similar). They must attack the question from two different angles.`,
    }
  }

  // --- language -----------------------------------------------------------
  const language = raw.language
  if (!language || typeof language !== 'object' || Array.isArray(language)) {
    return { ok: false, error: 'The "language" object is missing.' }
  }

  const keyExpressions = cleanList(language.keyExpressions, LIMITS.list, LIMITS.expression)
  if (keyExpressions.length === 0) return { ok: false, error: 'language.keyExpressions is empty.' }

  const sentencePatterns = cleanList(language.sentencePatterns, LIMITS.list, LIMITS.pattern)
  if (sentencePatterns.length === 0) return { ok: false, error: 'language.sentencePatterns is empty.' }

  const vocabulary = cleanList(language.vocabulary, LIMITS.vocabularyList, LIMITS.vocabularyItem)
  if (vocabulary.length === 0) return { ok: false, error: 'language.vocabulary is empty.' }

  // --- modelAnswer (optional) --------------------------------------------
  let modelAnswer = null
  if (raw.modelAnswer && typeof raw.modelAnswer === 'object' && !Array.isArray(raw.modelAnswer)) {
    const english = clean(raw.modelAnswer.english, LIMITS.modelAnswer)
    const chinese = clean(raw.modelAnswer.chinese, LIMITS.translation)
    // If the model offered one, it must be complete. If it omitted the field
    // entirely that is fine — the coach output does not depend on it.
    if (english || chinese) {
      if (!english) {
        return { ok: false, error: 'modelAnswer was provided but modelAnswer.english is empty.' }
      }
      if (!chinese) {
        return { ok: false, error: 'modelAnswer was provided but modelAnswer.chinese is empty.' }
      }
      modelAnswer = {
        english,
        chinese,
        wordCount: countWords(english),
        note: clean(raw.modelAnswer.note, LIMITS.note),
      }
    }
  }

  // --- relevance ----------------------------------------------------------
  // Measured against the analysis and the arguments. The topic category is
  // deliberately NOT included: it is broad enough that almost any generic
  // answer would pass, which is exactly the failure we are guarding against.
  const analysisText = [coreQuestion, ...requirements, ...constraints, ...subject, stanceHint].join(' ')
  const argumentsText = argumentsOut
    .map((arg) => `${arg.title} ${arg.explanation} ${arg.scenario.setup} ${arg.scenario.action} ${arg.scenario.result} ${arg.scenario.whyItSupports}`)
    .join(' ')

  const analysisOverlap = lexicalOverlap(question, analysisText)
  const argumentsOverlap = lexicalOverlap(question, argumentsText)
  const overlap = Math.min(analysisOverlap, argumentsOverlap)

  if (overlap < MIN_RELEVANCE_OVERLAP) {
    return {
      ok: false,
      error: `The arguments do not address this question (only ${Math.round(overlap * 100)}% of its key words appear; analysis ${Math.round(analysisOverlap * 100)}%, arguments ${Math.round(argumentsOverlap * 100)}%).`,
    }
  }

  return {
    ok: true,
    data: {
      analysis: { taskType, coreQuestion, requirements, constraints, stanceHint, subject },
      arguments: argumentsOut,
      language: { keyExpressions, sentencePatterns, vocabulary },
      modelAnswer,
      relevance: {
        addressesQuestion: true,
        notes: clean(raw.relevanceCheck?.notes, LIMITS.note),
        lexicalOverlap: overlap,
        analysisOverlap,
        argumentsOverlap,
      },
      source: 'ai',
    },
  }
}
