/**
 * Throwaway check for server/validate-speaking.mjs.
 * Run with:  node scripts/check-validate-speaking.mjs
 *
 * It proves the validator rejects an on-topic answer AND a generic template,
 * and accepts a well-formed one. Nothing here ships.
 */
import { validateSpeakingAnswer, lexicalOverlap } from '../server/validate-speaking.mjs'

const QUESTION =
  'Some people prefer to cook meals at home, while others prefer to eat at restaurants. Discuss the advantages and disadvantages of each.'

const GENERIC_TEMPLATE = {
  taskType: 'opinion',
  coreQuestion: 'Advantages and disadvantages of two options',
  requirements: ['State a position', 'Give reasons'],
  subject: ['option'],
  sections: [
    { role: 'stance', label: 'Stance', content: 'I believe this is the better choice for most people.' },
    {
      role: 'reason',
      label: 'Reason 1',
      content: 'It saves a significant amount of time in the morning.',
      example: 'For example, my neighbour always manages her morning well.',
    },
    {
      role: 'reason',
      label: 'Reason 2',
      content: 'It is more cost effective compared to the other approach.',
      example: 'For example, money is limited for most students.',
    },
    { role: 'closing', label: 'Close', content: 'In conclusion, the benefits far outweigh any drawbacks here.' },
  ],
  // Deliberately long enough to clear the word-count band: this fixture has to
  // be rejected by the RELEVANCE check, not by the length check, otherwise the
  // test does not prove what it claims to prove.
  modelAnswer: {
    english:
      'Personally, I strongly prefer this option. First, it saves a significant amount of time, which most people value highly in the morning. For example, my neighbour always manages her morning well because she plans ahead. Second, it is much more cost effective than the alternative, and money is limited for most students today. In addition, the results tend to be more predictable, so you know what to expect. To sum up, I believe the benefits far outweigh any drawbacks in this situation.',
    chinese: '我强烈偏好这个选项。首先它节省大量时间。其次它更具成本效益。',
  },
  tips: { keyVocabulary: ['cost effective', 'significant'], commonMistakes: ['Rushing'] },
  relevanceCheck: { addressesQuestion: true, notes: 'This answers the question.' },
}

const ON_TOPIC = {
  ...GENERIC_TEMPLATE,
  coreQuestion: 'Cooking at home versus eating at restaurants',
  requirements: ['Weigh both sides', 'Judge which is better overall'],
  subject: ['cooking at home', 'restaurants'],
  sections: [
    {
      role: 'stance',
      label: '立场',
      content:
        'Cooking at home wins for most people, mainly because it is cheaper and far better for health.',
    },
    {
      role: 'reason',
      label: '理由一 · 省钱',
      content: 'Buying groceries for a family of four costs far less than four restaurant meals.',
      example: 'A week of home-cooked dinners costs about a third of two restaurant lunches.',
    },
    {
      role: 'reason',
      label: '理由二 · 健康',
      content: 'At home you control the oil and the portion size, which restaurants rarely let you do.',
      example: 'A takeaway portion is usually two to three times what one person actually needs to eat.',
    },
    {
      role: 'counterargument',
      label: '让步',
      content: 'Restaurants do win on time, and on busy weeknights nobody wants to cook.',
    },
    {
      role: 'closing',
      label: '收尾',
      content: 'So I would keep eating out occasionally, but make home cooking the default.',
    },
  ],
  modelAnswer: {
    english:
      'If I had to choose, I would say cooking at home is better for almost everyone. The first reason is cost. Buying groceries for a family of four costs far less than four restaurant meals, so cooking at home really does save money over a month. The second reason is health. When you cook at home you control the oil and the portion size, and you can add vegetables that a takeaway rarely includes. I do admit that restaurants win on time, and on a busy Tuesday nobody wants to stand at the stove. But for regular meals I would still cook at home, and save eating out for weekends.',
    chinese: '如果必须选一个，我会说在家做饭几乎对所有人都更好。第一个原因是成本……',
  },
  tips: {
    keyVocabulary: ['cost', 'portion size', 'takeaway', 'at the stove'],
    commonMistakes: ['不要只说“更便宜”，要给出具体例子'],
  },
}

const cases = [
  ['通用模板（应拒绝）', GENERIC_TEMPLATE, false],
  ['针对题目的答案（应接受）', ON_TOPIC, true],
]

let failures = 0

console.log('lexicalOverlap 检查:')
console.log(`  通用模板 vs 题目 : ${lexicalOverlap(QUESTION, GENERIC_TEMPLATE.modelAnswer.english)}`)
console.log(`  对题答案   vs 题目 : ${lexicalOverlap(QUESTION, ON_TOPIC.modelAnswer.english)}`)
console.log('')

for (const [name, payload, shouldPass] of cases) {
  const result = validateSpeakingAnswer(payload, { question: QUESTION, lengthMode: 'standard' })
  const passed = result.ok
  const mark = passed === shouldPass ? 'PASS' : 'FAIL'
  if (mark === 'FAIL') failures += 1
  console.log(`${mark}  ${name}`)
  console.log(`      ok=${result.ok}${result.ok ? '' : `  error="${result.error}"`}`)
  if (result.ok) {
    console.log(`      sections=${result.data.sections.length}  words=${result.data.modelAnswer.wordCount}  overlap=${result.data.relevance.lexicalOverlap}`)
  }
}

// Extra: a well-formed answer judged against the WRONG question must fail.
const wrongQuestion =
  'Do you agree or disagree? Students should be required to take courses outside their major field of study.'
const mismatched = validateSpeakingAnswer(ON_TOPIC, { question: wrongQuestion, lengthMode: 'standard' })
const mismatchedMark = mismatched.ok === false ? 'PASS' : 'FAIL'
if (mismatchedMark === 'FAIL') failures += 1
console.log(`${mismatchedMark}  对题答案 vs 错误题目（应拒绝）`)
console.log(`      ok=${mismatched.ok}${mismatched.ok ? '' : `  error="${mismatched.error}"`}`)

// Extra: missing translation must fail.
const noChinese = validateSpeakingAnswer(
  { ...ON_TOPIC, modelAnswer: { english: ON_TOPIC.modelAnswer.english } },
  { question: QUESTION, lengthMode: 'standard' },
)
const noChineseMark = noChinese.ok === false ? 'PASS' : 'FAIL'
if (noChineseMark === 'FAIL') failures += 1
console.log(`${noChineseMark}  缺少中文翻译（应拒绝）`)

console.log('')
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
