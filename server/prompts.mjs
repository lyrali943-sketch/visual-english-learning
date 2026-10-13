/**
 * Prompt construction for the three AI stages.
 * Keeping the prompts in one place makes the content quality tunable without
 * touching any application logic.
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
