import { TabuCard, GameMode } from '../types';
import { Word, WordQueryOptions, Category, Difficulty, CATEGORIES, DIFFICULTIES, MODE_FLAGS } from './database/types';
import { initializeDatabase, isDatabaseReady, persistDatabase } from './database/DatabaseManager';
import { getWords, getBalancedWords, markWordsAsUsed, clearSessionWords, getWordCount, bulkInsertWords, shuffleArray } from './database/WordRepository';
import { cacheManager } from './database/CacheManager';
import { getInitialSeedData } from './database/seeds/wordSeeds';

const PRELOAD_COUNT = 50;
const FETCH_BATCH_SIZE = 20;

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Current session tracking
let currentSessionId: string = generateSessionId();

/**
 * WordService - Main interface for word-related operations
 * Replaces the old geminiService
 */
class WordService {
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    /**
     * Initialize the word service
     * Call this on app startup
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this._doInitialize();
        await this.initPromise;
    }

    private async _doInitialize(): Promise<void> {
        try {
            console.log('[WordService] Initializing...');

            // Initialize database
            await initializeDatabase();

            // Check if we need to seed data
            const wordCount = getWordCount();
            console.log(`[WordService] Current word count: ${wordCount}`);

            if (wordCount < 100) {
                // console.log('[WordService] Seeding initial word data...');
                // await this.seedWords();
                console.warn('[WordService] Word count low but legacy seeding is disabled. Please check database loading.');
            }

            this.isInitialized = true;
            console.log('[WordService] Initialization complete');
        } catch (error) {
            console.error('[WordService] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Seed the database with initial word data
     * Tries to load from JSON file first, falls back to internal seeds
     */
    private async seedWords(): Promise<void> {
        let seedData: Omit<Word, 'id'>[] = [];

        try {
            // Try to fetch generated/extended dataset
            // Note: In dev mode, public folder is served at root
            const response = await fetch('data/words.json');
            if (response.ok) {
                const jsonData = await response.json();
                if (Array.isArray(jsonData) && jsonData.length > 0) {
                    console.log(`[WordService] Loaded ${jsonData.length} words from external JSON`);
                    seedData = jsonData.map((item: any) => ({
                        target: item.target || item.t,
                        forbidden: item.forbidden || item.f,
                        categoryId: item.categoryId || item.c,
                        difficultyId: item.difficultyId || item.d,
                        modeFlags: item.modeFlags || 15
                    }));
                }
            }
        } catch (e) {
            console.warn('[WordService] Failed to load external words.json, using legacy seeds', e);
        }

        // If external load failed or empty, use legacy seeds
        if (seedData.length === 0) {
            console.log('[WordService] Using legacy internal seeds');
            seedData = getInitialSeedData();
        } else {
            // Merge legacy seeds with external data to ensure core words exist
            const legacy = getInitialSeedData();
            const existingTargets = new Set(seedData.map(w => w.target.toUpperCase()));

            let addedLegacy = 0;
            for (const item of legacy) {
                if (!existingTargets.has(item.target.toUpperCase())) {
                    seedData.push(item);
                    addedLegacy++;
                }
            }
            console.log(`[WordService] Merged ${addedLegacy} legacy words`);
        }

        const inserted = bulkInsertWords(seedData);
        console.log(`[WordService] Seeded total ${inserted} words`);
        persistDatabase();
    }

    /**
     * Preload words for a specific mode
     * Call this before game starts for instant word availability
     */
    async preloadForMode(mode: GameMode, categoryIds?: number[]): Promise<void> {
        await this.initialize();

        // if (cacheManager.isPreloading(mode)) return;

        cacheManager.startPreload(mode);
        try {
            // HIGH PERFORMANCE STRATEGY:
            // Fetch ALL words for the mode at once (no random sort in DB)
            // Then shuffle in memory
            // Standardizing categoryIds
            const categories = typeof categoryIds === 'number' ? [categoryIds] : categoryIds;

            console.log(`[WordService] Preloading words for ${mode}...`);

            const words = getWords({
                mode,
                categoryIds: categories,
                excludeIds: [],
                count: 50000,
                sessionId: undefined,
                randomize: false
            });

            // Shuffle in memory (Fisher-Yates)
            const shuffled = shuffleArray(words);

            // Populate cache directly
            cacheManager.clearMode(mode); // Clear old small cache
            cacheManager.addWords(mode, shuffled);

            console.log(`[WordService] Preloaded & Shuffled ${shuffled.length} words for ${mode} (Zero Latency Ready)`);
        } catch (e) {
            console.error(`[WordService] Preload failed for ${mode}`, e);
        } finally {
            cacheManager.endPreload(mode);
        }
    }

    /**
     * Get words for gameplay
     * Uses cache first, falls back to database
     */
    async getWords(mode: GameMode, count: number = 10, categoryIds?: number[] | number): Promise<TabuCard[]> {
        await this.initialize();

        // Convert single ID to array if needed (backward compatibility)
        const categories = typeof categoryIds === 'number' ? [categoryIds] : categoryIds;

        // Try cache first
        let words = cacheManager.getWords(mode, count);

        if (words.length < count) {
            // Fetch from database
            const options: WordQueryOptions = {
                mode,
                categoryIds: categories,
                excludeIds: cacheManager.getAllUsedIds(),
                count: count - words.length + FETCH_BATCH_SIZE, // Fetch extra for cache
                sessionId: currentSessionId
            };

            const dbWords = categories && categories.length > 0 && categories.length < 6
                ? getWords(options) // Use getWords if specific categories (but getWords now handles array too)
                : getBalancedWords(options); // getBalancedWords also handles array now

            // Add to cache
            cacheManager.addWords(mode, dbWords);

            // Get what we need
            words = [...words, ...dbWords.slice(0, count - words.length)];
        }

        // Mark as used
        const wordIds = words.map(w => w.id);
        cacheManager.markAsUsed(mode, wordIds);
        markWordsAsUsed(currentSessionId, wordIds);

        // Convert to TabuCard format
        return this.toTabuCards(words, mode);
    }

    /**
     * Get a single word quickly
     * Uses cached words for instant retrieval
     */
    getNextWord(mode: GameMode): TabuCard | null {
        const words = cacheManager.getWords(mode, 1);
        if (words.length === 0) return null;

        const word = words[0];
        cacheManager.markAsUsed(mode, [word.id]);
        markWordsAsUsed(currentSessionId, [word.id]);

        return this.toTabuCards([word], mode)[0];
    }

    /**
     * Check if cache needs refill and trigger background fetch
     */
    checkAndRefillCache(mode: GameMode): void {
        if (cacheManager.needsRefill(mode) && !cacheManager.isPreloading(mode)) {
            // Trigger async refill without blocking
            this.preloadForMode(mode).catch(console.error);
        }
    }

    /**
     * Start a new game session
     * Clears used word tracking
     */
    startNewSession(): void {
        currentSessionId = generateSessionId();
        cacheManager.resetUsed();
        console.log(`[WordService] Started new session: ${currentSessionId}`);
    }

    /**
     * Get statistics
     */
    getStats(): { totalWords: number; cacheStats: Record<string, unknown> } {
        return {
            totalWords: getWordCount(),
            cacheStats: cacheManager.getStats()
        };
    }

    /**
     * Get categories
     */
    getCategories(): Category[] {
        return [
            { id: 1, name: 'Entertainment', nameTr: 'Eğlence', icon: '🎬', color: '#FF6B6B' },
            { id: 2, name: 'Science', nameTr: 'Bilim', icon: '🔬', color: '#4ECDC4' },
            { id: 3, name: 'Daily Life', nameTr: 'Günlük Hayat', icon: '🏠', color: '#45B7D1' },
            { id: 4, name: 'Culture', nameTr: 'Kültür', icon: '🎭', color: '#96CEB4' },
            { id: 5, name: 'Technology', nameTr: 'Teknoloji', icon: '💻', color: '#9B59B6' },
            { id: 6, name: 'Mixed', nameTr: 'Karışık', icon: '🎲', color: '#F39C12' }
        ];
    }

    /**
     * Get difficulty levels
     */
    getDifficulties(): Difficulty[] {
        return [
            { id: 1, name: 'Easy', nameTr: 'Kolay', weight: 1.5 },
            { id: 2, name: 'Medium', nameTr: 'Orta', weight: 1.0 },
            { id: 3, name: 'Hard', nameTr: 'Zor', weight: 0.7 },
            { id: 4, name: 'Expert', nameTr: 'Çok Zor', weight: 0.4 }
        ];
    }

    /**
     * Convert Words to TabuCard format (matches existing interface)
     */
    private toTabuCards(words: Word[], mode: GameMode): TabuCard[] {
        return words.map(word => {
            // For silent mode, override forbidden words
            if (mode === GameMode.SILENT) {
                return {
                    target: word.target,
                    forbidden: ['KONUŞMAK YASAK!', 'SES ÇIKARMAK YASAK!'],
                    category: 'Sessiz Sinema'
                };
            }

            // For marathon mode, show minimal forbidden
            if (mode === GameMode.MARATHON) {
                return {
                    target: word.target,
                    forbidden: ['Hızlı Ol!', 'Kelime Say!'],
                    category: 'Maraton'
                };
            }

            return {
                target: word.target,
                forbidden: word.forbidden,
                category: this.getCategoryName(word.categoryId)
            };
        });
    }

    private getCategoryName(categoryId: number): string {
        const categories: Record<number, string> = {
            1: 'Eğlence',
            2: 'Bilim',
            3: 'Günlük Hayat',
            4: 'Kültür',
            5: 'Teknoloji',
            6: 'Karışık'
        };
        return categories[categoryId] || 'Karışık';
    }
}

// Export singleton instance
export const wordService = new WordService();

// Export the fetch function for backward compatibility with existing code
export const fetchTabuCards = async (
    mode: GameMode,
    previousWords: string[],
    count: number = 10,
    categoryIds?: number[]
): Promise<TabuCard[]> => {
    return wordService.getWords(mode, count, categoryIds);
};
