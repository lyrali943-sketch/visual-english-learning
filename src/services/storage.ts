import type { Topic } from '../data/topics';

const STORAGE_KEYS = {
  PRACTICE_HISTORY: 'neon_speak_practice_history',
  FAVORITES: 'neon_speak_favorites',
  SETTINGS: 'neon_speak_settings',
  RECENT_TOPICS: 'neon_speak_recent_topics',
  RECORDINGS: 'neon_speak_recordings',
} as const;

export interface PracticeRecord {
  id: string;
  topicId: string;
  topic: Topic;
  practicedAt: number;
  duration: number; // actual speaking time in seconds
  preparationTime: number;
  speakingTime: number;
  selfRating: number; // 1-5
  notes: string;
  hasRecording: boolean;
}

export interface AppSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  defaultPreparationTime: number;
  defaultSpeakingTime: number;
}

export interface RecordingMeta {
  id: string;
  topicId: string;
  createdAt: number;
  duration: number;
  blob: Blob;
}

// Practice History
export function getPracticeHistory(): PracticeRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePracticeRecord(record: PracticeRecord): void {
  const history = getPracticeHistory();
  history.unshift(record);
  // Keep last 200 records
  const trimmed = history.slice(0, 200);
  localStorage.setItem(STORAGE_KEYS.PRACTICE_HISTORY, JSON.stringify(trimmed));
}

export function clearPracticeHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.PRACTICE_HISTORY);
}

// Favorites
export function getFavorites(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function isFavorite(topicId: string): boolean {
  return getFavorites().includes(topicId);
}

export function toggleFavorite(topicId: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(topicId);
  if (index > -1) {
    favorites.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return false;
  } else {
    favorites.push(topicId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    return true;
  }
}

// Settings
export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {
      soundEnabled: true,
      reducedMotion: false,
      defaultPreparationTime: 15,
      defaultSpeakingTime: 45,
    };
  } catch {
    return {
      soundEnabled: true,
      reducedMotion: false,
      defaultPreparationTime: 15,
      defaultSpeakingTime: 45,
    };
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
}

// Recent Topics (for avoiding repeats)
export function getRecentTopicIds(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_TOPICS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addRecentTopicId(topicId: string): void {
  const recent = getRecentTopicIds();
  recent.unshift(topicId);
  const trimmed = recent.slice(0, 20);
  localStorage.setItem(STORAGE_KEYS.RECENT_TOPICS, JSON.stringify(trimmed));
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
