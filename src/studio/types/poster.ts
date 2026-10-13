/**
 * Shared data model for Visual English Studio.
 * These types are the single source of truth used by the UI, the demo
 * generator, the (future) AI service layer and the local library store.
 */

export type LearningMode = 'everyday' | 'academic' | 'business'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type PosterThemeId = 'cream' | 'sage' | 'blossom'
export type ContentSource = 'ai' | 'demo'

export interface ModeOption {
  id: LearningMode
  label: string
  hint: string
}

export interface DifficultyOption {
  id: Difficulty
  label: string
  hint: string
}

export interface DetectedObject {
  /** English label of something that is actually visible in the photo. */
  label: string
  /** Chinese label. */
  translation: string
}

export interface VocabularyItem {
  term: string
  translation: string
  /** Short English explanation. */
  explanation: string
  /** 0..1 — only used when the AI reports a relevance signal. */
  confidence?: number
}

export interface PhraseItem {
  phrase: string
  translation: string
  explanation: string
  example: string
  usageNote?: string
}

export interface SentencePattern {
  pattern: string
  translation: string
  example: string
  exampleTranslation: string
  substitutions: string[]
}

export interface ModelResponse {
  english: string
  chinese: string
}

export interface SpeakingChallenge {
  question: string
  translation: string
}

/** The five learning modules, plus poster copy. */
export interface PosterContent {
  title: string
  subtitle: string
  /** Human readable topic, e.g. "Food & Cooking". */
  theme: string
  detectedObjects: DetectedObject[]
  vocabulary: VocabularyItem[]
  phrases: PhraseItem[]
  sentencePatterns: SentencePattern[]
  modelResponse: ModelResponse
  speakingChallenges: SpeakingChallenge[]
}

/** Crop / framing of the user photo inside the poster. */
export interface ImageAdjust {
  /** object-position x, 0..100 */
  x: number
  /** object-position y, 0..100 */
  y: number
  /** zoom factor, 1..1.6 */
  zoom: number
}

/** A complete poster: content + photo + layout choices. */
export interface Poster {
  id: string
  content: PosterContent
  theme: PosterThemeId
  mode: LearningMode
  difficulty: Difficulty
  /** Photo as a data URL (JPEG). Never a blob URL — it must survive export. */
  photoDataUrl: string
  imageAdjust: ImageAdjust
  /** Where the learning content came from. Demo content is always labelled. */
  source: ContentSource
  createdAt: number
  updatedAt: number
}

/** Lightweight record for the Library grid. */
export interface LibraryRecord {
  id: string
  title: string
  subtitle: string
  theme: PosterThemeId
  mode: LearningMode
  difficulty: Difficulty
  source: ContentSource
  createdAt: number
  updatedAt: number
  /** Small preview image (data URL) for the grid. */
  thumbnailDataUrl: string
  poster: Poster
}

/** Photo prepared by the upload pipeline. */
export interface PreparedPhoto {
  /** Display size (max edge ~1280px). */
  previewDataUrl: string
  /** Size sent to the AI service (max edge ~1024px). */
  analysisDataUrl: string
  width: number
  height: number
  fileName: string
  fileSize: number
}

export const DEFAULT_IMAGE_ADJUST: ImageAdjust = { x: 50, y: 50, zoom: 1 }

export const MODE_OPTIONS: ModeOption[] = [
  { id: 'everyday', label: 'Everyday English', hint: 'Daily life, food, home, routines' },
  { id: 'academic', label: 'Academic English', hint: 'Study, research, campus topics' },
  { id: 'business', label: 'Business English', hint: 'Meetings, email, workplace talk' },
]

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: 'beginner', label: 'Beginner', hint: 'Simple words, short sentences' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Natural phrases, useful patterns' },
  { id: 'advanced', label: 'Advanced', hint: 'Nuanced expressions, richer structures' },
]

export interface PosterThemeOption {
  id: PosterThemeId
  label: string
  /** Swatch colours for the theme picker (mirrors poster.css). */
  bg: string
  ink: string
  accent: string
}

export const POSTER_THEMES: PosterThemeOption[] = [
  { id: 'cream', label: 'Warm Cream', bg: '#F7F2E9', ink: '#432817', accent: '#C84D3A' },
  { id: 'sage', label: 'Sage Paper', bg: '#F1EFE3', ink: '#2C3126', accent: '#4E6B50' },
  { id: 'blossom', label: 'Blush Ink', bg: '#F8EFE9', ink: '#3F252B', accent: '#B4536B' },
]

/** Hard limits used by validation and by the poster renderer. */
export const CONTENT_LIMITS = {
  title: 42,
  subtitle: 90,
  theme: 32,
  vocabulary: { min: 4, max: 6, term: 30, translation: 18, explanation: 76 },
  phrases: { min: 3, max: 5, phrase: 44, translation: 26, explanation: 84, example: 104 },
  patterns: { min: 1, max: 2, pattern: 70, translation: 30, example: 130, substitutions: 4 },
  modelResponse: { english: 320, chinese: 140 },
  challenges: { min: 2, max: 3, question: 84, translation: 40 },
  detectedObjects: { max: 4, label: 24, translation: 18 },
} as const
