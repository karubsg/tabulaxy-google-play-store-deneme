// Database Types
export interface Word {
  id: number;
  target: string;
  forbidden: string[];
  categoryId: number;
  difficultyId: number;
  modeFlags: number;
}

export interface Category {
  id: number;
  name: string;
  nameTr: string;
  icon?: string;
  color?: string;
}

export interface Difficulty {
  id: number;
  name: string;
  nameTr: string;
  weight: number;
}

export interface WordQueryOptions {
  mode: string; // GameMode enum value
  categoryIds?: number[]; // undefined = All or specific selection
  difficultyId?: number; // undefined = All (balanced distribution)
  excludeIds: number[];
  count: number;
  randomize?: boolean; // Default true. Set false for fast bulk fetch.
  sessionId?: string;
}

export interface UserProgress {
  id: number;
  totalGames: number;
  correctWords: number;
  tabuWords: number;
  passWords: number;
  favoriteCategoryId?: number;
  lastPlayed?: Date;
}

// Mode flags as bitmask
export const MODE_FLAGS = {
  CLASSIC: 1,   // 0001
  SILENT: 2,    // 0010
  MARATHON: 4,  // 0100
  JOURNEY: 8,   // 1000 - Uses all other modes
  ALL: 15       // 1111
} as const;

// Category constants
export const CATEGORIES = {
  ENTERTAINMENT: 1,
  SCIENCE: 2,
  DAILY_LIFE: 3,
  CULTURE: 4,
  TECHNOLOGY: 5,
  MIXED: 6
} as const;

// Difficulty constants
export const DIFFICULTIES = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
  EXPERT: 4
} as const;
