import type { Topic } from '../data/topics';
import { REASONS, type Reason } from '../data/reasons';
import { estimateSpeakingTime, countWords } from '../utils/random';

export type AnswerLength = 'short' | 'standard' | 'extended';

export interface AnswerFramework {
  opening: string;
  reason1: string;
  example1: string;
  reason2: string;
  example2: string;
  closing: string;
}

export interface ModelAnswer {
  text: string;
  translation: string;
  wordCount: number;
  estimatedDuration: number;
  lengthMode: AnswerLength;
}

export interface PracticeTip {
  keyVocabulary: string[];
  replaceableExpressions: string[];
  commonMistakes: string[];
}

export interface GeneratedAnswer {
  topic: Topic;
  analysis: {
    category: string;
    questionType: string;
    recommendedReasons: Reason[];
    reasonRationale: string;
  };
  framework: AnswerFramework;
  modelAnswer: ModelAnswer;
  tips: PracticeTip;
}

const OPENERS: Record<string, string[]> = {
  preference: [
    "Personally, I strongly prefer {option} for several compelling reasons.",
    "When it comes to this question, I would definitely choose {option}.",
    "I believe {option} is the better choice, and I'd like to explain why.",
  ],
  agreement: [
    "I completely agree with this statement for a couple of important reasons.",
    "I firmly believe this is true, and I'd like to share my perspective.",
    "From my perspective, this statement is absolutely valid.",
  ],
  'advantages-disadvantages': [
    "This is a complex issue with both benefits and drawbacks that deserve careful consideration.",
    "There are clear advantages and disadvantages to this approach that I'd like to discuss.",
    "While this has its merits, there are also some significant concerns to address.",
  ],
  'suggestion-solution': [
    "I believe there are several effective ways to address this challenge.",
    "In my view, the best approach would involve a combination of strategies.",
    "I'd like to propose some practical solutions to this problem.",
  ],
};

const CLOSINGS = [
  "In conclusion, these reasons clearly demonstrate why this approach is effective.",
  "To sum up, the benefits far outweigh any potential drawbacks.",
  "Overall, I believe this is the most sensible approach given the circumstances.",
  "These are the main reasons why I hold this view.",
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateExamplesForReason(reason: Reason): string {
  return reason.example;
}

function generateModelAnswer(
  topic: Topic,
  reasons: Reason[],
  lengthMode: AnswerLength
): ModelAnswer {
  const opener = getRandomItem(OPENERS[topic.questionType] || OPENERS.preference);
  const closing = getRandomItem(CLOSINGS);

  const reason1 = reasons[0];
  const reason2 = reasons[1] || reasons[0];

  const example1 = generateExamplesForReason(reason1);
  const example2 = reason2 ? generateExamplesForReason(reason2) : '';

  let text = '';
  let translation = '';

  if (lengthMode === 'short') {
    text = `${opener} First, ${reason1.sentencePatterns[0].toLowerCase()} ${example1} Second, ${reason2.sentencePatterns[0].toLowerCase()} ${example2} ${closing}`;
    translation = `首先，${reason1.chineseName}是一个重要原因。${example1}其次，${reason2.chineseName}也很关键。${example2}总的来说，这些理由清楚地说明了为什么这个方法是有效的。`;
  } else if (lengthMode === 'standard') {
    text = `${opener} The first reason is related to ${reason1.name.toLowerCase()}. ${reason1.sentencePatterns[0]} ${example1} Furthermore, ${reason2.sentencePatterns[0].toLowerCase()} ${example2} ${closing}`;
    translation = `首先，这与${reason1.chineseName}有关。${example1}此外，${reason2.chineseName}也是一个重要因素。${example2}总的来说，这些理由清楚地说明了为什么这个方法是有效的。`;
  } else {
    text = `${opener} The first and most important reason is ${reason1.name.toLowerCase()}. ${reason1.sentencePatterns[0]} ${example1} This is something I have experienced firsthand, and it has made a significant difference in my life. Moving on to the second point, ${reason2.sentencePatterns[0].toLowerCase()} ${example2} This aspect should not be overlooked either. ${closing} I hope these points help illustrate my perspective on this matter.`;
    translation = `第一个也是最重要的原因是${reason1.chineseName}。${example1}这是我亲身经历过的，它对我的生活产生了重要影响。接下来是第二点，${reason2.chineseName}也是一个重要因素。${example2}这一点同样不容忽视。总的来说，我希望这些观点能帮助说明我对这个问题的看法。`;
  }

  const wordCount = countWords(text);
  const estimatedDuration = estimateSpeakingTime(wordCount);

  return { text, translation, wordCount, estimatedDuration, lengthMode };
}

function generateTips(reasons: Reason[]): PracticeTip {
  const keyVocabulary = [
    ...reasons[0].keyPhrases.slice(0, 3),
    ...(reasons[1]?.keyPhrases.slice(0, 2) || []),
  ];

  const replaceableExpressions = [
    `Instead of "${reasons[0].keyPhrases[0]}", you could say "${reasons[0].keyPhrases[1]}"`,
    `Instead of "${reasons[1]?.keyPhrases[0] || 'important'}", you could say "${reasons[1]?.keyPhrases[1] || 'significant'}"`,
    `Try using "${reasons[0].sentencePatterns[0].split('.')[0]}" as an alternative opening`,
  ];

  const commonMistakes = [
    "Don't memorize the answer word-for-word — focus on the key ideas and express them naturally.",
    "Make sure to include specific examples rather than just stating general reasons.",
    "Keep track of time — aim to finish within the allotted time without rushing the conclusion.",
  ];

  return { keyVocabulary, replaceableExpressions, commonMistakes };
}

export function generateAnswer(topic: Topic, lengthMode: AnswerLength = 'standard'): GeneratedAnswer {
  // Select relevant reasons based on category
  const categoryReasons = getReasonsForCategory(topic.category);
  const recommendedReasons = categoryReasons.slice(0, 2);

  const framework: AnswerFramework = {
    opening: getRandomItem(OPENERS[topic.questionType] || OPENERS.preference),
    reason1: `${recommendedReasons[0].name}: ${recommendedReasons[0].sentencePatterns[0]}`,
    example1: recommendedReasons[0].example,
    reason2: recommendedReasons[1] ? `${recommendedReasons[1].name}: ${recommendedReasons[1].sentencePatterns[0]}` : '',
    example2: recommendedReasons[1]?.example || '',
    closing: getRandomItem(CLOSINGS),
  };

  const modelAnswer = generateModelAnswer(topic, recommendedReasons, lengthMode);
  const tips = generateTips(recommendedReasons);

  return {
    topic,
    analysis: {
      category: topic.category,
      questionType: topic.questionType,
      recommendedReasons,
      reasonRationale: `These two reasons are most commonly associated with ${topic.category} topics and provide a balanced perspective.`,
    },
    framework,
    modelAnswer,
    tips,
  };
}

function getReasonsForCategory(category: string): Reason[] {
  const categoryReasonMap: Record<string, string[]> = {
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
  };

  const reasonIds = categoryReasonMap[category] || ['time-efficiency', 'convenience'];
  return reasonIds
    .map(id => REASONS.find(r => r.id === id))
    .filter((r): r is Reason => r !== undefined);
}

export function getAnswerLengthInfo(mode: AnswerLength): { label: string; wordRange: string; description: string } {
  const info = {
    short: { label: 'Short', wordRange: '80-100 words', description: 'Concise and to the point' },
    standard: { label: 'Standard', wordRange: '100-115 words', description: 'Balanced and comprehensive' },
    extended: { label: 'Extended', wordRange: '120-150 words', description: 'Detailed with more examples' },
  };
  return info[mode];
}
