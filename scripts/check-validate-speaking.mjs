/**
 * Throwaway check for server/validate-speaking.mjs (speaking-coach contract).
 * Run with:  node scripts/check-validate-speaking.mjs
 *
 * Covers three question types with realistic fixtures plus the negative cases
 * that matter: missing scenario fields, duplicate arguments, off-topic output,
 * wrong field types, incomplete structure, non-hypothetical framing, and the
 * "don't over-reject" case (a legitimate scenario using ordinary words).
 */
import { validateSpeakingAnswer, lexicalOverlap } from '../server/validate-speaking.mjs'

let failures = 0
let checks = 0

function expectPass(name, payload, opts) {
  checks += 1
  const r = validateSpeakingAnswer(payload, opts)
  if (r.ok) {
    const extra = payload.modelAnswer ? 'modelAnswer=yes' : 'modelAnswer=omitted'
    console.log(`PASS  ${name}  (${extra})`)
  } else {
    failures += 1
    console.log(`FAIL  ${name}  -> rejected: ${r.error}`)
  }
  return r
}

function expectReject(name, payload, opts, expectSubstring = '') {
  checks += 1
  const r = validateSpeakingAnswer(payload, opts)
  if (!r.ok) {
    const matched = !expectSubstring || r.error.toLowerCase().includes(expectSubstring.toLowerCase())
    if (matched) {
      console.log(`PASS  ${name}  (rejected: ${r.error.slice(0, 78)}…)`)
    } else {
      failures += 1
      console.log(`FAIL  ${name}  -> rejected for the WRONG reason: ${r.error}`)
    }
  } else {
    failures += 1
    console.log(`FAIL  ${name}  -> should have been rejected but passed`)
  }
}

const clone = (v) => JSON.parse(JSON.stringify(v))

/* ── 1. advantages / disadvantages ───────────────────────────────────── */
const Q_AD = 'Some people prefer to cook meals at home, while others prefer to eat at restaurants. Discuss the advantages and disadvantages of each.'
const A_AD = {
  analysis: {
    taskType: 'compare',
    coreQuestion: 'Advantages and disadvantages of cooking at home versus eating at restaurants',
    requirements: ['Cover both options', 'Give at least one advantage and one disadvantage', 'Say which you would choose'],
    constraints: ['45 seconds to speak, so keep each point short'],
    stanceHint: 'Say which option you personally prefer in your first sentence.',
    subject: ['cooking at home', 'restaurants', 'meals'],
  },
  arguments: [
    {
      title: 'Home cooking controls cost and health',
      explanation:
        'Cooking at home is the stronger option because groceries cost far less than restaurant meals and you control the oil and portion size, which directly affects health.',
      scenario: {
        isHypothetical: true,
        setup: 'Imagine a family of four who eats out twice a week.',
        action: 'They order two large pizzas and a fried chicken combo for dinner.',
        result: 'One week of that costs more than a month of grocery shopping for the same family.',
        whyItSupports:
          'It shows the cost advantage of home cooking concretely, which is exactly what this question asks you to weigh.',
      },
    },
    {
      title: 'Restaurants win on speed and variety',
      explanation:
        'On the other side, restaurants save time and offer dishes nobody wants to cook at home, so they are genuinely better on busy weekdays.',
      scenario: {
        isHypothetical: true,
        setup: 'Suppose two colleagues arrive home at nine after a long shift.',
        action: 'One of them cooks a full dinner; the other orders Thai food.',
        result: 'The takeaway is at the door in twenty-five minutes while the kitchen is still being cleaned.',
        whyItSupports:
          'This gives the disadvantages of home cooking real weight, so your answer acknowledges the other side instead of ignoring it.',
      },
    },
  ],
  language: {
    keyExpressions: ['work out to about', 'the same as', 'on busy weeknights', 'it saves me having to'],
    sentencePatterns: ['If you X every day, it adds up to Y.', 'What I like about X is that …'],
    vocabulary: ['groceries', 'portion size', 'takeaway', 'work out', 'weeknight'],
  },
  modelAnswer: {
    english: 'If I had to choose I would cook at home most days. The first reason is cost: buying groceries for a family of four costs far less than four restaurant meals. The second side of the coin is that restaurants save time, and on a busy Tuesday nobody wants to stand at the stove. So I would cook at home and eat out at weekends.',
    chinese: '如果必须选，我会大部分时间在家做饭……',
    note: 'Uses argument A, then concedes argument B.',
  },
  relevanceCheck: { addressesQuestion: true, notes: 'Both options are addressed directly.' },
}

/* ── 2. agreement ───────────────────────────────────────────────────── */
const Q_AGREE = 'Do you agree or disagree? Students should be required to take courses in subjects outside their major field of study.'
const A_AGREE = {
  analysis: {
    taskType: 'opinion',
    coreQuestion: 'Whether university students should be forced to study outside their major',
    requirements: ['State clearly whether you agree', 'Justify with two reasons', 'End with a short summary'],
    constraints: [],
    stanceHint: 'Begin with "I agree that…" or "I disagree because…" — never leave it implicit.',
    subject: ['university students', 'required courses', 'major field'],
  },
  arguments: [
    {
      title: 'It produces genuinely usable skills',
      explanation:
        'Requiring outside courses gives every student basic competence in statistics and communication, which almost no major teaches on its own.',
      scenario: {
        isHypothetical: true,
        setup: 'Imagine a chemistry student who never takes a statistics course.',
        action: 'She has to analyse her own experimental results in her final year.',
        result: 'She ends up guessing at the numbers instead of reading them.',
        whyItSupports:
          'It shows why courses outside the major help students who study inside a narrow field, which is the claim being evaluated.',
      },
    },
    {
      title: 'It costs time that majors already need',
      explanation:
        'The opposite view is that a required elective is a year of tuition for a subject the student will never use, while the major itself is still being crammed in.',
      scenario: {
        isHypothetical: true,
        setup: 'Suppose a student is in the final year of a demanding engineering programme.',
        action: 'She has one elective slot left and chooses the easier general-education paper instead of the required outside course.',
        result: 'She graduates a term late because the engineering backlog was never cleared.',
        whyItSupports:
          'It shows the cost of the requirement to students, which is the strongest argument for disagreeing.',
      },
    },
  ],
  language: {
    keyExpressions: ['regardless of your major', 'it comes down to', 'I would go either way on this'],
    sentencePatterns: ['Without X, you end up having to …', 'What convinced me was that …'],
    vocabulary: ['elective', 'curriculum', 'backlog', 'competence', 'tuition'],
  },
  // modelAnswer deliberately omitted — the contract says it is optional.
  relevanceCheck: { addressesQuestion: true, notes: 'Both arguments concern required outside courses.' },
}

/* ── 3. suggestion / solution ────────────────────────────────────────── */
const Q_SOL = 'Many young people struggle to find their first job after graduation. What suggestions would you make to help them succeed in the job market?'
const A_SOL = {
  analysis: {
    taskType: 'solution',
    coreQuestion: 'How universities and employers can help graduates find a first job',
    requirements: ['Name who would act', 'Give specific, practical suggestions', 'Explain why they would work'],
    constraints: ['45 seconds, so at most two or three suggestions'],
    stanceHint: 'Start with who should act — universities or employers — before the suggestions.',
    subject: ['graduates', 'first job', 'job market'],
  },
  arguments: [
    {
      title: 'Universities should run real placements',
      explanation:
        'A compulsory placement in a working company gives graduates the work history that recruiters actually screen for.',
      scenario: {
        isHypothetical: true,
        setup: 'Imagine a university that makes a three-month placement compulsory.',
        action: 'A marketing graduate spends a term answering real customer emails for a local firm.',
        result: 'She walks into interviews with three months of verifiable experience instead of a CV of coursework.',
        whyItSupports:
          'It answers "what suggestions would you make" with one concrete, implementable action and shows the result it produces.',
      },
    },
    {
      title: 'Employers should widen graduate schemes',
      explanation:
        'Employers also have to widen their schemes, because most graduate vacancies require experience that graduates by definition do not have.',
      scenario: {
        isHypothetical: true,
        setup: 'Consider a consultancy that currently asks for two years of experience.',
        action: 'It changes the entry-level posting to ask for a degree and one open-ended written task instead.',
        result: 'Its graduate intake doubles in a year without lowering the bar on the work itself.',
        whyItSupports:
          'It shows the second actor in the answer doing something specific, which keeps the suggestions balanced rather than one-sided.',
      },
    },
  ],
  language: {
    keyExpressions: ['take on graduates', 'hands-on experience', 'in exchange for', 'open to applications from'],
    sentencePatterns: ['If X did Y, then Z would happen.', 'One thing that really helps is …'],
    vocabulary: ['placement', 'graduate scheme', 'intake', 'verifiable', 'vacancy'],
  },
  relevanceCheck: { addressesQuestion: true, notes: 'Both suggestions target the graduate job market.' },
}

console.log('lexicalOverlap calibration:')
console.log(`  on-topic AD   : ${lexicalOverlap(Q_AD, 'home cooking cost restaurants groceries meals')}`)
console.log(`  generic drift : ${lexicalOverlap(Q_AD, 'technology devices online modern convenient')}`)
console.log(`  off-topic AD  : ${lexicalOverlap(Q_SOL, A_AD.arguments[0].title + ' ' + A_AD.arguments[0].explanation)}`)
console.log('')

console.log('--- positive ---')
expectPass('AD/compare', A_AD, { question: Q_AD })
expectPass('AGREE/opinion (modelAnswer omitted)', A_AGREE, { question: Q_AGREE })
expectPass('SOLUTION/problem', A_SOL, { question: Q_SOL })

console.log('')
console.log('--- negative: structure ---')
expectReject('arguments 不是数组', { ...clone(A_AD), arguments: 'two' }, { question: Q_AD }, 'arguments')
expectReject('arguments 只有 1 条', { ...clone(A_AD), arguments: [clone(A_AD.arguments[0])] }, { question: Q_AD }, 'exactly 2')
expectReject('arguments 有 3 条', { ...clone(A_AD), arguments: [...clone(A_AD.arguments), clone(A_AD.arguments[0])] }, { question: Q_AD }, 'exactly 2')
expectReject('缺少 analysis', (() => { const x = clone(A_AD); delete x.analysis; return x })(), { question: Q_AD }, 'analysis')
expectReject('缺少 language', (() => { const x = clone(A_AD); delete x.language; return x })(), { question: Q_AD }, 'language')
expectReject('language.keyExpressions 为空', { ...clone(A_AD), language: { ...A_AD.language, keyExpressions: [] } }, { question: Q_AD }, 'keyExpressions')

console.log('')
console.log('--- negative: scenario ---')
expectReject('scenario 缺失', (() => {
  const x = clone(A_AD)
  delete x.arguments[0].scenario
  return x
})(), { question: Q_AD }, 'scenario')
expectReject('scenario 类型错误（字符串）', (() => {
  const x = clone(A_AD)
  x.arguments[1].scenario = 'a short story'
  return x
})(), { question: Q_AD }, 'scenario')
expectReject('scenario 缺 whyItSupports', (() => {
  const x = clone(A_AD); delete x.arguments[0].scenario.whyItSupports; return x
})(), { question: Q_AD }, 'whyItSupports')
expectReject('scenario 缺 result', (() => {
  const x = clone(A_AD); delete x.arguments[1].scenario.result; return x
})(), { question: Q_AD }, 'result')
expectReject('scenario 缺 setup', (() => {
  const x = clone(A_AD); delete x.arguments[0].scenario.setup; return x
})(), { question: Q_AD }, 'setup')
expectReject('isHypothetical = false', (() => {
  const x = clone(A_AD); x.arguments[0].scenario.isHypothetical = false; return x
})(), { question: Q_AD }, 'exactly true')
expectReject('isHypothetical 缺失', (() => {
  const x = clone(A_AD); delete x.arguments[0].scenario.isHypothetical; return x
})(), { question: Q_AD }, 'exactly true')
expectReject('isHypothetical 为真值字符串 "true"', (() => {
  const x = clone(A_AD); x.arguments[0].scenario.isHypothetical = 'true'; return x
})(), { question: Q_AD }, 'exactly true')
expectReject('情境无假设语气（伪装成真实经历）', (() => {
  const x = clone(A_AD)
  x.arguments[0].scenario.setup = 'Last year my neighbour cancelled all of her restaurant bookings.'
  x.arguments[0].scenario.action = 'She started buying groceries and meal-prepping on Sundays.'
  return x
})(), { question: Q_AD }, 'imagining cue')

console.log('')
console.log('--- negative: duplicate / off-topic ---')
const dup = clone(A_AD)
dup.arguments[1].title = 'Home cooking controls cost and health'
dup.arguments[1].explanation = dup.arguments[0].explanation
dup.arguments[1].scenario.setup = dup.arguments[0].scenario.setup
dup.arguments[1].scenario.action = dup.arguments[0].scenario.action
dup.arguments[1].scenario.result = dup.arguments[0].scenario.result
dup.arguments[1].scenario.whyItSupports = dup.arguments[0].scenario.whyItSupports
expectReject('两条理由重复', dup, { question: Q_AD }, 'same point')

expectReject('偏题：用 AGREEMENT 的答案回答 AD 题', A_AGREE, { question: Q_AD }, 'do not address')
expectReject('偏题：用 AD 的答案回答 SOLUTION 题', A_AD, { question: Q_SOL }, 'do not address')

const generic = {
  analysis: {
    taskType: 'opinion',
    coreQuestion: 'A general question about modern life',
    requirements: ['Give reasons'],
    subject: ['topic'],
  },
  arguments: [
    {
      title: 'Technology is convenient',
      explanation: 'Technology makes everything more convenient and saves time for busy people.',
      scenario: {
        isHypothetical: true,
        setup: 'Imagine a person using a modern device every day.',
        action: 'They complete tasks quickly with the latest product.',
        result: 'They have more free time in the evening.',
        whyItSupports: 'It shows how convenient technology is for daily life.',
      },
    },
    {
      title: 'Technology is expensive',
      explanation: 'On the other hand, modern devices cost a lot of money for ordinary people.',
      scenario: {
        isHypothetical: true,
        setup: 'Suppose a student wants the newest model.',
        action: 'She saves for months and still ends up paying a lot.',
        result: 'She cannot afford anything else that month.',
        whyItSupports: 'It shows that cost is a real drawback of buying modern devices.',
      },
    },
  ],
  language: { keyExpressions: ['it saves time'], sentencePatterns: ['Modern X makes Y easier.'], vocabulary: ['device', 'cost'] },
}
expectReject('偏题：通用"科技"答案（只贴合宽泛分类）', generic, { question: Q_AD }, 'do not address')

console.log('')
console.log('--- negative: wrong types / limits ---')
expectReject('taskType 类型错误', { ...clone(A_AD), analysis: { ...A_AD.analysis, taskType: 42 } }, { question: Q_AD }, 'taskType')
expectReject('requirements 不是数组', { ...clone(A_AD), analysis: { ...A_AD.analysis, requirements: 'give reasons' } }, { question: Q_AD }, 'requirements')
expectReject('title 缺失', (() => { const x = clone(A_AD); delete x.arguments[0].title; return x })(), { question: Q_AD }, 'title')
expectReject('modelAnswer 缺 chinese', {
  ...clone(A_AD),
  modelAnswer: { english: 'Some words here.' },
}, { question: Q_AD }, 'chinese')
expectReject('modelAnswer 缺 english', {
  ...clone(A_AD),
  modelAnswer: { chinese: '一些中文。' },
}, { question: Q_AD }, 'english')
expectReject('coreQuestion 过短', { ...clone(A_AD), analysis: { ...A_AD.analysis, coreQuestion: 'Q?' } }, { question: Q_AD }, 'coreQuestion')

console.log('')
console.log('--- must NOT over-reject ---')
const ordinaryWords = clone(A_AD)
ordinaryWords.arguments[0].scenario.setup =
  'Imagine a family of four who cook every evening and sometimes order in when the fridge is empty.'
ordinaryWords.arguments[0].scenario.action =
  'They compare a week of restaurant meals with a week of shopping from the supermarket.'
ordinaryWords.arguments[0].scenario.result =
  'The shopping costs about a third as much, even though they still eat out twice.'
expectPass('合法情境含普通词汇（不应被误判为虚构研究）', ordinaryWords, { question: Q_AD })

const noConstraints = clone(A_AD)
noConstraints.analysis.constraints = []
noConstraints.analysis.stanceHint = ''
noConstraints.modelAnswer = undefined
expectPass('constraints/stanceHint 为空且无范文（均为允许缺省）', noConstraints, { question: Q_AD })

console.log('')
console.log(`checks=${checks} failures=${failures}`)
console.log(failures === 0 ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED')
process.exit(failures === 0 ? 0 : 1)
