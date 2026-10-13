import type { Topic } from '../data/topics';

/**
 * Get a random topic from a list, avoiding recently shown topics
 */
export function getRandomTopic(
  topics: Topic[],
  excludeIds: string[] = [],
  maxAvoid: number = 5
): Topic | null {
  if (topics.length === 0) return null;

  const recentExclude = excludeIds.slice(0, maxAvoid);
  let candidates = topics.filter(t => !recentExclude.includes(t.id));

  // If all topics are excluded, allow reusing recent ones
  if (candidates.length === 0) {
    candidates = topics;
  }

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

/**
 * Get multiple random topics for animation display
 */
export function getRandomTopicsForAnimation(
  count: number,
  excludeId?: string
): Topic[] {
  const shuffled = [...getShuffledTopics()];
  if (excludeId) {
    const idx = shuffled.findIndex(t => t.id === excludeId);
    if (idx > -1) shuffled.splice(idx, 1);
  }
  return shuffled.slice(0, count);
}

/**
 * Shuffle topics using Fisher-Yates algorithm
 */
export function getShuffledTopics(): Topic[] {
  const shuffled = [...shuffleArray([...getAllTopics()])];
  return shuffled;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

import { TOPICS } from '../data/topics';

function getAllTopics(): Topic[] {
  return TOPICS;
}

/**
 * Format seconds into MM:SS display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate estimated speaking time for a given word count
 * Average speaking rate: ~130 words per minute
 */
export function estimateSpeakingTime(wordCount: number): number {
  return Math.ceil((wordCount / 130) * 60);
}

/**
 * Count words in a text
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
