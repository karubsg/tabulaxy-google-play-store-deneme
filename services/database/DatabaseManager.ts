import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { migrations } from './migrations';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let isInitialized = false;

const DB_STORAGE_KEY = 'tabulaxy_sqlite_db';

/**
 * Initialize the SQL.js library and database
 * Call this once at app startup
 */
export async function initializeDatabase(): Promise<void> {
    if (isInitialized) return;

    try {
        // Load sql.js WASM module
        SQL = await initSqlJs({
            // Load the WASM file from CDN (works in browser)
            locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });

        if (!SQL) {
            throw new Error('Failed to initialize SQL.js');
        }

        // Try to load existing database from localStorage
        const savedDb = localStorage.getItem(DB_STORAGE_KEY);

        if (savedDb) {
            try {
                const buffer = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
                db = new SQL.Database(buffer);
                console.log('[DB] Loaded existing database from localStorage');
            } catch (e) {
                console.warn('[DB] Failed to load saved database, creating new one', e);
                db = new SQL.Database();
            }
        } else {
            console.log('[DB] No saved database found, loading from assets...');
            try {
                // Use Vite's BASE_URL to handle deployment subpaths correctly
                const baseUrl = import.meta.env.BASE_URL; // e.g., '/tabulaxy/'
                const dbUrl = `${baseUrl}assets/tabulaxy.db`.replace('//', '/'); // Avoid double slashes if base ends with /

                const response = await fetch(dbUrl);
                if (!response.ok) throw new Error('Failed to load database file');

                const buffer = await response.arrayBuffer();
                db = new SQL.Database(new Uint8Array(buffer));
                console.log('[DB] Loaded pre-populated database from assets');
            } catch (e) {
                console.error('[DB] Failed to load asset database, falling back to empty:', e);
                db = new SQL.Database();
            }
        }

        // Run migrations
        await runMigrations();

        // Persist after migrations
        persistDatabase();

        isInitialized = true;
        console.log('[DB] Database initialization complete');
    } catch (error) {
        console.error('[DB] Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Get the database instance
 * @throws Error if database is not initialized
 */
export function getDatabase(): Database {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

/**
 * Check if database is initialized
 */
export function isDatabaseReady(): boolean {
    return isInitialized && db !== null;
}

/**
 * Persist the database to localStorage
 */
export function persistDatabase(): void {
    if (!db) return;

    try {
        const data = db.export();
        const buffer = new Uint8Array(data);
        const binary = Array.from(buffer).map(b => String.fromCharCode(b)).join('');
        localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
        console.log('[DB] Database persisted to localStorage');
    } catch (e) {
        console.error('[DB] Failed to persist database:', e);
    }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
    if (!db) throw new Error('Database not available');

    // Create migrations table if not exists
    db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

    // Get current version
    const result = db.exec('SELECT MAX(version) as version FROM schema_migrations');
    const currentVersion = result[0]?.values[0]?.[0] as number || 0;

    console.log(`[DB] Current schema version: ${currentVersion}`);

    // Run pending migrations
    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            console.log(`[DB] Running migration ${migration.version}: ${migration.name}`);

            try {
                migration.up(db);
                db.run(
                    'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
                    [migration.version, migration.name]
                );
                console.log(`[DB] Migration ${migration.version} completed`);
            } catch (e) {
                console.error(`[DB] Migration ${migration.version} failed:`, e);
                throw e;
            }
        }
    }
}

/**
 * Execute a raw SQL query and return results
 */
export function executeQuery<T = unknown[]>(sql: string, params: unknown[] = []): T[] {
    const database = getDatabase();

    try {
        const stmt = database.prepare(sql);
        stmt.bind(params);

        const results: T[] = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject() as T);
        }
        stmt.free();

        return results;
    } catch (e) {
        console.error('[DB] Query failed:', sql, e);
        throw e;
    }
}

/**
 * Execute a SQL statement (INSERT, UPDATE, DELETE)
 */
export function executeStatement(sql: string, params: unknown[] = []): void {
    const database = getDatabase();
    database.run(sql, params);
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (db) {
        persistDatabase();
        db.close();
        db = null;
        isInitialized = false;
        console.log('[DB] Database closed');
    }
}
