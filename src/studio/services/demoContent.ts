/**
 * Demo (offline) content.
 *
 * IMPORTANT: this data is NOT produced by analysing the user's photo. It is
 * clearly labelled "sample content" everywhere in the UI and on the poster.
 * It exists so the whole product (upload → layout → edit → export → library)
 * works before an AI provider is configured.
 */

import type { Difficulty, LearningMode, PosterContent } from '../types/poster'

export interface DemoPreset {
  id: string
  mode: LearningMode
  theme: string
  title: string
  subtitle: string
  detectedObjects: { label: string; translation: string }[]
  vocabulary: PosterContent['vocabulary']
  phrases: PosterContent['phrases']
  sentencePatterns: PosterContent['sentencePatterns']
  modelResponse: Record<Difficulty, { english: string; chinese: string }>
  speakingChallenges: PosterContent['speakingChallenges']
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'yogurt-bowl',
    mode: 'everyday',
    theme: 'Food & Cooking',
    title: 'BUILD YOUR BOWL',
    subtitle: 'Small bowl, big possibilities.',
    detectedObjects: [
      { label: 'yogurt', translation: '酸奶' },
      { label: 'strawberry', translation: '草莓' },
      { label: 'granola', translation: '格兰诺拉麦片' },
      { label: 'fig', translation: '无花果' },
      { label: 'blueberry', translation: '蓝莓' },
    ],
    vocabulary: [
      {
        term: 'yogurt',
        translation: '酸奶',
        explanation: 'A thick, creamy dairy food, often eaten with fruit or granola.',
        confidence: 0.97,
      },
      {
        term: 'granola',
        translation: '格兰诺拉麦片',
        explanation: 'Baked oats with nuts and seeds — crunchy and lightly sweet.',
        confidence: 0.94,
      },
      {
        term: 'blueberry',
        translation: '蓝莓',
        explanation: 'A small dark-blue berry with a soft, juicy bite.',
        confidence: 0.92,
      },
      {
        term: 'strawberry',
        translation: '草莓',
        explanation: 'A red heart-shaped berry with tiny seeds on the outside.',
        confidence: 0.9,
      },
      {
        term: 'fig',
        translation: '无花果',
        explanation: 'A soft, sweet fruit full of tiny seeds inside.',
        confidence: 0.86,
      },
    ],
    phrases: [
      {
        phrase: 'top it with fresh fruit',
        translation: '在上面铺满新鲜水果',
        explanation: 'Finish a dish by adding something on top.',
        example: 'Top it with fresh fruit and a few mint leaves.',
        usageNote: '“Top it with …” works for bowls, toast, pancakes and porridge.',
      },
      {
        phrase: 'add a handful of granola',
        translation: '抓一把格兰诺拉麦片放进去',
        explanation: '“A handful of” = the amount that fits in one hand.',
        example: 'Add a handful of granola right before you eat it.',
      },
      {
        phrase: 'drizzle honey over the top',
        translation: '在上面淋上蜂蜜',
        explanation: 'Pour a thin, even stream of liquid over food.',
        example: 'Drizzle honey over the top for a little extra sweetness.',
      },
      {
        phrase: 'a creamy texture',
        translation: '绵密的口感',
        explanation: 'Handy for describing yoghurt, soups and sauces.',
        example: 'This yoghurt has a rich, creamy texture.',
      },
      {
        phrase: 'a hint of sweetness',
        translation: '一丝甜味',
        explanation: '“A hint of” = a small, subtle amount.',
        example: 'There is just a hint of sweetness in the dressing.',
      },
    ],
    sentencePatterns: [
      {
        pattern: "It's not just … , it's …",
        translation: '这不只是……，更是……',
        example: "It's not just breakfast; it's a small morning ritual.",
        exampleTranslation: '这不只是早餐，更是一个清晨的小小仪式。',
        substitutions: [
          "not just a snack, it's fuel",
          "not just coffee, it's a pause",
          "not just a bowl, it's a habit",
        ],
      },
    ],
    modelResponse: {
      beginner: {
        english:
          'I made this bowl this morning. I put yogurt in a bowl first. Then I added granola and fresh fruit. The strawberries are sweet. The yogurt is very creamy. I like eating this for breakfast.',
        chinese:
          '今天早上我做了这个碗。我先在碗里放了酸奶，然后加入格兰诺拉麦片和新鲜水果。草莓很甜，酸奶很绵密。我喜欢早餐吃这个。',
      },
      intermediate: {
        english:
          'This is the breakfast bowl I made this morning. I started with a layer of thick yogurt, then added a handful of granola for crunch and topped it with fresh fruit — strawberries, figs and a few blueberries. I like to drizzle honey over the top at the very end, so the fruit keeps its fresh taste. It takes five minutes, but it changes the whole morning.',
        chinese:
          '这是我今天早上做的早餐碗。我先铺了一层浓稠的酸奶，然后抓一把格兰诺拉麦片增加酥脆口感，再铺上新鲜水果——草莓、无花果和几颗蓝莓。我喜欢最后才淋上蜂蜜，这样水果能保持清新的味道。它只花五分钟，却改变了整个早晨。',
      },
      advanced: {
        english:
          'What looks like a simple yogurt bowl is really a five-minute ritual. I layer thick yogurt with a handful of granola, then top it with whatever fruit is in season — this time figs, strawberries and blueberries. I drizzle honey over the top just before eating, so every spoonful stays balanced: creamy, crunchy, fresh.',
        chinese:
          '这个看似简单的酸奶碗，其实是一个五分钟的仪式。我把浓稠的酸奶铺底，加一把格兰诺拉麦片，再用当季水果点缀——这次是无花果、草莓和蓝莓。吃之前我才淋上蜂蜜，让每一口都保持平衡：绵密、酥脆、清新。',
      },
    },
    speakingChallenges: [
      {
        question: 'Walk me through your perfect breakfast bowl — what goes in first, and what goes on top?',
        translation: '说说你的完美早餐碗：最先放什么？最后又加什么？',
      },
      {
        question: 'Which food in this photo could you not live without, and why?',
        translation: '照片里的哪种食物是你离不开的？为什么？',
      },
      {
        question: 'If you opened a small café, what would you call this bowl and how would you describe it?',
        translation: '如果你开一家小咖啡馆，这款碗会叫什么名字？你会怎么介绍它？',
      },
    ],
  },
  {
    id: 'study-desk',
    mode: 'academic',
    theme: 'Study & Learning',
    title: 'DESK IN ORDER',
    subtitle: 'A quiet place to think clearly.',
    detectedObjects: [
      { label: 'notebook', translation: '笔记本' },
      { label: 'highlighter', translation: '荧光笔' },
      { label: 'laptop', translation: '笔记本电脑' },
      { label: 'sticky notes', translation: '便利贴' },
    ],
    vocabulary: [
      {
        term: 'deadline',
        translation: '截止日期',
        explanation: 'The time by which a piece of work must be finished.',
        confidence: 0.9,
      },
      {
        term: 'revision',
        translation: '复习',
        explanation: 'Reading work again before an exam to remember it better.',
        confidence: 0.88,
      },
      {
        term: 'highlight',
        translation: '标出重点',
        explanation: 'To mark the most important words in a text with colour.',
        confidence: 0.87,
      },
      {
        term: 'margin',
        translation: '页边空白',
        explanation: 'The empty space beside the text — useful for short notes.',
        confidence: 0.83,
      },
      {
        term: 'draft',
        translation: '草稿',
        explanation: 'An early version of a piece of writing that you improve later.',
        confidence: 0.85,
      },
    ],
    phrases: [
      {
        phrase: 'take notes by hand',
        translation: '手写笔记',
        explanation: 'Writing with a pen instead of typing.',
        example: 'I take notes by hand because I remember more.',
      },
      {
        phrase: 'keep track of deadlines',
        translation: '掌握各项截止日期',
        explanation: 'Stay aware of what is due and when.',
        example: 'A simple calendar helps me keep track of deadlines.',
      },
      {
        phrase: 'work in focused blocks',
        translation: '分块专注学习',
        explanation: 'Study for a set period, then take a short break.',
        example: 'I work in fifty-minute blocks with ten-minute breaks.',
      },
      {
        phrase: 'a clear head',
        translation: '清醒的头脑',
        explanation: 'A calm, uncluttered state of mind.',
        example: 'A tidy desk gives me a clear head.',
      },
    ],
    sentencePatterns: [
      {
        pattern: 'What helps me most is + noun / -ing',
        translation: '对我帮助最大的是……',
        example: 'What helps me most is writing my goals down the night before.',
        exampleTranslation: '对我帮助最大的是在前一晚把目标写下来。',
        substitutions: [
          'What helps me most is quiet music',
          'What helps me most is starting early',
          'What helped me most was a study group',
        ],
      },
    ],
    modelResponse: {
      beginner: {
        english:
          'I study at this desk every day. I keep my notebook and laptop here. Before I study, I clean the desk. I write my tasks on sticky notes. When the desk is clean, I can study better. I like quiet rooms.',
        chinese: '我每天在这张书桌前学习。我把笔记本和电脑放在这里。学习之前我会整理桌面，把任务写在便利贴上。桌面干净的时候，我学得更好。我喜欢安静的房间。',
      },
      intermediate: {
        english:
          'This is where I do most of my studying. I keep the surface almost empty — just my laptop, a notebook and a pen — because clutter makes it hard to focus. Every Sunday I write the week’s deadlines on sticky notes and put them where I can see them. I study in focused blocks of fifty minutes, and the short breaks keep my energy up.',
        chinese:
          '我大部分学习都是在这里完成的。我尽量让桌面保持空旷——只有电脑、笔记本和一支笔，因为杂乱会让人难以专注。每个周日，我会把一周的截止日期写在便利贴上，放在看得见的地方。我以五十分钟为单位专注学习，短暂的休息让我保持精力。',
      },
      advanced: {
        english:
          'A good study space is less about decoration than about removing friction. My desk holds only what the current task needs: a laptop, one notebook, a single pen. I plan the week in advance, break large assignments into reviewable blocks, and leave the last minutes of each session to write tomorrow’s first step.',
        chinese:
          '好的学习空间，关键不在于装饰，而在于减少阻力。我的桌上只放当前任务需要的东西：一台电脑、一个笔记本和一支笔。我会提前规划一周，把大作业拆成可复习的小块，并在每次学习结束前留几分钟写下明天的第一步。',
      },
    },
    speakingChallenges: [
      {
        question: 'How do you prepare your study space before an important task?',
        translation: '面对重要任务时，你会如何准备你的学习空间？',
      },
      {
        question: 'What distracts you most while studying, and what do you do about it?',
        translation: '学习时最让你分心的是什么？你会怎么处理？',
      },
      {
        question: 'If you designed the perfect study room, what would it look like?',
        translation: '如果你来设计一间理想的书房，它会是什么样子？',
      },
    ],
  },
  {
    id: 'morning-coffee',
    mode: 'business',
    theme: 'Work & Routine',
    title: 'MORNING BREW',
    subtitle: 'A small pause before the rush.',
    detectedObjects: [
      { label: 'mug', translation: '马克杯' },
      { label: 'notebook', translation: '笔记本' },
      { label: 'laptop', translation: '笔记本电脑' },
      { label: 'coffee beans', translation: '咖啡豆' },
    ],
    vocabulary: [
      {
        term: 'routine',
        translation: '例行习惯',
        explanation: 'Something you do in the same way, usually every day.',
        confidence: 0.91,
      },
      {
        term: 'deadline',
        translation: '截止日期',
        explanation: 'The time by which work must be completed.',
        confidence: 0.9,
      },
      {
        term: 'catch-up',
        translation: '快速沟通／补进度',
        explanation: 'A short meeting or message to share recent news.',
        confidence: 0.85,
      },
      {
        term: 'agenda',
        translation: '议程',
        explanation: 'The list of things to discuss in a meeting.',
        confidence: 0.88,
      },
      {
        term: 'follow-up',
        translation: '后续跟进',
        explanation: 'An action or email that continues something already started.',
        confidence: 0.86,
      },
    ],
    phrases: [
      {
        phrase: 'grab a coffee',
        translation: '顺手买杯咖啡',
        explanation: 'A casual, common way to invite someone for a short talk.',
        example: 'Let’s grab a coffee before the meeting.',
      },
      {
        phrase: 'clear the inbox',
        translation: '清空收件箱',
        explanation: 'Deal with emails so nothing is left unread.',
        example: 'I clear the inbox before lunch.',
      },
      {
        phrase: 'a quick catch-up',
        translation: '一个简短的近况沟通',
        explanation: 'A short, informal update between colleagues.',
        example: 'We had a quick catch-up on Monday.',
      },
      {
        phrase: 'circle back later',
        translation: '稍后再回来讨论',
        explanation: 'Polite way to postpone a topic.',
        example: 'Can we circle back to this after lunch?',
      },
    ],
    sentencePatterns: [
      {
        pattern: 'I’ll + verb + by + time',
        translation: '我会在……之前完成……',
        example: 'I’ll send the report by Friday afternoon.',
        exampleTranslation: '我会在周五下午之前把报告发过去。',
        substitutions: [
          'I’ll confirm by tomorrow morning',
          'I’ll review it by end of day',
          'I’ll have the draft by Monday',
        ],
      },
    ],
    modelResponse: {
      beginner: {
        english:
          'Every morning I make coffee at my desk. First I check my calendar. Then I answer the most important emails. The coffee helps me wake up. I work better in the morning. After coffee, I start my first task.',
        chinese: '每天早上我都会在桌前煮咖啡。我先查看日历，然后回复最重要的邮件。咖啡帮我清醒过来，我早上工作效率更高。喝完咖啡后，我开始第一项任务。',
      },
      intermediate: {
        english:
          'My working day starts with a mug of coffee and ten quiet minutes. Before opening my inbox, I write down the three things that must happen today. Then I clear the urgent emails, leave a quick note for my team, and move into focused work. It is a simple routine, but it means the day starts with choices, not with notifications.',
        chinese:
          '我的工作日从一杯咖啡和十分钟安静时光开始。打开收件箱之前，我会先写下今天必须完成的三件事。然后处理紧急邮件，给团队留一条简短留言，再进入专注工作。这是一个简单的习惯，但它让一天从“选择”开始，而不是从“通知”开始。',
      },
      advanced: {
        english:
          'The first hour sets the tone for the whole day, so I protect it. Coffee in hand, I review the calendar, name the one priority that truly matters, and park everything else in a written list. Only then do I open my inbox — by which point I am choosing what to answer instead of reacting to whatever arrived overnight.',
        chinese:
          '第一个小时决定了整天的基调，所以我会小心保护它。手握咖啡，我先浏览日历，确定唯一真正重要的优先事项，其余全部写进清单暂缓处理。只有在这之后，我才打开收件箱——此时是我在选择回复什么，而不是对夜间涌入的邮件做出反应。',
      },
    },
    speakingChallenges: [
      {
        question: 'Describe your morning routine from waking up to starting work.',
        translation: '描述一下你从起床到开始工作的早晨流程。',
      },
      {
        question: 'How do you decide what to do first when everything feels urgent?',
        translation: '当所有事情都很紧急时，你怎么决定先做什么？',
      },
      {
        question: 'What is one habit that makes your working day better?',
        translation: '哪一个习惯让你的工作日变得更好？',
      },
    ],
  },
]

export function getDemoPreset(mode: LearningMode): DemoPreset {
  return DEMO_PRESETS.find((preset) => preset.mode === mode) ?? DEMO_PRESETS[0]
}

/** Build demo content for the requested mode + difficulty. */
export function buildDemoContent(mode: LearningMode, difficulty: Difficulty): PosterContent {
  const preset = getDemoPreset(mode)
  return {
    title: preset.title,
    subtitle: preset.subtitle,
    theme: preset.theme,
    detectedObjects: preset.detectedObjects,
    vocabulary: preset.vocabulary,
    phrases: preset.phrases,
    sentencePatterns: preset.sentencePatterns,
    modelResponse: preset.modelResponse[difficulty],
    speakingChallenges: preset.speakingChallenges,
  }
}

/** Regenerate one module in demo mode (same preset, small deterministic change). */
export function buildDemoModule(
  mode: LearningMode,
  difficulty: Difficulty,
  module: 'vocabulary' | 'phrases' | 'sentencePatterns' | 'modelResponse' | 'speakingChallenges',
): unknown {
  const content = buildDemoContent(mode, difficulty)
  return content[module]
}
