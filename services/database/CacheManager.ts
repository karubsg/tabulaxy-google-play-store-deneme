import { Word } from './types';
import { GameMode } from '../../types';

interface CacheEntry {
    words: Word[];
    usedIds: Set<number>;
    lastRefill: number;
}

const MAX_CACHE_SIZE = 15000; // Large enough for full mode dataset (10k)
const CACHE_REFILL_THRESHOLD = 50; // When to trigger background refill

/**
 * In-memory cache manager for words
 * Optimizes for instant word retrieval during gameplay
 */
class CacheManager {
    private caches: Map<string, CacheEntry> = new Map();
    private preloadInProgress: Set<string> = new Set();

    /**
     * Initialize cache for a specific mode
     */
    initialize(mode: GameMode): void {
        if (!this.caches.has(mode)) {
            this.caches.set(mode, {
                words: [],
                usedIds: new Set(),
                lastRefill: 0
            });
        }
    }

    /**
     * Get words from cache
     * @returns Available words (not yet used)
     */
    getWords(mode: GameMode, count: number): Word[] {
        const cache = this.caches.get(mode);
        if (!cache) return [];

        // Filter out used words
        const availableWords = cache.words.filter(w => !cache.usedIds.has(w.id));

        return availableWords.slice(0, count);
    }

    /**
     * Add words to cache
     */
    addWords(mode: GameMode, words: Word[]): void {
        this.initialize(mode);
        const cache = this.caches.get(mode)!;

        // Add new words, avoiding duplicates
        const existingIds = new Set(cache.words.map(w => w.id));
        const newWords = words.filter(w => !existingIds.has(w.id));

        cache.words = [...cache.words, ...newWords].slice(-MAX_CACHE_SIZE);
        cache.lastRefill = Date.now();
    }

    /**
     * Mark words as used
     */
    markAsUsed(mode: GameMode, wordIds: number[]): void {
        const cache = this.caches.get(mode);
        if (!cache) return;

        wordIds.forEach(id => cache.usedIds.add(id));
    }

    /**
     * Get IDs of used words
     */
    getUsedIds(mode: GameMode): number[] {
        const cache = this.caches.get(mode);
        return cache ? Array.from(cache.usedIds) : [];
    }

    /**
     * Get all used IDs across all modes
     */
    getAllUsedIds(): number[] {
        const allIds = new Set<number>();
        this.caches.forEach(cache => {
            cache.usedIds.forEach(id => allIds.add(id));
        });
        return Array.from(allIds);
    }

    /**
     * Check if cache needs refill
     */
    needsRefill(mode: GameMode): boolean {
        const cache = this.caches.get(mode);
        if (!cache) return true;

        const availableCount = cache.words.filter(w => !cache.usedIds.has(w.id)).length;
        return availableCount < CACHE_REFILL_THRESHOLD;
    }

    /**
     * Get available word count in cache
     */
    getAvailableCount(mode: GameMode): number {
        const cache = this.caches.get(mode);
        if (!cache) return 0;

        return cache.words.filter(w => !cache.usedIds.has(w.id)).length;
    }

    /**
     * Check if preload is already in progress
     */
    isPreloading(mode: GameMode): boolean {
        return this.preloadInProgress.has(mode);
    }

    /**
     * Mark preload as started
     */
    startPreload(mode: GameMode): void {
        this.preloadInProgress.add(mode);
    }

    /**
     * Mark preload as completed
     */
    endPreload(mode: GameMode): void {
        this.preloadInProgress.delete(mode);
    }

    /**
     * Clear cache for a specific mode
     */
    clearMode(mode: GameMode): void {
        const cache = this.caches.get(mode);
        if (cache) {
            cache.words = [];
            cache.usedIds.clear();
            cache.lastRefill = 0;
        }
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        this.caches.clear();
        this.preloadInProgress.clear();
    }

    /**
     * Reset used words only (keep cached words)
     */
    resetUsed(mode?: GameMode): void {
        if (mode) {
            const cache = this.caches.get(mode);
            if (cache) cache.usedIds.clear();
        } else {
            this.caches.forEach(cache => cache.usedIds.clear());
        }
    }

    /**
     * Get cache statistics (for debugging)
     */
    getStats(): Record<string, { total: number; available: number; used: number }> {
        const stats: Record<string, { total: number; available: number; used: number }> = {};

        this.caches.forEach((cache, mode) => {
            const available = cache.words.filter(w => !cache.usedIds.has(w.id)).length;
            stats[mode] = {
                total: cache.words.length,
                available,
                used: cache.usedIds.size
            };
        });

        return stats;
    }
}

// Singleton instance
export const cacheManager = new CacheManager();
