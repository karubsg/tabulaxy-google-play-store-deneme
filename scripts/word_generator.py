import os
import json
import time
import google.generativeai as genai
from typing import List, Dict

# Configuration
DATA_FILE = "../public/data/words.json"
BACKUP_FILE = "../public/data/words_backup.json"

# Categories mapping
CATEGORIES = {
    1: "Entertainment (Eğlence) - Movies, Series, Music, Games, Media",
    2: "Science (Bilim) - Biology, Physics, Space, Chemistry, Nature",
    3: "Daily Life (Günlük Hayat) - Household, Routine, Food, Objects",
    4: "Culture (Kültür) - Art, History, Literature, Traditions, Holidays",
    5: "Technology (Teknoloji) - Computers, Internet, Gadgets, Innovation",
    6: "Mixed (Karışık) - Random simple concepts"
}

# Difficulties mapping
DIFFICULTIES = {
    1: "Easy (Kolay)",
    2: "Medium (Orta)",
    3: "Hard (Zor)",
    4: "Expert (Çok Zor)"
}

def setup_gemini():
    print("🤖 Tabulaxy Word Generator")
    print("--------------------------")
    api_key = input("Please enter your Gemini API Key: ").strip()
    if not api_key:
        print("API Key required!")
        exit(1)
    
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-pro')

def load_existing_words() -> List[Dict]:
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_words(words: List[Dict]):
    # Create backup first
    if os.path.exists(DATA_FILE):
        if os.path.exists(BACKUP_FILE):
            os.remove(BACKUP_FILE)
        os.rename(DATA_FILE, BACKUP_FILE)
    
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved {len(words)} words to {DATA_FILE}")

def generate_prompt(category_id: int, difficulty_id: int, count: int, existing_targets: List[str]) -> str:
    category = CATEGORIES[category_id]
    difficulty = DIFFICULTIES[difficulty_id]
    
    prompt = f"""
    Generate {count} unique Taboo game cards in Turkish for the category: '{category}' with difficulty: '{difficulty}'.
    
    Format must be a valid JSON array of objects. Each object must have:
    - "t": Target word (Uppercase string)
    - "f": Array of 5 Forbidden words (Title Case strings)
    - "c": Category ID ({category_id})
    - "d": Difficulty ID ({difficulty_id})
    
    Rules:
    1. Target words must be common Turkish terms fitting the category.
    2. Forbidden words must be the most obvious clues someone would use.
    3. Do NOT include these existing words: {', '.join(existing_targets[-50:])} (and others already known).
    4. STRICT JSON format only. No markdown, no explanations.
    
    Example:
    [
      {{"t": "ELMA", "f": ["Meyve", "Kırmızı", "Ağaç", "Yemek", "Vitamin"], "c": 3, "d": 1}}
    ]
    """
    return prompt

def main():
    try:
        model = setup_gemini()
        all_words = load_existing_words()
        existing_targets = [w['t'] for w in all_words]
        
        print(f"📊 Current dataset size: {len(all_words)} words")
        
        while True:
            print("\nOptions:")
            print("1. Generate specific batch")
            print("2. Auto-generate (Loop through all categories)")
            print("3. Exit")
            
            choice = input("Select option (1-3): ")
            
            if choice == '3':
                break
                
            if choice == '1':
                cat_id = int(input("Category ID (1-6): "))
                diff_id = int(input("Difficulty ID (1-4): "))
                count = int(input("Count (max 50): "))
                
                print("Generating...")
                try:
                    response = model.generate_content(generate_prompt(cat_id, diff_id, count, existing_targets))
                    text = response.text.strip()
                    if text.startswith('```json'):
                        text = text[7:-3]
                    
                    new_words = json.loads(text)
                    
                    # Validate and Add
                    added_count = 0
                    for w in new_words:
                        if w['t'] not in existing_targets:
                            all_words.append({
                                'target': w['t'],
                                'forbidden': w['f'],
                                'categoryId': w['c'],
                                'difficultyId': w['d'],
                                'modeFlags': 15 # Default to ALL modes
                            })
                            existing_targets.append(w['t'])
                            added_count += 1
                    
                    print(f"✅ Added {added_count} new words")
                    save_words(all_words)
                    
                except Exception as e:
                    print(f"❌ Error: {e}")
            
            elif choice == '2':
                print("🔄 Starting auto-generation loop (Ctrl+C to stop)")
                # Simple loop strategy: Iterate categories and difficulties
                try:
                    while True:
                        for cat in range(1, 7):
                            for diff in range(1, 5):
                                print(f"\nProcessing Cat: {cat}, Diff: {diff}")
                                try:
                                    response = model.generate_content(generate_prompt(cat, diff, 20, existing_targets))
                                    text = response.text.strip()
                                    if text.startswith('```json'):
                                        text = text.replace('```json', '').replace('```', '').strip()
                                    
                                    new_words = json.loads(text)
                                    
                                    added_count = 0
                                    for w in new_words:
                                        if w['t'] not in existing_targets:
                                            # Clean formatting
                                            clean_word = {
                                                'target': w['t'].upper().strip(),
                                                'forbidden': [f.title().strip() for f in w['f']],
                                                'categoryId': w['c'],
                                                'difficultyId': w['d'],
                                                'modeFlags': 15
                                            }
                                            all_words.append(clean_word)
                                            existing_targets.append(clean_word['target'])
                                            added_count += 1
                                    
                                    print(f"✅ Added {added_count} words. Total: {len(all_words)}")
                                    save_words(all_words)
                                    time.sleep(2) # Avoid rate limits
                                    
                                except Exception as e:
                                    print(f"⚠️ Generation failed for this batch: {e}")
                                    time.sleep(5)
                except KeyboardInterrupt:
                    print("\n🛑 Auto-generation stopped.")
                    
    except KeyboardInterrupt:
        print("\n👋 Bye!")

if __name__ == "__main__":
    main()
