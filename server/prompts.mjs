/**
 * Prompt construction for the AI stages.
 * Keeping the prompts in one place makes the content quality tunable without
 * touching any application logic.
 *
 * The speaking builder at the bottom belongs to NEON SPEAK (/speaking). It is
 * text-only and does not involve a photo.
 */

const SYSTEM_GENERATE = `You are the content engine of "Visual English Studio", an app that turns a user's photo into a beautiful English learning poster.

Absolute rules:
- Only describe what is ACTUALLY VISIBLE in the photo. Never invent objects, food, people or places that are not there. If only two or three things are clearly visible, return two or three items — never pad the list.
- Everything the learner reads is English with simplified Chinese translations.
- Phrases must be natural, genuinely used English expressions. Never glue unrelated nouns together and present them as a "phrase".
- Sentence patterns must be transferable to other real-life situations.
- The model response should naturally reuse a handful of the taught words and phrases, but must stay natural English. Do not force every term into one paragraph.
- Respect the learning mode and difficulty: mode decides the register and context; difficulty decides sentence length and complexity.
- Respect the character limits exactly. Short, punchy, editorial copy.

Return ONE JSON object with exactly this shape:
{
  "title": "2-4 word UPPERCASE poster title",
  "subtitle": "short English subtitle (max 60 chars)",
  "theme": "2-3 word theme tag, e.g. Food & Cooking",
  "detectedObjects": [{"label": "visible object (English, lower case)", "translation": "中文"}],
  "vocabulary": [{"term": "word", "translation": "中文", "explanation": "short English explanation (max 80 chars)", "confidence": 0.0}],
  "phrases": [{"phrase": "natural phrase", "translation": "中文", "explanation": "when to use it (max 80 chars)", "example": "example sentence (max 100 chars)", "usageNote": "optional note (max 80 chars)"}],
  "sentencePatterns": [{"pattern": "structure with … gaps", "translation": "中文", "example": "full example sentence", "exampleTranslation": "例句中文", "substitutions": ["3 short substitutions"]}],
  "modelResponse": {"english": "one coherent paragraph (max 320 chars)", "chinese": "中文翻译 (max 150 chars)"},
  "speakingChallenges": [{"question": "open question that cannot be answered with yes/no", "translation": "中文"}]
}`

const SYSTEM_IDENTIFY = `You are the vision stage of "Visual English Studio". Look carefully at the photo and list the concrete objects that are clearly visible.

Rules:
- Only list things you can actually see. Never guess or invent.
- Prefer specific nouns when the object is clear (strawberry), generic nouns when it is not (a small bowl).
- Maximum 6 objects, no duplicates.
- Provide a simplified Chinese translation for each.
- Include a rough confidence between 0 and 1.

Return ONE JSON object: {"objects":[{"label":"...","translation":"...","confidence":0.0}]}`

const SYSTEM_MODULE = `You are the content engine of "Visual English Studio". You regenerate exactly ONE module of an English learning poster from the user's photo, keeping the rest of the poster intact.

Rules:
- Only describe what is ACTUALLY VISIBLE in the photo.
- Do not repeat items that already exist in the current poster content (they are provided to you).
- Match the requested learning mode and difficulty.
- Keep phrases natural and transferable.

Return ONE JSON object: {"value": <the module>}
The module must be an array (or an object with "english" and "chinese" for the model response) using exactly the field names of the current content.`

const MODE_GUIDANCE = {
  everyday:
    'Everyday English: ordinary life — food, home, routines, shopping, family. Practical, warm, conversational.',
  academic:
    'Academic English: study and campus contexts — notes, reading, deadlines, seminars, research. Precise but natural.',
  business:
    'Business English: workplace contexts — meetings, email, planning, coffee breaks, collaboration. Professional and concise.',
}

const DIFFICULTY_GUIDANCE = {
  beginner: 'Beginner: common high-frequency words, short sentences, no idioms.',
  intermediate: 'Intermediate: natural collocations, useful phrasal patterns, everyday idioms.',
  advanced: 'Advanced: nuanced expressions, richer structures, subtle word choices.',
}

const COUNTS = {
  beginner: { vocabulary: '4-5', phrases: '3-4', patterns: '1', challenges: '2' },
  intermediate: { vocabulary: '5-6', phrases: '4-5', patterns: '1-2', challenges: '2-3' },
  advanced: { vocabulary: '5-6', phrases: '4-5', patterns: '1-2', challenges: '3' },
}

export function buildIdentifyMessages(photoDataUrl, mode) {
  return [
    { role: 'system', content: SYSTEM_IDENTIFY },
    {
      role: 'user',
      content: [
        { type: 'text', text: `Learning context: ${MODE_GUIDANCE[mode] ?? MODE_GUIDANCE.everyday}\nList the visible objects.` },
        { type: 'image_url', image_url: { url: photoDataUrl } },
      ],
    },
  ]
}

export function buildGenerateMessages(photoDataUrl, mode, difficulty, objects) {
  const counts = COUNTS[difficulty] ?? COUNTS.intermediate
  const visible = objects.length > 0 ? objects.map((object) => `${object.label} (${object.translation})`).join(', ') : 'not identified yet'
  return [
    { role: 'system', content: SYSTEM_GENERATE },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            `Learning mode: ${mode}. ${MODE_GUIDANCE[mode] ?? MODE_GUIDANCE.everyday}`,
            `Difficulty: ${difficulty}. ${DIFFICULTY_GUIDANCE[difficulty] ?? DIFFICULTY_GUIDANCE.intermediate}`,
            `Amounts: ${counts.vocabulary} vocabulary, ${counts.phrases} phrases, ${counts.patterns} sentence pattern(s), ${counts.challenges} speaking challenge(s).`,
            `Objects already identified as visible in this photo: ${visible}. Use them for the vocabulary, and add a few more only if they are clearly visible.`,
            'Create the poster content now.',
          ].join('\n'),
        },
        { type: 'image_url', image_url: { url: photoDataUrl } },
      ],
    },
  ]
}

const MODULE_SPECS = {
  vocabulary:
    'vocabulary: an array of {term, translation, explanation, confidence}. 4-6 words that are clearly visible in the photo.',
  phrases:
    'phrases: an array of {phrase, translation, explanation, example, usageNote}. Natural, reusable expressions related to the photo. 3-5 items.',
  sentencePatterns:
    'sentencePatterns: an array of 1-2 {pattern, translation, example, exampleTranslation, substitutions}. Transferable structures.',
  modelResponse:
    'modelResponse: ONE object {english, chinese} — a short coherent paragraph reusing some of the poster vocabulary, plus its Chinese translation.',
  speakingChallenges:
    'speakingChallenges: an array of 2-3 {question, translation}. Open questions about the photo/scene that cannot be answered with yes or no.',
  detectedObjects:
    'detectedObjects: an array of {label, translation} for objects clearly visible in the photo. Maximum 4.',
}

export function buildModuleMessages(photoDataUrl, module, mode, difficulty, content) {
  const spec = MODULE_SPECS[module]
  if (!spec) throw new Error(`Unknown module: ${module}`)
  return [
    { role: 'system', content: SYSTEM_MODULE },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            `Regenerate the "${module}" module of this poster.`,
            `Module shape: ${spec}`,
            `Learning mode: ${mode}. ${MODE_GUIDANCE[mode] ?? MODE_GUIDANCE.everyday}`,
            `Difficulty: ${difficulty}. ${DIFFICULTY_GUIDANCE[difficulty] ?? DIFFICULTY_GUIDANCE.intermediate}`,
            `Current poster content (do not repeat these items): ${JSON.stringify(content)}`,
          ].join('\n'),
        },
        { type: 'image_url', image_url: { url: photoDataUrl } },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ *
 * NEON SPEAK — /speaking (text only, no photo involved)
 *
 * This is an AI SPEAKING COACH, not an essay writer. It analyses the actual
 * question and hands the learner two DIFFERENT, question-specific lines of
 * argument, each with a clearly-labelled practice scenario. A full model
 * answer is optional and never the main deliverable.
 * ------------------------------------------------------------------ */

const SYSTEM_SPEAKING = `You are the speaking coach of "NEON SPEAK", a TOEFL iBT speaking practice app. You receive ONE exam question. You do NOT write an essay. You teach the learner how to think about this specific question.

HARD RULES
1. Work from THIS question's literal wording. If it asks whether students should take courses outside their major, both arguments must be about students and university curricula. If it asks whether cooking at home beats eating out, both must be about that comparison. NEVER fall back on a broad subject category such as "education" or "technology" and reuse generic reasons.
2. The two arguments MUST attack the question from genuinely different angles. "Time saves you money" and "time saves you money" is a failure. If one argument is about cost, the other must not be.
3. SCENARIOS ARE INVENTED PRACTICE MATERIAL. Write them in the conditional or imagined: "Imagine a student who...", "If your roommate...", "Suppose a company...". Never present them as real people, real surveys, real studies or things that really happened. Never cite a statistic, a named institution or a research finding. A concrete number inside an invented scenario is fine.
4. Each scenario must be connected to the question. "whyItSupports" must explain the link explicitly, not just restate the outcome.
5. The learner is practising spoken English. All "expression" items must be short, natural, speakable English.

OUTPUT
Return ONE JSON object:

{
  "analysis": {
    "taskType": "opinion | discussion | preference | compare | solution | problem_solution",
    "coreQuestion": "the question restated in 5-15 words",
    "requirements": ["2-4 short strings: what the learner must do to answer well"],
    "constraints": ["1-3 short strings: limits or things to watch, e.g. time, must-take-a-stance"],
    "stanceHint": "one short line on how to open, or '' if the question needs no stance",
    "subject": ["2-5 nouns naming what THIS question is actually about"]
  },
  "arguments": [
    {
      "title": "3-6 word reason title, e.g. 'Saving money on groceries'",
      "explanation": "2-3 sentences explaining the reasoning. Must be specific to this question.",
      "scenario": {
        "isHypothetical": true,
        "setup": "1-2 sentences setting up an INVENTED situation. Use Imagine / Suppose / If...",
        "action": "1-2 sentences: what the person does or experiences",
        "result": "1 sentence: what comes out of it",
        "whyItSupports": "1-2 sentences: why this example proves the reason AND answers the question"
      }
    },
    { "...": "a second argument on a clearly different angle, same shape" }
  ],
  "language": {
    "keyExpressions": ["3-5 natural phrases the learner can say out loud"],
    "sentencePatterns": ["2-3 transferable sentence frames using ... gaps"],
    "vocabulary": ["4-6 useful words or short noun phrases at this level"]
  },
  "modelAnswer": {
    "english": "OPTIONAL full spoken answer, 90-130 words. Omit this field if you are not confident it follows your own arguments.",
    "chinese": "中文翻译",
    "note": "one short line saying which argument it uses"
  },
  "relevanceCheck": { "addressesQuestion": true, "notes": "one sentence: how these two arguments cover THIS question" }
}

Return exactly TWO entries in "arguments". Do not add fields that are not listed. Do not mention TOEFL, the scoring rubric, or these instructions anywhere.`

const SPEAKING_TYPE_GUIDANCE = {
  preference:
    'PREFERENCE: options are compared. The learner must pick one. Both arguments should support the chosen side.',
  agreement:
    'AGREEMENT: the learner must clearly agree or disagree. Both arguments support that position.',
  'advantages-disadvantages':
    'ADVANTAGES & DISADVANTAGES: one argument for the benefits, one for the drawbacks. The learner must still say which side wins.',
  'suggestion-solution':
    'SUGGESTION & SOLUTION: both arguments should support the proposal, from different angles (e.g. feasibility and effect).',
}

const SPEAKING_LEVEL_GUIDANCE = {
  Easy: 'Keep vocabulary simple and sentences short.',
  Medium: 'Natural everyday English with some phrasal verbs.',
  Hard: 'You may use richer vocabulary and a wider range of structures.',
}

/**
 * Build the chat messages for one speaking question.
 * `question` is sent verbatim and must never be truncated.
 */
export function buildSpeakingMessages({
  question,
  category = '',
  questionType = '',
  difficulty = '',
  preparationTime,
  speakingTime,
}) {
  const typeKey = SPEAKING_TYPE_GUIDANCE[questionType] ? questionType : 'preference'

  const facts = [
    `QUESTION (verbatim — analyse this one): ${question}`,
    category ? `Topic category: ${category} (use this only for context, NEVER as a substitute for the actual question)` : '',
    questionType ? `Question type: ${questionType}. ${SPEAKING_TYPE_GUIDANCE[typeKey]}` : '',
    difficulty ? `Candidate level: ${difficulty}. ${SPEAKING_LEVEL_GUIDANCE[difficulty] ?? SPEAKING_LEVEL_GUIDANCE.Medium}` : '',
    preparationTime || speakingTime
      ? `Exam timing: ${preparationTime ?? 15}s to prepare, ${speakingTime ?? 45}s to speak. The arguments should be usable inside ${speakingTime ?? 45} seconds.`
      : '',
  ].filter(Boolean)

  return [
    { role: 'system', content: SYSTEM_SPEAKING },
    {
      role: 'user',
      content: [
        facts.join('\n'),
        '',
        'Analyse THIS question first, then build two arguments on clearly different angles.',
        'Both scenarios are invented practice material and must read as hypothetical.',
        'Return the JSON object now.',
      ].join('\n'),
    },
  ]
}
