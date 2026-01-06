import { Word, WordQueryOptions, MODE_FLAGS } from './types';
import { executeQuery, executeStatement, persistDatabase } from './DatabaseManager';
import { GameMode } from '../../types';

/**
 * Get mode flag from GameMode enum
 */
function getModeFlag(mode: string): number {
    switch (mode) {
        case GameMode.CLASSIC:
            return MODE_FLAGS.CLASSIC;
        case GameMode.SILENT:
            return MODE_FLAGS.SILENT;
        case GameMode.MARATHON:
            return MODE_FLAGS.MARATHON;
        case GameMode.JOURNEY:
            return MODE_FLAGS.ALL; // Journey uses all modes
        default:
            return MODE_FLAGS.ALL;
    }
}

/**
 * Query words from database with filtering options
 */
export function getWords(options: WordQueryOptions): Word[] {
    const { mode, categoryIds, difficultyId, excludeIds, count, sessionId } = options;
    const modeFlag = getModeFlag(mode);

    let sql = `
    SELECT 
      w.id,
      w.target,
      w.forbidden,
      w.category_id as categoryId,
      w.difficulty_id as difficultyId,
      w.mode_flags as modeFlags,
      d.weight as difficultyWeight
    FROM words w
    JOIN difficulties d ON w.difficulty_id = d.id
    WHERE (w.mode_flags & ?) != 0
  `;

    const params: unknown[] = [modeFlag];

    // Filter by categories if specified and not empty
    if (categoryIds && categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => '?').join(',');
        sql += ` AND w.category_id IN (${placeholders})`;
        params.push(...categoryIds);
    }

    // Filter by difficulty if specified
    if (difficultyId) {
        sql += ` AND w.difficulty_id = ?`;
        params.push(difficultyId);
    }

    // Exclude already used words
    if (excludeIds && excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(',');
        sql += ` AND w.id NOT IN (${placeholders})`;
        params.push(...excludeIds);
    }

    // Exclude session words if session provided
    if (sessionId) {
        sql += ` AND w.id NOT IN (SELECT word_id FROM session_words WHERE session_id = ?)`;
        params.push(sessionId);
    }

    // Random selection weighted by difficulty
    // Higher weight = higher chance of selection
    if (options.randomize !== false) {
        sql += ` ORDER BY RANDOM() * d.weight DESC`;
    }

    sql += ` LIMIT ?`;
    params.push(count);

    const results = executeQuery<{
        id: number;
        target: string;
        forbidden: string;
        categoryId: number;
        difficultyId: number;
        modeFlags: number;
    }>(sql, params);

    return results.map(row => ({
        id: row.id,
        target: row.target,
        forbidden: JSON.parse(row.forbidden),
        categoryId: row.categoryId,
        difficultyId: row.difficultyId,
        modeFlags: row.modeFlags
    }));
}

/**
 * Get balanced words from all categories (for "Genel" selection)
 * Implements anti-repetition and difficulty balancing
 */
export function getBalancedWords(options: Omit<WordQueryOptions, 'categoryIds'> & { categoryIds?: number[] }): Word[] {
    const { mode, categoryIds, excludeIds, count, sessionId } = options;
    const modeFlag = getModeFlag(mode);

    // Use provided categories or default to all standard (1-5)
    // If categoryIds is empty or undefined, assume all
    const targetCategories = (categoryIds && categoryIds.length > 0) ? categoryIds : [1, 2, 3, 4, 5];

    // Calculate count per category
    const categoriesCount = targetCategories.length;
    const perCategory = Math.ceil(count / categoriesCount);

    const allWords: Word[] = [];

    // Fetch from each target category
    for (const catId of targetCategories) {
        const categoryWords = getWords({
            mode,
            categoryIds: [catId],
            excludeIds: [...excludeIds, ...allWords.map(w => w.id)],
            count: perCategory,
            sessionId
        });
        allWords.push(...categoryWords);
    }

    // Shuffle the combined results
    return shuffleArray(allWords).slice(0, count);
}

/**
 * Mark words as used in current session
 */
export function markWordsAsUsed(sessionId: string, wordIds: number[]): void {
    for (const wordId of wordIds) {
        executeStatement(
            'INSERT OR IGNORE INTO session_words (session_id, word_id) VALUES (?, ?)',
            [sessionId, wordId]
        );
    }
    persistDatabase();
}

/**
 * Clear session words (start fresh)
 */
export function clearSessionWords(sessionId: string): void {
    executeStatement('DELETE FROM session_words WHERE session_id = ?', [sessionId]);
    persistDatabase();
}

/**
 * Get word count by mode
 */
export function getWordCount(mode?: string): number {
    let sql = 'SELECT COUNT(*) as count FROM words';
    const params: unknown[] = [];

    if (mode) {
        const modeFlag = getModeFlag(mode);
        sql += ' WHERE (mode_flags & ?) != 0';
        params.push(modeFlag);
    }

    const result = executeQuery<{ count: number }>(sql, params);
    return result[0]?.count || 0;
}

/**
 * Get word counts by category
 */
export function getWordCountsByCategory(): { categoryId: number; count: number }[] {
    const sql = `
    SELECT category_id as categoryId, COUNT(*) as count 
    FROM words 
    GROUP BY category_id
  `;
    return executeQuery<{ categoryId: number; count: number }>(sql);
}

/**
 * Insert a single word
 */
export function insertWord(word: Omit<Word, 'id'>): number {
    executeStatement(
        `INSERT INTO words (target, forbidden, category_id, difficulty_id, mode_flags) 
     VALUES (?, ?, ?, ?, ?)`,
        [
            word.target,
            JSON.stringify(word.forbidden),
            word.categoryId,
            word.difficultyId,
            word.modeFlags
        ]
    );

    const result = executeQuery<{ id: number }>('SELECT last_insert_rowid() as id');
    return result[0]?.id || 0;
}

/**
 * Bulk insert words (for seeding)
 */
export function bulkInsertWords(words: Omit<Word, 'id'>[]): number {
    let insertedCount = 0;

    for (const word of words) {
        try {
            insertWord(word);
            insertedCount++;
        } catch (e) {
            // Skip duplicates silently
            if (!(e instanceof Error && e.message.includes('UNIQUE constraint'))) {
                console.warn('[WordRepository] Failed to insert word:', word.target, e);
            }
        }
    }

    persistDatabase();
    return insertedCount;
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
