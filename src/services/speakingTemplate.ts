/**
 * Local-template content for the speaking coach.
 *
 * This module produces the SAME `AnswerResult` shape as the AI coach, so the
 * UI has a single thing to render and `result.source` decides whether the
 * learner is told the text came from a model or from this template.
 *
 * Two rules drive everything here:
 *
 *   1. Never invent evidence. The template has no data sources, so it must not
 *      imply that a study, a survey, a statistic or a named person's experience
 *      exists. Every scenario is an explicitly imaginary practice illustration.
 *
 *   2. Never stuff the question's keywords into a sentence. Extracting a few
 *      words from a question and joining them with "or" produces nonsense
 *      ("...dealing with more or important or have or enjoy"). If the question's
 *      subject cannot be identified with confidence, the template says so and
 *      falls back to a clearly-labelled general practice frame instead of
 *      fabricating question-specific content.
 */

import type { Topic } from '../data/topics'
import { CATEGORIES, QUESTION_TYPES } from '../data/categories'
import { REASONS, type Reason } from '../data/reasons'
import { countWords } from '../utils/random'
import type {
  SpeakingAnalysis,
  SpeakingArgument,
  SpeakingLanguage,
  SpeakingModelAnswer,
  SpeakingScenario,
} from './speakingAiClient'
import type { AnswerResult } from './answerGenerator'

/* ------------------------------------------------------------------ *
 * 1. Question concept extraction
 * ------------------------------------------------------------------ */

/**
 * Words that carry no information about what a question is *about*: function
 * words, exam/task framing, auxiliaries, pronouns, and the generic verbs and
 * adjectives that appear in almost every English question.
 */
const STOP_WORDS = new Set([
  // articles, determiners, prepositions, conjunctions
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'such', 'each', 'every',
  'both', 'all', 'any', 'some', 'few', 'several', 'many', 'much', 'more', 'most',
  'less', 'least', 'other', 'another', 'own', 'same',
  'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'onto',
  'about', 'over', 'under', 'after', 'before', 'during', 'between', 'through',
  'than', 'then', 'when', 'while', 'where', 'which', 'who', 'whom', 'whose',
  'what', 'why', 'how', 'whether', 'if', 'as', 'because', 'so', 'but', 'or',
  'and', 'nor', 'yet', 'also', 'too', 'per', 'vs',
  // pronouns
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
  'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their', 'theirs',
  'mine', 'ours', 'yours', 'myself', 'yourself', 'themselves',
  'someone', 'somebody', 'something', 'anyone', 'anybody', 'anything',
  'everyone', 'everybody', 'everything', 'nobody', 'nothing', 'one', 'ones',
  // auxiliaries and modals
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does',
  'did', 'done', 'have', 'has', 'had', 'having', 'will', 'would', 'shall',
  'should', 'can', 'could', 'may', 'might', 'must', 'ought', 'need',
  // exam / task framing
  'question', 'questions', 'answer', 'answers', 'statement', 'statements',
  'opinion', 'opinions', 'discussion', 'discuss', 'paragraph', 'essay',
  'example', 'examples', 'reason', 'reasons', 'suggestion', 'suggestions',
  'advice', 'propose', 'proposal', 'view', 'views', 'agree', 'disagree',
  'agreement', 'preference', 'prefer', 'prefers', 'preferred', 'mention',
  'identify', 'explain', 'express', 'state', 'describe', 'compare',
  'following', 'advantage', 'advantages', 'disadvantage', 'disadvantages',
  'pros', 'cons', 'given', 'double',
  // generic verbs
  'make', 'makes', 'made', 'making', 'take', 'takes', 'took', 'taking',
  'get', 'gets', 'got', 'give', 'gives', 'gave', 'use', 'uses', 'using',
  'used', 'want', 'wants', 'needed', 'needs', 'require', 'requires',
  'required', 'know', 'knows', 'knew', 'think', 'thinks', 'thought',
  'see', 'sees', 'look', 'looks', 'find', 'finds', 'face', 'faces', 'facing',
  'help', 'helps', 'offer', 'offers', 'suggest', 'suggests', 'ask', 'asks',
  'go', 'goes', 'going', 'come', 'comes', 'coming', 'keep', 'keeps',
  'put', 'puts', 'let', 'lets', 'try', 'tries', 'trying', 'work', 'works',
  'working', 'study', 'studies', 'studying', 'live', 'lives', 'living',
  'lead', 'leads', 'turn', 'turns', 'become', 'becomes', 'begin', 'begins',
  'friend', 'friends', 'others', 'alone', 'together', 'apart', 'instead',
  'solution', 'solutions', 'affect', 'affects', 'affecting', 'start', 'starts',
  'introduce', 'introduces', 'introducing', 'adopt', 'adopts',
  'outside', 'inside', 'abroad', 'prioritize', 'prioritise', 'prioritises',
  'prioritizes', 'prioritized', 'focus', 'focuses', 'focused', 'consider',
  'considers', 'considered', 'throughout', 'across', 'among', 'amongst',
  'despite', 'besides', 'within', 'without', 'beyond', 'toward', 'towards',
  'whether', 'instead',
  // Base-form verbs: they rarely name the subject of a question, and showing
  // "enjoy" as a topic reads as noise.
  'enjoy', 'enjoys', 'enjoyed', 'read', 'reads', 'write', 'writes', 'written',
  'speak', 'speaks', 'eat', 'eats', 'sleep', 'sleeps', 'play', 'plays',
  'watch', 'watches', 'listen', 'listens', 'buy', 'buys', 'sell', 'sells',
  'pay', 'pays', 'paid', 'spend', 'spends', 'earn', 'earns', 'lose', 'loses',
  'win', 'wins', 'travel', 'travels', 'drive', 'drives', 'walk', 'walks',
  'cook', 'cooks', 'dance', 'dances', 'sing', 'sings', 'drink', 'drinks',
  'meet', 'meets', 'marry', 'marries', 'hope', 'hopes', 'wish', 'wishes',
  'feel', 'feels', 'seem', 'seems', 'appear', 'appears', 'remain', 'remains',
  'stay', 'stays', 'leave', 'leaves', 'arrive', 'arrives', 'cook', 'cook',
  'avoid', 'avoids', 'allow', 'allows', 'believe', 'believes', 'realise',
  'realize', 'realizes', 'realise', 'accept', 'accepts', 'refuse', 'refuses',
  'discussed', 'wonder', 'wonders', 'guess', 'guesses', 'seeking', 'facing',
  // generic adjectives / adverbs
  'very', 'really', 'quite', 'rather', 'always', 'never', 'often', 'sometimes',
  'usually', 'already', 'still', 'even', 'only', 'just',
  'best', 'better', 'worse', 'worst', 'good', 'bad', 'great', 'big', 'large',
  'small', 'little', 'long', 'short', 'high', 'low', 'new', 'old', 'young',
  'different', 'similar', 'important', 'possible', 'available',
  'main', 'major', 'minor', 'real', 'true', 'actual', 'certain', 'specific',
  'general', 'common', 'usual', 'normal', 'whole', 'entire', 'single',
  'worth', 'serious', 'experienced', 'complicated', 'simple', 'simpler',
  // generic nouns that name a "thing" rather than a subject
  'way', 'ways', 'thing', 'things', 'stuff', 'kind', 'kinds', 'sort', 'sorts',
  'type', 'types', 'part', 'parts', 'lot', 'lots', 'bit', 'bits', 'piece',
  'pieces', 'area', 'areas', 'case', 'cases', 'point', 'points', 'factor',
  'factors', 'aspect', 'aspects', 'level', 'levels', 'number', 'numbers',
  'time', 'times', 'day', 'days', 'week', 'weeks', 'month', 'months',
  'year', 'years', 'people', 'person', 'life', 'lives', 'place', 'places',
  'change', 'changes', 'idea', 'ideas', 'situation', 'works',
])

/**
 * Content-ish words that are still too abstract to name "the subject" of a
 * question. They are not blocked outright — a question really can be *about*
 * "health" — but they are ranked far below a specific term such as "smartphones".
 */
const ABSTRACT_NOUNS = new Set([
  'life', 'world', 'society', 'people', 'person', 'thing', 'things', 'stuff',
  'way', 'ways', 'idea', 'ideas', 'problem', 'problems', 'issue', 'issues',
  'result', 'results', 'effect', 'effects', 'change', 'changes', 'system',
  'systems', 'area', 'areas', 'need', 'help', 'work', 'works', 'level',
  'important', 'difficult', 'easy', 'hard', 'good', 'better', 'best',
])

/**
 * Base forms of adjectives that describe quality rather than subject matter.
 * Matched against the surface word and against light morphological variants, so
 * "healthier", "healthiest" and "healthy" are all recognised.
 */
const GENERIC_ADJECTIVES = new Set([
  'complicated', 'simple', 'serious', 'worth', 'healthy', 'unhealthy',
  'expensive', 'cheap', 'busy', 'quiet', 'modern', 'traditional', 'popular',
  'useful', 'dangerous', 'safe', 'harmful', 'urgent', 'common', 'frequent',
  'necessary', 'possible', 'important', 'difficult', 'easy', 'hard', 'free',
  'extra', 'personal', 'whole', 'entire', 'right', 'multiple', 'physical',
  'virtual', 'various', 'certain', 'particular', 'specific', 'overall',
])

/** Suffixes that mark a word as a concrete noun rather than a verb. */
const CONTENT_SUFFIXES = [
  'tion', 'sion', 'ment', 'ness', 'ity', 'ism', 'ist', 'ology', 'ance',
  'ence', 'ship', 'hood', 'ics', 'ure', 'age',
]

/**
 * Verb-forming endings. `-ing`/`-ed` are ambiguous in English ("teaching method"
 * is a noun compound), so they cost less than the unambiguous `-ize`/`-ise`.
 */
const AMBIGUOUS_VERB_SUFFIX = /(?:ing|ed)$/
const UNAMBIGUOUS_VERB_SUFFIX = /(?:ise|ize|ify)$/

/** Does this word (or a light variant of it) name a quality rather than a subject? */
function isGenericAdjective(word: string): boolean {
  const stems = new Set([word])
  if (word.length > 5 && word.endsWith('er')) stems.add(word.slice(0, -2))
  if (word.length > 5 && word.endsWith('est')) stems.add(word.slice(0, -3))
  if (word.length > 6 && word.endsWith('ing')) stems.add(word.slice(0, -3))
  if (word.length > 5 && word.endsWith('ly')) stems.add(word.slice(0, -2))
  for (const stem of stems) {
    const candidates = new Set([stem])
    // "healthier" -> "healthi" -> "healthy": English comparatives swap y for i.
    if (stem.length > 3 && stem.endsWith('i')) candidates.add(`${stem.slice(0, -1)}y`)
    for (const candidate of candidates) {
      if (GENERIC_ADJECTIVES.has(candidate)) return true
      if (GENERIC_ADJECTIVES.has(stemOf(candidate))) return true
    }
  }
  return false
}

/**
 * Cheap morphological reduction, used only to de-duplicate. It is deliberately
 * conservative: it never rewrites a word that will be shown to the learner, it
 * only decides whether two words are "the same concept".
 */
function stemOf(word: string): string {
  let w = word
  if (w.length > 4 && w.endsWith('ies')) {
    w = `${w.slice(0, -3)}y`
  } else if (w.length > 4 && /(?:ch|sh|ss|x|z)es$/.test(w)) {
    w = w.slice(0, -2)
  } else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) {
    w = w.slice(0, -1)
  }
  if (w.length > 4 && w.endsWith('ing')) {
    const base = w.slice(0, -3)
    w = /([bdfglmnprt])\1$/.test(base) ? base.slice(0, -1) : base
  } else if (w.length > 4 && w.endsWith('ed')) {
    const base = w.slice(0, -2)
    w = /([bdfglmnprt])\1$/.test(base) ? base.slice(0, -1) : base
  }
  if (w.length > 5 && w.endsWith('ly')) w = w.slice(0, -2)
  if (w.length > 6 && w.endsWith('ness')) w = w.slice(0, -4)
  if (w.length > 6 && w.endsWith('ment')) w = w.slice(0, -4)
  return w
}

interface Candidate {
  text: string
  score: number
  stem: string
  /** Position of the first token, so earlier mentions win ties. */
  index: number
  /** Present on phrases: the stems this phrase replaces. */
  parts?: string[]
}

/**
 * Score a surviving token. Specificity is rewarded rather than relying purely
 * on a block list: long words, mid-sentence capitalisation (proper nouns) and
 * noun-forming suffixes all raise the score, while abstract nouns and
 * verb-shaped words lower it.
 */
/**
 * Score a surviving token. Specificity is rewarded rather than relying purely
 * on a block list: long words, mid-sentence capitalisation (proper nouns) and
 * noun-forming suffixes all raise the score, while abstract nouns, quality
 * adjectives and verb-shaped words lower it.
 *
 * `forPhrase` relaxes the short-word penalty, because a four-letter word such as
 * "food" is weak on its own but perfectly good as the tail of "organic food".
 *
 * The returned score is kept free of any tie-breaking term so that it can be
 * compared against thresholds directly; ordering by position happens at sort
 * time instead.
 */
function scoreToken(
  word: string,
  capitalisedMidSentence: boolean,
  forPhrase = false,
): number {
  let score = Math.min(word.length, 14)

  if (capitalisedMidSentence) score += 6 // "AI", "Internet", "English"
  if (CONTENT_SUFFIXES.some((suffix) => word.endsWith(suffix))) score += 3
  if (ABSTRACT_NOUNS.has(word)) score -= 9
  if (isGenericAdjective(word)) score -= 9
  if (UNAMBIGUOUS_VERB_SUFFIX.test(word)) score -= 7
  else if (AMBIGUOUS_VERB_SUFFIX.test(word)) score -= 5
  if (!forPhrase && word.length <= 4) score -= 3

  return score
}

function capitalisedMidSentence(question: string, tokenIndex: number, matchIndex: number): boolean {
  const raw = question.slice(matchIndex, matchIndex + 400)
  if (!/^[A-Z]/.test(raw)) return false
  if (tokenIndex === 0) return false
  const before = question.slice(0, matchIndex).trimEnd()
  if (before.length === 0) return false
  // A capital that follows a full stop is sentence-initial, not a proper noun.
  return !/[.!?:;]$/.test(before)
}

/**
 * Score the concepts of a question, strongest first.
 *
 * Deliberately returns fewer (possibly none) rather than padding the list — a
 * short, honest list beats a full row of filler.
 */
export function scoreQuestionConcepts(question: string): Candidate[] {
  const matches = [...question.matchAll(/[A-Za-z][A-Za-z'-]*/g)]
  if (matches.length === 0) return []

  const tokens = matches.map((m, i) => {
    const raw = m[0]
    return {
      // `lookup` drops hyphens and apostrophes so "second-hand" matches a
      // stopword entry; `display` keeps the original spelling we show.
      lookup: raw.toLowerCase().replace(/['-]/g, ''),
      display: raw.toLowerCase(),
      index: i,
      matchIndex: m.index ?? 0,
    }
  })

  const usable = (t: (typeof tokens)[number]) =>
    t.lookup.length > 2 && !STOP_WORDS.has(t.lookup) && !Number.isFinite(Number(t.lookup))

  /**
   * A word is only strong enough to sit inside a concept phrase if it is not
   * itself noise. Gerunds get a lower bar because English uses them attributively
   * ("teaching method") far more often than as verbs — but not a free one, or
   * "reading physical books" starts passing.
   */
  function partFloor(word: string, position: 'head' | 'tail'): number {
    if (position === 'head' && word.endsWith('ing')) return 3
    return 4
  }

  const scoreOf = (t: (typeof tokens)[number], forPhrase = false) =>
    scoreToken(t.lookup, capitalisedMidSentence(question, t.index, t.matchIndex), forPhrase)

  // Multi-word concepts ("social media", "teaching method", "economic growth")
  // only survive the per-word split if adjacency is looked at explicitly.
  const phrases: Candidate[] = []
  for (let i = 0; i + 1 < tokens.length; i += 1) {
    const a = tokens[i]
    const b = tokens[i + 1]
    if (!usable(a) || !usable(b)) continue
    const scoreA = scoreOf(a, true)
    const scoreB = scoreOf(b, true)
    if (scoreA < partFloor(a.lookup, 'head')) continue
    if (scoreB < partFloor(b.lookup, 'tail')) continue
    phrases.push({
      text: `${a.display} ${b.display}`,
      score: scoreA + scoreB + 8, // phrase bonus
      stem: `${stemOf(a.lookup)} ${stemOf(b.lookup)}`,
      parts: [stemOf(a.lookup), stemOf(b.lookup)],
      index: a.index,
    })
  }

  const singles: Candidate[] = tokens
    .filter(usable)
    .map((t) => ({
      text: t.display,
      score: scoreOf(t),
      stem: stemOf(t.lookup),
      index: t.index,
    }))

  // A phrase replaces its own parts rather than appearing alongside them, so
  // "economic growth" does not also show up as "economic" and "growth".
  const goodPhrases = phrases.filter((p) => p.score > 6)
  const coveredParts = new Set(goodPhrases.flatMap((p) => p.parts))

  const candidates = [...goodPhrases, ...singles.filter((s) => !coveredParts.has(s.stem))].sort(
    (a, b) => b.score - a.score || a.index - b.index, // earlier mention wins a tie
  )

  const accepted: Candidate[] = []
  const seen = new Set<string>()
  const MIN_SCORE = 4
  for (const cand of candidates) {
    if (accepted.length >= 3) break
    if (cand.score < MIN_SCORE) break
    if (seen.has(cand.stem)) continue
    seen.add(cand.stem)
    accepted.push(cand)
  }

  return accepted
}

/**
 * What the question is about, in the order the learner reads it.
 * Shorter than three is a normal, honest result, not a failure.
 */
export function extractQuestionConcepts(question: string): string[] {
  return [...scoreQuestionConcepts(question)]
    .sort((a, b) => a.index - b.index)
    .map((c) => c.text)
}

/**
 * The single strongest concept. Scenarios anchor on one noun phrase rather than
 * on a list, so a three-concept question still produces a natural sentence.
 */
export function primaryQuestionConcept(question: string): string | null {
  const scored = scoreQuestionConcepts(question)
  if (scored.length === 0) return null
  return scored.reduce((best, c) => (c.score > best.score ? c : best)).text
}

/** "a", "a and b", "a, b and c" — never a mechanical "a or b or c". */
export function naturalJoin(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/* ------------------------------------------------------------------ *
 * 2. Reason material for the scenarios
 * ------------------------------------------------------------------ */

interface ReasonMaterial {
  /** A concrete everyday situation. Always singular, so the frames below stay grammatical. */
  setting: string
  /** What the person actually does. Infinitive-compatible. */
  action: string
  /** The observable outcome. A clause. */
  outcome: string
}

/**
 * Hand-written, invented illustrations — one set per reason. None of them
 * claims that anything was measured or that a real person did this.
 */
const REASON_MATERIAL: Record<string, ReasonMaterial> = {
  'time-efficiency': {
    setting: 'a commuter whose week has quietly filled up with small errands',
    action: 'batch those errands into one trip and plan the rest of the week in advance',
    outcome: 'the same jobs finish sooner, and there is time left over at the end of the day',
  },
  'cost-effectiveness': {
    setting: 'a household watching a budget that no longer stretches to the end of the month',
    action: 'replace one expensive recurring item with a cheaper equivalent',
    outcome: 'the money that used to disappear each month is still there when the month ends',
  },
  convenience: {
    setting: 'someone whose day is split between home, work and several other places',
    action: 'handle one routine errand from a phone instead of travelling to do it',
    outcome: 'that errand takes a couple of minutes and no longer has to be scheduled around anything else',
  },
  'learning-growth': {
    setting: 'a beginner trying to pick up a skill from nothing',
    action: 'practise a little every day and ask a more experienced person to correct mistakes early',
    outcome: 'progress that was hard to see week to week becomes obvious by the end of a term',
  },
  'health-well-being': {
    setting: 'someone whose routine has drifted into staying seated all day',
    action: 'add a short walk and a fixed bedtime, and keep both for four weeks',
    outcome: 'sleep settles first, and energy through the afternoon stops dipping',
  },
  'social-connection': {
    setting: 'a newcomer who does not know anyone locally yet',
    action: 'join one regular group activity and keep turning up on the quiet weeks too',
    outcome: 'a few names become familiar, and a free weekend no longer means spending it alone',
  },
  flexibility: {
    setting: 'someone whose days no longer fit the shape of a fixed nine-to-five',
    action: 'move one recurring commitment to a time that actually suits them',
    outcome: 'the week stops feeling like a series of clashes and can be arranged around other obligations',
  },
  'quality-depth': {
    setting: 'a learner choosing between a crowded course and one with far more attention',
    action: 'stay with the smaller group and ask questions instead of racing ahead',
    outcome: 'the material is harder, but it stays with them and they can take it further than before',
  },
  'safety-stability': {
    setting: 'someone weighing a dependable option against a risky one',
    action: 'keep the dependable option open and test the risky one on a small, reversible scale',
    outcome: 'nothing falls apart, and there is still a way back if the new approach does not work',
  },
  'innovation-diversity': {
    setting: 'a small team whose usual way of solving problems has stopped working',
    action: 'bring in people from outside the team to try an unfamiliar approach',
    outcome: 'a few awkward suggestions turn out to be the ones worth testing',
  },
  'responsibility-contribution': {
    setting: 'someone with more free time than they are currently using',
    action: 'sign up for a regular shift rather than a single one-off',
    outcome: 'the organisation can plan around them, and the commitment stays predictable for everyone',
  },
  'interest-motivation': {
    setting: 'someone who has drifted away from an activity they used to enjoy',
    action: 'go back to it for one week with no goal attached to the outcome',
    outcome: 'the interest comes back on its own, without anyone having to push them',
  },
}

/**
 * "Responsibility & Contribution" reads badly inside a sentence, so the ampersand
 * is spelled out wherever the reason name is used as prose.
 */
function reasonInProse(reason: Reason): string {
  return reason.name.toLowerCase().replace(/\s*&\s*/g, ' and ')
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function materialFor(reason: Reason): ReasonMaterial {
  return (
    REASON_MATERIAL[reason.id] ?? {
      setting: `someone facing a decision about ${reason.name.toLowerCase()}`,
      action: `try one small, practical change connected to ${reason.name.toLowerCase()}`,
      outcome: `the effect of ${reason.name.toLowerCase()} becomes visible within a few weeks`,
    }
  )
}

/**
 * Build the invented practice scenario for one argument.
 *
 * `setup` establishes who and where, `action` says what they do, `result` says
 * what changes, and `whyItSupports` explains how the illustration backs the
 * argument. Each index uses a different frame so the two arguments never read
 * like one sentence with a word swapped.
 *
 * When `focus` is null the question's subject could not be identified, so both
 * frames say outright that this is a general practice frame rather than a
 * description of the question.
 */
export function buildTemplateScenario(
  reason: Reason,
  index: number,
  focus: string | null,
): SpeakingScenario {
  const m = materialFor(reason)
  const reasonLower = reasonInProse(reason)

  if (index === 0) {
    return {
      isHypothetical: true,
      // "the question of X" is the frame used for the focus because it stays
      // grammatical for mass nouns ("technology"), singular count nouns
      // ("colleague") and plurals ("smartphones") alike — a bare noun would need
      // an article or an "s" that we cannot choose correctly.
      setup: focus
        ? `Imagine ${m.setting}, where the question of ${focus} is what they are actually weighing up.`
        : `Imagine ${m.setting}.`,
      action: `They start with one small change — ${m.action} — and keep everything else exactly as it is.`,
      result: `Within a few weeks, ${m.outcome}.`,
      whyItSupports: focus
        ? `This is an invented illustration, not something that happened to a real person. It shows ${reasonLower} in one concrete case instead of leaving the argument abstract.`
        : genericScenarioNote(reason),
    }
  }

  return {
    isHypothetical: true,
    setup: focus
      ? `Now suppose the same decision gets made once and then kept, and the question of ${focus} is still the thing in view.`
      : 'Now suppose the same kind of decision gets made once and then kept for a full year.',
    action: `The change is put in place deliberately this time: ${m.action}.`,
    result: `Looking back a year later, ${m.outcome}.`,
    whyItSupports: focus
      ? `Also invented — but it stretches the same idea across a much longer period, so ${reasonLower} shows up as a lasting pattern rather than a quick win.`
      : genericScenarioNote(reason),
  }
}

/**
 * Generic frame used when no question subject could be identified. Kept honest
 * on purpose: it says the template could not read the question instead of
 * quietly producing something that looks question-specific.
 */
export function genericScenarioNote(reason: Reason): string {
  return `This is an invented illustration of ${reasonInProse(reason)} in general. The template could not identify a specific subject in this question, so treat this as a general practice frame rather than a description of the question.`
}

/* ------------------------------------------------------------------ *
 * 3. Analysis / arguments / model answer
 * ------------------------------------------------------------------ */

const OPENERS: Record<string, string[]> = {
  preference: [
    'Looking at the options, I would choose one of them and explain why.',
    'If I had to pick, I would go with one option for the following reasons.',
  ],
  agreement: [
    'I do agree with that statement, for two reasons.',
    'I agree, and here is what makes me so sure.',
  ],
  'advantages-disadvantages': [
    'This is a question with real benefits on one side and real costs on the other.',
    'There are genuine advantages and genuine disadvantages here, and they do not cancel out.',
  ],
  'suggestion-solution': [
    'I think there are a few concrete things that would actually help.',
    'The way forward is to act on something specific rather than to restate the problem.',
  ],
}

const CLOSINGS = [
  'In the end, those two points carry more weight than the objection to them.',
  'That is why I would put those reasons ahead of anything else.',
]

const TYPE_TASKS: Record<
  string,
  { taskType: string; requirements: string[]; hint: string }
> = {
  preference: {
    taskType: 'preference',
    requirements: [
      'Name the option you chose in your first sentence',
      'Give two reasons',
      'Support each with one example',
    ],
    hint: 'Say which option you prefer straight away, then justify it.',
  },
  agreement: {
    taskType: 'opinion',
    requirements: ['State clearly whether you agree', 'Give two reasons', 'Add one example'],
    hint: 'Begin with "I agree that…" or "I disagree because…" — never leave it implicit.',
  },
  'advantages-disadvantages': {
    taskType: 'compare',
    requirements: [
      'Cover the advantages',
      'Cover the disadvantages',
      'Say which side wins overall',
    ],
    hint: 'Give both sides before you say which one matters more.',
  },
  'suggestion-solution': {
    taskType: 'solution',
    requirements: [
      'Name who should act',
      'Give specific, practical suggestions',
      'Explain why they would work',
    ],
    hint: 'Start with who is responsible for the fix, not with the problem itself.',
  },
}

const CATEGORY_REASONS: Record<string, string[]> = {
  education: ['learning-growth', 'time-efficiency', 'quality-depth', 'cost-effectiveness'],
  technology: ['convenience', 'time-efficiency', 'innovation-diversity', 'flexibility'],
  'work-career': ['time-efficiency', 'cost-effectiveness', 'learning-growth', 'flexibility'],
  lifestyle: ['convenience', 'health-well-being', 'cost-effectiveness', 'flexibility'],
  'social-relationships': ['social-connection', 'health-well-being', 'learning-growth', 'flexibility'],
  environment: ['responsibility-contribution', 'health-well-being', 'innovation-diversity', 'cost-effectiveness'],
  entertainment: ['interest-motivation', 'social-connection', 'convenience', 'cost-effectiveness'],
  'consumer-behavior': ['cost-effectiveness', 'convenience', 'quality-depth', 'innovation-diversity'],
  'personal-growth': ['learning-growth', 'interest-motivation', 'flexibility', 'responsibility-contribution'],
  'decision-making': ['time-efficiency', 'quality-depth', 'safety-stability', 'cost-effectiveness'],
  values: ['social-connection', 'responsibility-contribution', 'interest-motivation', 'health-well-being'],
  'change-innovation': ['innovation-diversity', 'flexibility', 'learning-growth', 'time-efficiency'],
  responsibility: ['responsibility-contribution', 'social-connection', 'safety-stability', 'learning-growth'],
}

function reasonsFor(category: string): Reason[] {
  const ids = CATEGORY_REASONS[category] ?? ['time-efficiency', 'convenience']
  const found = ids
    .map((id) => REASONS.find((r) => r.id === id))
    .filter((r): r is Reason => Boolean(r))
  // The contract requires two arguments; never let them collapse into one.
  if (found.length < 2) {
    for (const r of REASONS) {
      if (found.length >= 2) break
      if (!found.some((f) => f.id === r.id)) found.push(r)
    }
  }
  return found
}

export interface TemplateContext {
  /** Identified question concepts; empty when nothing could be trusted. */
  concepts: string[]
  /** "smartphones and tablets", or null when there is no reliable focus. */
  focus: string | null
  categoryName: string
  reasons: [Reason, Reason]
}

export function describeTemplateContext(topic: Topic): TemplateContext {
  const concepts = extractQuestionConcepts(topic.question)
  const categoryName = CATEGORIES.find((c) => c.id === topic.category)?.name ?? topic.category
  const [r1, r2] = reasonsFor(topic.category)
  return {
    concepts,
    focus: primaryQuestionConcept(topic.question),
    categoryName,
    reasons: [r1, r2],
  }
}

function buildAnalysis(topic: Topic, ctx: TemplateContext): SpeakingAnalysis {
  const typeKey = TYPE_TASKS[topic.questionType] ?? TYPE_TASKS.preference
  const typeName =
    QUESTION_TYPES.find((t) => t.id === topic.questionType)?.name ?? topic.questionType
  return {
    taskType: typeKey.taskType,
    coreQuestion: topic.question,
    requirements: typeKey.requirements,
    constraints: [
      `You have about ${topic.speakingTime} seconds to speak.`,
      `This is a ${topic.difficulty.toLowerCase()}-difficulty ${typeName} question.`,
    ],
    stanceHint: typeKey.hint,
    // Honest either way: real concepts when we have them, otherwise the
    // category — never a padded list of filler words.
    subject: ctx.concepts.length > 0 ? ctx.concepts : [ctx.categoryName],
  }
}

function buildArguments(ctx: TemplateContext): SpeakingArgument[] {
  const [first, second] = ctx.reasons
  return [
    {
      label: 'Argument A',
      title: first.name,
      explanation: `${first.description}. ${first.example}`,
      scenario: buildTemplateScenario(first, 0, ctx.focus),
    },
    {
      label: 'Argument B',
      title: second.name,
      explanation: `${second.description}. ${second.example}`,
      scenario: buildTemplateScenario(second, 1, ctx.focus),
    },
  ]
}

function buildModelAnswer(topic: Topic, ctx: TemplateContext): SpeakingModelAnswer {
  const [first, second] = ctx.reasons
  const opener = OPENERS[topic.questionType]?.[0] ?? OPENERS.preference[0]
  const closing = CLOSINGS[0]
  // When a lead-in is added the opener continues the same sentence, so it has to
  // start lower-case.
  const lead = ctx.focus ? `Taking ${ctx.focus} as the subject, ${lowerFirst(opener)}` : opener
  const english = `${lead} ${first.sentencePatterns[0]} ${second.sentencePatterns[0]} ${closing}`

  return {
    english,
    chinese: `本地模板生成的示例回答（${first.chineseName} / ${second.chineseName}）。`,
    wordCount: countWords(english),
    note: 'Built-in template text — not written by a model.',
  }
}

function buildLanguage(first: Reason, second: Reason): SpeakingLanguage {
  const patternOf = (r: Reason) => {
    const stem = r.sentencePatterns[0].split('.')[0].trim()
    return `${stem}.`
  }
  return {
    keyExpressions: [...first.keyPhrases.slice(0, 3), ...second.keyPhrases.slice(0, 2)],
    sentencePatterns: [...new Set([patternOf(first), patternOf(second)])],
    vocabulary: [...new Set([...first.keyPhrases.slice(0, 3), ...second.keyPhrases.slice(0, 3)])],
  }
}

/**
 * Build the fully-labelled local-template plan.
 *
 * `reason` is the user-facing explanation of why the AI was not used; `detail`
 * is the developer-facing error string.
 */
export function buildTemplateResult(
  topic: Topic,
  reason: string | null,
  detail: string | null,
): AnswerResult {
  const ctx = describeTemplateContext(topic)
  const [first, second] = ctx.reasons

  return {
    analysis: buildAnalysis(topic, ctx),
    arguments: buildArguments(ctx),
    modelAnswer: buildModelAnswer(topic, ctx),
    language: buildLanguage(first, second),
    source: 'template',
    fallbackReason: reason ?? 'Showing the built-in template.',
    fallbackDetail: detail,
  }
}