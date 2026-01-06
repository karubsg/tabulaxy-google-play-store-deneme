import sqlite3
import json
import random
import os

# Configuration
DB_PATH = 'public/assets/tabulaxy.db'
TOTAL_WORDS_PER_MODE = 10000
MODES = {
    'CLASSIC': 1,
    'SILENT': 2,
    'MARATHON': 4
}
DIFFICULTIES = [1, 2, 3, 4] # Easy, Medium, Hard, Expert
CATEGORIES = [1, 2, 3, 4, 5] # Exclude 6 (Mixed) for attribution

def create_schema(cursor):
    print("Creating schema...")
    
    # Categories
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_tr TEXT NOT NULL,
        icon TEXT,
        color TEXT
    )''')

    # Difficulties
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS difficulties (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        name_tr TEXT NOT NULL,
        weight REAL DEFAULT 1.0
    )''')

    # Words
    cursor.execute('''
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
    )''')

    # Session Words
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS session_words (
        session_id TEXT NOT NULL,
        word_id INTEGER NOT NULL,
        used_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (session_id, word_id),
        FOREIGN KEY (word_id) REFERENCES words(id)
    )''')

    # User Progress
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_games INTEGER DEFAULT 0,
        correct_words INTEGER DEFAULT 0,
        tabu_words INTEGER DEFAULT 0,
        pass_words INTEGER DEFAULT 0,
        favorite_category_id INTEGER,
        last_played TEXT,
        FOREIGN KEY (favorite_category_id) REFERENCES categories(id)
    )''')

    # Purchases
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL UNIQUE,
        purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    )''')

    # Settings
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )''')

    # Indices
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_words_mode_cat_diff ON words(mode_flags, category_id, difficulty_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_session_words_session ON session_words(session_id)')

def populate_static_data(cursor):
    print("Populating static data...")
    
    # Categories
    categories = [
        (1, 'Entertainment', 'Eğlence', '🎬', '#FF6B6B'),
        (2, 'Science', 'Bilim', '🔬', '#4ECDC4'),
        (3, 'Daily Life', 'Günlük Hayat', '🏠', '#45B7D1'),
        (4, 'Culture', 'Kültür', '🎭', '#96CEB4'),
        (5, 'Technology', 'Teknoloji', '💻', '#9B59B6'),
        (6, 'Mixed', 'Karışık', '🎲', '#F39C12')
    ]
    cursor.executemany('INSERT OR IGNORE INTO categories (id, name, name_tr, icon, color) VALUES (?, ?, ?, ?, ?)', categories)

    # Difficulties
    difficulties = [
        (1, 'Easy', 'Kolay', 1.5),
        (2, 'Medium', 'Orta', 1.0),
        (3, 'Hard', 'Zor', 0.7),
        (4, 'Expert', 'Çok Zor', 0.4)
    ]
    cursor.executemany('INSERT OR IGNORE INTO difficulties (id, name, name_tr, weight) VALUES (?, ?, ?, ?)', difficulties)

    # User Progress
    cursor.execute('INSERT OR IGNORE INTO user_progress (id) VALUES (1)')

    # Settings
    settings = [
        ('ads_removed', 'false'),
        ('premium_words', 'false'),
        ('sound_enabled', 'true'),
        ('vibration_enabled', 'true')
    ]
    cursor.executemany('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', settings)

def generate_words(cursor):
    print(f"Generating synthetic words ({TOTAL_WORDS_PER_MODE} per mode)...")
    
    words_data = []
    
    # 1. Classic Mode (Word + 5 Forbidden)
    print("- Generating Classic Words...")
    for i in range(TOTAL_WORDS_PER_MODE):
        diff = DIFFICULTIES[i % 4]
        cat = CATEGORIES[i % 5]
        target = f"KELIME_C_{i}"
        forbidden = json.dumps([f"Yasak_{target}_{j}" for j in range(1, 6)])
        # Classic words are also valid for Journey (8)
        flags = MODES['CLASSIC'] | 8 
        words_data.append((target, forbidden, cat, diff, flags))

    # 2. Silent Mode (Only Target, Forbidden logic handled by code or empty)
    # Note: App logic for Silent might override forbidden, but we store what?
    # App seeds say forbidden = ["KONUŞMAK YASAK!"...]. Script should probably match that or allow app to override.
    # Storing empty or specific array. Let's store specific to be safe.
    print("- Generating Silent Words...")
    silent_forbidden = json.dumps(["KONUŞMAK YASAK!", "SES ÇIKARMAK YASAK!"])
    for i in range(TOTAL_WORDS_PER_MODE):
        diff = DIFFICULTIES[i % 4]
        cat = 6 # Mixed
        target = f"KELIME_S_{i}"
        flags = MODES['SILENT'] | 8
        words_data.append((target, silent_forbidden, cat, diff, flags))

    # 3. Marathon Mode (Fast, minimal forbidden)
    print("- Generating Marathon Words...")
    marathon_forbidden = json.dumps(["Hızlı Ol!", "Kelime Say!"])
    for i in range(TOTAL_WORDS_PER_MODE):
        diff = DIFFICULTIES[i % 4]
        cat = 6 # Mixed
        target = f"KELIME_M_{i}"
        flags = MODES['MARATHON'] | 8
        words_data.append((target, marathon_forbidden, cat, diff, flags))

    print(f"Inserting {len(words_data)} words...")
    cursor.executemany('''
        INSERT INTO words (target, forbidden, category_id, difficulty_id, mode_flags)
        VALUES (?, ?, ?, ?, ?)
    ''', words_data)

def main():
    # Ensure directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Remove old DB if exists
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        create_schema(cursor)
        populate_static_data(cursor)
        generate_words(cursor)
        
        # Set user version to 3 so app migrations don't run unnecessary logic
        cursor.execute('PRAGMA user_version = 3')
        
        conn.commit()
        print("Database generated successfully!")
        
        # Verify count
        cursor.execute("SELECT COUNT(*) FROM words")
        count = cursor.fetchone()[0]
        print(f"Total Words in DB: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
        return
    finally:
        conn.close()

if __name__ == "__main__":
    main()
