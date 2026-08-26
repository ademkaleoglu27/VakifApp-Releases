import sqlite3
import json
import os
import glob

DB_PATH = '../assets/risale.db'
JSON_DIR = '../assets/risale_json'

# Ensure the assets directory exists relative to script
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Create Tables
c.execute('''
    CREATE TABLE works (
        id TEXT PRIMARY KEY,
        title TEXT,
        category TEXT,
        order_index INTEGER
    )
''')

c.execute('''
    CREATE TABLE sections (
        id TEXT PRIMARY KEY,
        work_id TEXT,
        title TEXT,
        order_index INTEGER,
        FOREIGN KEY(work_id) REFERENCES works(id)
    )
''')

c.execute('''
    CREATE TABLE paragraphs (
        id TEXT PRIMARY KEY,
        section_id TEXT,
        text TEXT,
        order_index INTEGER,
        FOREIGN KEY(section_id) REFERENCES sections(id)
    )
''')

# Order of works (Manual priority)
PRIORITY_ORDER = [
    'sozler', 'mektubat', 'lemalar', 'sualar', # Major 4
    'barla-lahikasi', 'kastamonu-lahikasi', 'emirdag-lahikasi', # Lahikas
    'tarihce-i-hayat', 'isaratul-icaz', 'mesnevi-nuriye', 'sikke-i-tasdiki-gaybi',
    'asayi-musa', 'zulfikar'
]

json_files = glob.glob(os.path.join(JSON_DIR, '*.json'))
json_files.sort()

# Helper to get order index
def get_work_order(slug):
    try:
        return PRIORITY_ORDER.index(slug)
    except ValueError:
        return 999

current_work_order = 0

for json_path in json_files:
    if 'risale.meta.json' in json_path:
        continue
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    meta = data.get('meta', {})
    slug = meta.get('slug', os.path.basename(json_path).replace('.json', ''))
    title = meta.get('title', slug.title())
    
    order_idx = get_work_order(slug)
    
    print(f"Processing Work: {title} ({slug})")
    
    c.execute('INSERT INTO works (id, title, category, order_index) VALUES (?, ?, ?, ?)',
              (slug, title, 'Risale-i Nur', order_idx))
    
    blocks = data.get('blocks', [])
    
    section_index = 0
    paragraph_seq = 0
    
    current_section_id = None
    current_section_title = None
    
    for block in blocks:
        b_type = block.get('type')
        b_text = block.get('text', '').strip()
        
        if not b_text:
            continue
            
        if b_type == 'heading':
            # Avoid duplicate consecutive headers creating empty sections
            if b_text == current_section_title:
                continue
                
            section_index += 1
            current_section_id = f"{slug}-{section_index}"
            current_section_title = b_text
            
            c.execute('INSERT INTO sections (id, work_id, title, order_index) VALUES (?, ?, ?, ?)',
                      (current_section_id, slug, current_section_title, section_index))
            paragraph_seq = 0 # Reset paragraph count for new section
            
        elif current_section_id: # Only add paragraphs if we are inside a section
            paragraph_seq += 1
            # Combine type and text for context if needed, but for now just text
            # For Arabic, maybe wrap?
            final_text = b_text
            if b_type == 'arabic_block':
               final_text = f"<ar>{b_text}</ar>"
               
            p_id = f"{current_section_id}-p{paragraph_seq}"
            c.execute('INSERT INTO paragraphs (id, section_id, text, order_index) VALUES (?, ?, ?, ?)',
                      (p_id, current_section_id, final_text, paragraph_seq))

    conn.commit()

print("Database rebuilt successfully.")
conn.close()
