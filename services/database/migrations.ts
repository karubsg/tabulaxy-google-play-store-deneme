import { Database } from 'sql.js';

export interface Migration {
    version: number;
    name: string;
    up: (db: Database) => void;
}

export const migrations: Migration[] = [
    {
        version: 1,
        name: 'initial_schema',
        up: (db: Database) => {
            // Categories table
            db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          name_tr TEXT NOT NULL,
          icon TEXT,
          color TEXT
        );
      `);

            // Difficulties table
            db.run(`
        CREATE TABLE IF NOT EXISTS difficulties (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          name_tr TEXT NOT NULL,
          weight REAL DEFAULT 1.0
        );
      `);

            // Words table - main data table
            db.run(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          target TEXT NOT NULL UNIQUE,
          forbidden TEXT NOT NULL,
          category_id INTEGER NOT NULL,
          difficulty_id INTEGER NOT NULL,
          mode_flags INTEGER DEFAULT 15,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (difficulty_id) REFERENCES difficulties(id)
        );
      `);

            // Session words - tracks used words per session
            db.run(`
        CREATE TABLE IF NOT EXISTS session_words (
          session_id TEXT NOT NULL,
          word_id INTEGER NOT NULL,
          used_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (session_id, word_id),
          FOREIGN KEY (word_id) REFERENCES words(id)
        );
      `);

            // Indices for fast queries
            db.run(`CREATE INDEX IF NOT EXISTS idx_words_mode_cat_diff 
              ON words(mode_flags, category_id, difficulty_id);`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_words_category 
              ON words(category_id);`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_words_difficulty 
              ON words(difficulty_id);`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_session_words_session 
              ON session_words(session_id);`);

            // Insert default categories
            db.run(`
        INSERT OR IGNORE INTO categories (id, name, name_tr, icon, color) VALUES
        (1, 'Entertainment', 'Eğlence', '🎬', '#FF6B6B'),
        (2, 'Science', 'Bilim', '🔬', '#4ECDC4'),
        (3, 'Daily Life', 'Günlük Hayat', '🏠', '#45B7D1'),
        (4, 'Culture', 'Kültür', '🎭', '#96CEB4'),
        (5, 'Technology', 'Teknoloji', '💻', '#9B59B6'),
        (6, 'Mixed', 'Karışık', '🎲', '#F39C12');
      `);

            // Insert difficulty levels with weights
            db.run(`
        INSERT OR IGNORE INTO difficulties (id, name, name_tr, weight) VALUES
        (1, 'Easy', 'Kolay', 1.5),
        (2, 'Medium', 'Orta', 1.0),
        (3, 'Hard', 'Zor', 0.7),
        (4, 'Expert', 'Çok Zor', 0.4);
      `);
        }
    },
    {
        version: 2,
        name: 'user_progress',
        up: (db: Database) => {
            // User progress and statistics
            db.run(`
        CREATE TABLE IF NOT EXISTS user_progress (
          id INTEGER PRIMARY KEY DEFAULT 1,
          total_games INTEGER DEFAULT 0,
          correct_words INTEGER DEFAULT 0,
          tabu_words INTEGER DEFAULT 0,
          pass_words INTEGER DEFAULT 0,
          favorite_category_id INTEGER,
          last_played TEXT,
          FOREIGN KEY (favorite_category_id) REFERENCES categories(id)
        );
      `);

            // Initialize with default row
            db.run(`INSERT OR IGNORE INTO user_progress (id) VALUES (1);`);
        }
    },
    {
        version: 3,
        name: 'purchases_and_settings',
        up: (db: Database) => {
            // In-app purchases tracking
            db.run(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL UNIQUE,
          purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        );
      `);

            // User settings
            db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

            // Default settings
            db.run(`
        INSERT OR IGNORE INTO settings (key, value) VALUES
        ('ads_removed', 'false'),
        ('premium_words', 'false'),
        ('sound_enabled', 'true'),
        ('vibration_enabled', 'true');
      `);
        }
    }
];
