/**
 * Poster factory — plain object creation, no side effects.
 */

import type { ContentSource, Difficulty, LearningMode, Poster, PosterContent, PosterThemeId } from '../types/poster'
import { DEFAULT_IMAGE_ADJUST } from '../types/poster'

export function createPosterId(): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `p_${Date.now().toString(36)}_${random}`
}

export interface CreatePosterInput {
  content: PosterContent
  mode: LearningMode
  difficulty: Difficulty
  photoDataUrl: string
  source: ContentSource
  theme?: PosterThemeId
  id?: string
  createdAt?: number
}

export function createPoster(input: CreatePosterInput): Poster {
  const now = input.createdAt ?? Date.now()
  return {
    id: input.id ?? createPosterId(),
    content: input.content,
    theme: input.theme ?? 'cream',
    mode: input.mode,
    difficulty: input.difficulty,
    photoDataUrl: input.photoDataUrl,
    imageAdjust: { ...DEFAULT_IMAGE_ADJUST },
    source: input.source,
    createdAt: now,
    updatedAt: now,
  }
}
