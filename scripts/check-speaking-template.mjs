/**
 * Throwaway check for the local speaking-coach template (src/services/speakingTemplate.ts).
 * Run with:  node --import ./scripts/register-ts.mjs scripts/check-speaking-template.mjs
 *
 * The bug this guards against: the old questionTopicWords() returned raw
 * stopwords ("more", "important", "have", "enjoy"), and templateScenario joined
 * them with " or " to produce sentences like
 *   "Imagine a student is dealing with more or important or have or enjoy鈥?
 *
 * Covers: education / technology / social questions, stopword-heavy stems,
 * stems too short to identify a subject, that the two arguments genuinely
 * differ, that no sentence splices keywords together with " or ", and that the
 * isHypothetical flag survives. Finally it runs the invariants across the whole
 * real 104-question bank.
 */
import {
  extractQuestionConcepts,
  primaryQuestionConcept,
  naturalJoin,
  buildTemplateResult,
  buildTemplateScenario,
  describeTemplateContext,
} from '../src/services/speakingTemplate.ts'
import { TOPICS } from '../src/data/topics.ts'
import { REASONS } from '../src/data/reasons.ts'

let failures = 0
let checks = 0

function check(name, condition, detail = '') {
  checks += 1
  if (condition) {
    console.log(`PASS  ${name}${detail ? `  (${detail})` : ''}`)
  } else {
    failures += 1
    console.log(`FAIL  ${name}${detail ? `  -> ${detail}` : ''}`)
  }
}

/* ------------------------------------------------------------------ *
 * Shared invariants
 * ------------------------------------------------------------------ */

/** Words that must never be presented as "the subject" of a question. */
const FORBIDDEN_SUBJECT_WORDS = new Set([
  'more', 'most', 'important', 'have', 'has', 'had', 'enjoy', 'enjoys',
  'thing', 'things', 'way', 'ways', 'time', 'times', 'people', 'others',
  'some', 'any', 'somebody', 'someone', 'everything', 'better',
  'best', 'growing', 'reading', 'doing', 'requires', 'serious', 'worth',
  'alone', 'instead', 'outside', 'learner', 'start', 'affects',
  'complicated', 'simpler', 'healthier', 'extra', 'prioritize', 'solution',
  'friend', 'friends', 'would', 'could', 'should', 'their',
  'there', 'which', 'what', 'when', 'where', 'whether', 'discuss',
  'advantages', 'disadvantages', 'agree', 'disagree', 'following', 'statement',
  'question', 'think', 'prefer', 'prefers', 'favorite', 'favourite', 'opinion',
  'explain', 'why', 'many', 'multiple', 'physical', 'throughout', 'experienced',
])

const VERB_FORMS = /(?:ing|ed|ise|ize|ified)$/

/** Cues that mark a scenario as invented. Mirrors server/validate-speaking.mjs. */
const HYPOTHETICAL_CUES = [
  'imagine', 'suppose', 'assume', 'pretend', 'what if', "let's say", 'picture',
  'consider', 'if you', 'if a ', 'if your', 'if someone', 'hypothetical',
]

/** Wording that would imply a real study, person, survey or statistic. */
const FABRICATED_EVIDENCE = [
  'study shows', 'study found', 'research shows', 'research found', 'survey',
  'statistics', 'according to', 'percent', '%', 'data shows', 'report found',
  'it is well known', 'proven', 'evidence shows',
]

function makeTopic(question, category, questionType, difficulty = 'Medium') {
  return {
    id: `t-${question.length}-${category}`,
    question,
    category,
    questionType,
    difficulty,
    preparationTime: 15,
    speakingTime: 45,
  }
}

function assertSubjectIsClean(label, subject) {
  check(`${label}: subject has no function words`, Array.isArray(subject) && subject.length > 0,
    `subject=${JSON.stringify(subject)}`)
  const bad = (subject ?? []).filter((s) =>
    s.split(/\s+/).some((w) => FORBIDDEN_SUBJECT_WORDS.has(w.toLowerCase())),
  )
  check(`${label}: no stopword leaked into subject`, bad.length === 0,
    bad.length ? `leaked=${JSON.stringify(bad)}` : `subject=${JSON.stringify(subject)}`)
  const verbish = (subject ?? []).filter((s) => VERB_FORMS.test(s.split(' ').pop() ?? ''))
  check(`${label}: no verb forms as subjects`, verbish.length === 0,
    verbish.length ? `verbish=${JSON.stringify(verbish)}` : '')
  const stems = (subject ?? []).map((s) => s.toLowerCase().replace(/(?:ing|ed|es|s)$/, ''))
  check(`${label}: no duplicate concepts`, new Set(stems).size === stems.length,
    JSON.stringify(subject))
  check(`${label}: at most 3 concepts`, subject.length <= 3, `n=${subject.length}`)
}

function assertScenarioIsSound(label, arg, scenarioFields) {
  check(`${label}: isHypothetical is true`, scenarioFields.isHypothetical === true)
  const text = scenarioFields.setup + ' ' + scenarioFields.action + ' ' +
    scenarioFields.result + ' ' + scenarioFields.whyItSupports
  check(`${label}: scenario has an imagining cue`,
    HYPOTHETICAL_CUES.some((c) => text.toLowerCase().includes(c)),
    scenarioFields.setup.slice(0, 58))

  const fabrication = FABRICATED_EVIDENCE.filter((w) => text.toLowerCase().includes(w))
  check(`${label}: invents no study / statistic / real person`, fabrication.length === 0,
    fabrication.length ? `found=${JSON.stringify(fabrication)}` : '')

  const joined = scenarioFields.setup
  check(`${label}: no "X or Y" keyword splicing in setup`,
    !/\b\w+ or \w+ or \w+/.test(joined), joined.slice(0, 70))

  const distinct = new Set(Object.values(scenarioFields).filter((v) => typeof v === 'string'))
  check(`${label}: setup/action/result/why are all different`,
    distinct.size === 4, `distinct=${distinct.size}`)

  for (const field of ['setup', 'action', 'result', 'whyItSupports']) {
    const value = scenarioFields[field]
    check(`${label}: ${field} is a full sentence`,
      value.length > 25 && /[.!?]$/.test(value.trim()), `len=${value.length}`)
  }
  void arg
}

function assertArgumentsDiffer(label, result) {
  const [a, b] = result.arguments
  check(`${label}: exactly two arguments`, result.arguments.length === 2)
  check(`${label}: arguments have different titles`, a.title !== b.title,
    `${a.title} vs ${b.title}`)
  check(`${label}: arguments are different reasons`, a.title !== b.title)
  for (const field of ['setup', 'action', 'result', 'whyItSupports']) {
    check(`${label}: scenario.${field} differs between arguments`,
      a.scenario[field] !== b.scenario[field])
  }
  // The old template produced near-identical prose with one word swapped.
  const words = (s) => new Set(s.toLowerCase().match(/[a-z]+/g) ?? [])
  const aWords = words(a.scenario.setup)
  const shared = [...words(b.scenario.setup)].filter((w) => aWords.has(w)).length
  const overlap = shared / Math.max(1, Math.min(aWords.size, words(b.scenario.setup).size))
  check(`${label}: setups are not one-word swaps`, overlap < 0.8,
    `overlap=${overlap.toFixed(2)}`)
}

function assertContract(label, result) {
  check(`${label}: source is template`, result.source === 'template')
  check(`${label}: fallbackReason is set`, typeof result.fallbackReason === 'string' &&
    result.fallbackReason.length > 0)
  check(`${label}: analysis has the full contract`,
    typeof result.analysis.taskType === 'string' && result.analysis.taskType.length > 0 &&
    typeof result.analysis.coreQuestion === 'string' && result.analysis.coreQuestion.length > 0 &&
    result.analysis.requirements.length > 0 &&
    result.analysis.constraints.length > 0 &&
    typeof result.analysis.stanceHint === 'string' && result.analysis.stanceHint.length > 0 &&
    result.analysis.subject.length > 0)
  check(`${label}: modelAnswer is honest about being a template`,
    result.modelAnswer !== null &&
    /not written by a model/i.test(result.modelAnswer.note) &&
    result.modelAnswer.english.length > 40 &&
    result.modelAnswer.chinese.length > 0 &&
    result.modelAnswer.wordCount > 0)
  check(`${label}: language material is populated`,
    result.language.keyExpressions.length > 0 &&
    result.language.sentencePatterns.length > 0 &&
    result.language.vocabulary.length > 0)
  check(`${label}: no un-substituted placeholder in any text`,
    !JSON.stringify(result).includes('{option}') && !JSON.stringify(result).includes('undefined'))
}

console.log('=== concept extraction ===')

/* --- education --- */
{
  const q = 'A school wants to introduce a new teaching method but faces resistance from experienced teachers. What solution would you propose?'
  const c = extractQuestionConcepts(q)
  check('education: keeps the real concept "teaching method"', c.includes('teaching method'),
    JSON.stringify(c))
  check('education: drops "solution" (task framing)', !c.includes('solution'))
  check('education: drops the adjective "experienced"', !c.includes('experienced'))
  assertSubjectIsClean('education', c)
}

/* --- technology --- */
{
  const q = 'What are the advantages and disadvantages of children growing up with smartphones and tablets?'
  const c = extractQuestionConcepts(q)
  check('technology: keeps smartphones + tablets', c.includes('smartphones') && c.includes('tablets'),
    JSON.stringify(c))
  check('technology: drops the gerund "growing"', !c.includes('growing'))
  check('technology: primary concept is "smartphones"', primaryQuestionConcept(q) === 'smartphones',
    String(primaryQuestionConcept(q)))
  assertSubjectIsClean('technology', c)
}

/* --- social --- */
{
  const q = 'Do you agree or disagree? Everyone has a responsibility to help those in need, even if it requires personal sacrifice.'
  const c = extractQuestionConcepts(q)
  check('social: keeps responsibility + sacrifice', c.includes('responsibility') && c.includes('sacrifice'),
    JSON.stringify(c))
  check('social: drops "requires"', !c.includes('requires'))
  check('social: drops "personal" (quality adjective)', !c.includes('personal'))
  assertSubjectIsClean('social', c)
}

/* --- stopword-heavy stem --- */
{
  const q = 'Do you agree or disagree? The best way to learn something new is by doing it rather than reading about it.'
  const c = extractQuestionConcepts(q)
  check('stopword-heavy: drops best/way/something/rather/doing/reading',
    !c.some((w) => /^(best|way|something|rather|doing|reading)$/.test(w)),
    JSON.stringify(c))
  check('stopword-heavy: does not pad the list', c.length <= 2, JSON.stringify(c))
  check('stopword-heavy: still finds "learn"', c.includes('learn'), JSON.stringify(c))
  assertSubjectIsClean('stopword-heavy', c)
}

/* --- too short to identify a subject --- */
for (const q of ['Why?', 'Do you think so?', 'What do you think?', 'Is it good?']) {
  const c = extractQuestionConcepts(q)
  check(`short question "${q}": returns nothing rather than filler`, c.length === 0,
    JSON.stringify(c))
  check(`short question "${q}": primary is null`, primaryQuestionConcept(q) === null)
}

/* --- multi-word concepts are preserved --- */
{
  check('phrase: "economic growth" kept whole',
    extractQuestionConcepts('A community is divided over whether to prioritize economic growth or cultural preservation. What suggestions would you make?')
      .includes('economic growth'))
  check('phrase: "cultural preservation" kept whole',
    extractQuestionConcepts('A community is divided over whether to prioritize economic growth or cultural preservation. What suggestions would you make?')
      .includes('cultural preservation'))
  check('phrase: "second-hand products" keeps the hyphen',
    extractQuestionConcepts('Discuss the advantages and disadvantages of buying second-hand products instead of new ones.')
      .includes('second-hand products'))
  check('phrase: "organic food" kept whole',
    extractQuestionConcepts('Some people prefer to buy organic food, while others do not think it is worth the extra cost. Which do you prefer?')
      .includes('organic food'))
}

console.log('\n=== naturalJoin ===')
check('naturalJoin: one item', naturalJoin(['smartphones']) === 'smartphones')
check('naturalJoin: two items use "and"', naturalJoin(['smartphones', 'tablets']) === 'smartphones and tablets')
check('naturalJoin: three items use a serial list',
  naturalJoin(['a', 'b', 'c']) === 'a, b and c', naturalJoin(['a', 'b', 'c']))
check('naturalJoin: empty', naturalJoin([]) === '')
check('naturalJoin: never uses " or "', !naturalJoin(['a', 'b', 'c']).includes(' or '))

console.log('\n=== full template output ===')

/* --- the exact scenario the bug report used to produce --- */
{
  const topic = makeTopic(
    'Do you agree or disagree? It is more important to have a job you enjoy than a job that pays well.',
    'work-career', 'agreement')
  const result = buildTemplateResult(topic, 'AI is not configured on this server.', 'detail')
  const ctx = describeTemplateContext(topic)

  console.log(`      concepts=${JSON.stringify(ctx.concepts)}  focus=${JSON.stringify(ctx.focus)}`)
  check('regression: no "more or important or have or enjoy" splicing',
    !result.arguments.some((a) => /\bor\b/.test(a.scenario.setup)),
    result.arguments[0].scenario.setup.slice(0, 70))
  check('regression: "enjoy" is not treated as a subject', !ctx.concepts.includes('enjoy'),
    JSON.stringify(ctx.concepts))
  assertSubjectIsClean('work-career', result.analysis.subject)
  assertArgumentsDiffer('work-career', result)
  assertContract('work-career', result)
  for (const arg of result.arguments) assertScenarioIsSound('work-career', arg, arg.scenario)
}

/* --- education --- */
{
  const topic = makeTopic(
    'A school wants to introduce a new teaching method but faces resistance from experienced teachers. What solution would you propose?',
    'education', 'suggestion-solution')
  const result = buildTemplateResult(topic, 'AI unavailable.', null)
  console.log(`      subject=${JSON.stringify(result.analysis.subject)}`)
  check('education: subject is not the category fallback', !result.analysis.subject.includes('Education'),
    JSON.stringify(result.analysis.subject))
  assertSubjectIsClean('education', result.analysis.subject)
  assertArgumentsDiffer('education', result)
  assertContract('education', result)
  for (const arg of result.arguments) assertScenarioIsSound('education', arg, arg.scenario)
}

/* --- technology --- */
{
  const topic = makeTopic(
    'What are the advantages and disadvantages of children growing up with smartphones and tablets?',
    'technology', 'advantages-disadvantages')
  const result = buildTemplateResult(topic, 'AI unavailable.', null)
  console.log(`      subject=${JSON.stringify(result.analysis.subject)}`)
  check('technology: taskType is compare', result.analysis.taskType === 'compare')
  check('technology: constraints read naturally',
    result.analysis.constraints.every((c) => !c.includes('advantages-disadvantages')),
    result.analysis.constraints.join(' | '))
  assertSubjectIsClean('technology', result.analysis.subject)
  assertArgumentsDiffer('technology', result)
  assertContract('technology', result)
  for (const arg of result.arguments) assertScenarioIsSound('technology', arg, arg.scenario)
}

/* --- social --- */
{
  const topic = makeTopic(
    'Do you agree or disagree? Everyone has a responsibility to help those in need, even if it requires personal sacrifice.',
    'values', 'agreement')
  const result = buildTemplateResult(topic, 'AI unavailable.', null)
  check('social: taskType is opinion', result.analysis.taskType === 'opinion')
  assertSubjectIsClean('social', result.analysis.subject)
  assertArgumentsDiffer('social', result)
  assertContract('social', result)
  for (const arg of result.arguments) assertScenarioIsSound('social', arg, arg.scenario)
}

/* --- no reliable subject -> generic frame must say so --- */
{
  const topic = makeTopic('Why?', 'education', 'agreement')
  const result = buildTemplateResult(topic, 'AI unavailable.', null)
  const ctx = describeTemplateContext(topic)
  check('generic: no focus was invented', ctx.focus === null)
  check('generic: subject falls back to the category', result.analysis.subject.length === 1 &&
    result.analysis.subject[0] === 'Education', JSON.stringify(result.analysis.subject))
  check('generic: both arguments disclose the generic frame',
    result.arguments.every((a) => /general practice frame/i.test(a.scenario.whyItSupports)),
    result.arguments[0].scenario.whyItSupports.slice(0, 70))
  check('generic: scenario does not pretend to describe the question',
    result.arguments.every((a) => !a.scenario.setup.includes(topic.question)))
  assertArgumentsDiffer('generic', result)
  assertContract('generic', result)
  for (const arg of result.arguments) assertScenarioIsSound('generic', arg, arg.scenario)
}

console.log('\n=== invariants across the whole real question bank ===')

{
  const bank = TOPICS
  let subjectViolations = 0
  let spliceViolations = 0
  let hypoViolations = 0
  let duplicateArguments = 0
  let evidenceViolations = 0
  let placeholderViolations = 0
  let emptyField = 0
  const offending = []

  for (const topic of bank) {
    const result = buildTemplateResult(topic, 'AI unavailable.', null)
    const units = result.analysis.subject.flatMap((s) => s.split(/\s+/)).map((w) => w.toLowerCase())
    const badUnits = units.filter((w) => FORBIDDEN_SUBJECT_WORDS.has(w))
    if (badUnits.length) {
      subjectViolations += 1
      offending.push(`${topic.question.slice(0, 46)}… -> ${JSON.stringify(result.analysis.subject)}`)
    }
    if (result.arguments.some((a) => /\b\w+ or \w+ or \w+/.test(a.scenario.setup))) spliceViolations += 1
    if (result.arguments.some((a) => a.scenario.isHypothetical !== true)) hypoViolations += 1
    if (result.arguments[0].title === result.arguments[1].title) duplicateArguments += 1
    const all = JSON.stringify(result).toLowerCase()
    if (FABRICATED_EVIDENCE.some((w) => all.includes(w))) evidenceViolations += 1
    if (all.includes('{option}') || all.includes('undefined')) placeholderViolations += 1
    for (const arg of result.arguments) {
      for (const f of ['setup', 'action', 'result', 'whyItSupports']) {
        if (!arg.scenario[f] || arg.scenario[f].length < 20) emptyField += 1
      }
    }
  }

  check(`bank (${bank.length} questions): no stopword reaches analysis.subject`, subjectViolations === 0,
    subjectViolations ? offending.join(' | ') : '')
  check(`bank (${bank.length}): no "X or Y or Z" keyword splicing`, spliceViolations === 0,
    spliceViolations ? `${spliceViolations} questions affected` : '')
  check(`bank (${bank.length}): isHypothetical preserved everywhere`, hypoViolations === 0)
  check(`bank (${bank.length}): the two arguments are never the same reason`, duplicateArguments === 0)
  check(`bank (${bank.length}): no fabricated study / statistic / real person`, evidenceViolations === 0,
    evidenceViolations ? `${evidenceViolations} questions affected` : '')
  check(`bank (${bank.length}): no placeholders or "undefined" leaking`, placeholderViolations === 0)
  check(`bank (${bank.length}): every scenario field is a real sentence`, emptyField === 0)
}

console.log('\n=== every reason produces its own scenario prose ===')
{
  // Direct per-reason coverage: no topic in the bank has to be routed a certain
  // way for a reason to be exercised.
  const seenSetups = new Map()
  let empty = 0
  let notHypothetical = 0
  let spliced = 0
  let sameAsOtherIndex = 0

  for (const reason of REASONS) {
    for (const index of [0, 1]) {
      const s = buildTemplateScenario(reason, index, null)
      const text = `${s.setup} ${s.action} ${s.result}`
      if (s.setup.length < 20 || s.action.length < 20 || s.result.length < 20) empty += 1
      if (s.isHypothetical !== true) notHypothetical += 1
      if (/\b\w+ or \w+ or \w+/.test(text)) spliced += 1
      if (seenSetups.has(text)) sameAsOtherIndex += 1
      seenSetups.set(text, reason.id)
    }
  }

  check(`all ${REASONS.length} reasons: fields are populated`, empty === 0)
  check(`all ${REASONS.length} reasons: isHypothetical preserved`, notHypothetical === 0)
  check(`all ${REASONS.length} reasons: no keyword splicing`, spliced === 0)
  check(`all ${REASONS.length} reasons: index 0 and index 1 differ`, sameAsOtherIndex === 0,
    sameAsOtherIndex ? `${sameAsOtherIndex} collisions` : `${seenSetups.size} distinct scenarios`)
}

console.log(`\nchecks=${checks} failures=${failures}`)
if (failures > 0) {
  console.log('FAILURES PRESENT')
  process.exit(1)
}
console.log('ALL CHECKS PASSED')