import sqlite3
import os
import re

# Config
SOURCE_DIR = r"c:\VakifApp\temp_risale_source\txt\01 Sözler"
OUTPUT_DB = r"c:\VakifApp\assets\risale.db" # Writing directly to assets
WORK_ID = "sozler"
WORK_TITLE = "Sözler"

def create_tables(cursor):
    # Works
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS works (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            category TEXT,
            meta_json TEXT
        );
    """)
    # Sections
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            work_id TEXT NOT NULL,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            type TEXT,
            FOREIGN KEY(work_id) REFERENCES works(id)
        );
    """)
    # Paragraphs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS paragraphs (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL,
            text TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            is_arabic INTEGER DEFAULT 0,
            page_no INTEGER,
            FOREIGN KEY(section_id) REFERENCES sections(id)
        );
    """)
    # Indices
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sections_work ON sections(work_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_paragraphs_section ON paragraphs(section_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_paragraphs_section_order ON paragraphs(section_id, order_index);")

def is_arabic(text):
    # Simple check for Arabic unicode
    return any('\u0600' <= c <= '\u06ff' for c in text)

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        # BOM check and strip
        return f.read().replace('\ufeff', '').strip()

def main():
    if os.path.exists(OUTPUT_DB):
        os.remove(OUTPUT_DB)
        print(f"Removed existing DB at {OUTPUT_DB}")

    conn = sqlite3.connect(OUTPUT_DB)
    cursor = conn.cursor()
    create_tables(cursor)

    # Insert Work
    print(f"Inserting Work: {WORK_TITLE}...")
    cursor.execute("INSERT INTO works (id, title, order_index, category) VALUES (?, ?, ?, ?)", 
                   (WORK_ID, WORK_TITLE, 1, 'Risale-i Nur'))

    # Process Sections
    files = sorted([f for f in os.listdir(SOURCE_DIR) if f.endswith(".txt")])
    
    for idx, filename in enumerate(files):
        # Infer title from filename (e.g., "Sözler-01-Birinci Söz.txt" -> "Birinci Söz")
        # Assuming format: "Sözler-XX-SectionTitle.txt" or just "SectionTitle.txt"?
        # Looking at file list: "Sözler-01-Birinci Söz.txt"
        
        # Regex to extract title
        # Match "Sözler-\d+-(.*).txt"
        match = re.match(r"Sözler-\d+-(.*)\.txt", filename)
        if match:
            section_title = match.group(1).replace("(Sözler)", "").strip()
        else:
            section_title = filename.replace(".txt", "").strip()

        print(f"Processing Section {idx+1}: {section_title} ({filename})")
        
        section_id = f"{WORK_ID}-{idx+1:02d}" # sozler-01
        order_index = idx + 1
        
        cursor.execute("INSERT INTO sections (id, work_id, title, order_index) VALUES (?, ?, ?, ?)",
                       (section_id, WORK_ID, section_title, order_index))

        # content processing
        content = process_file(os.path.join(SOURCE_DIR, filename))
        
        # Split into paragraphs
        # Rule: Split by SINGLE newline to match source file structure
        # Filter out empty lines
        lines = content.split('\n')
        chunks = []
        for line in lines:
            normalized = line.strip()
            if normalized:
                chunks.append(normalized)
        
        p_index = 0
        for chunk in chunks:
            text = chunk.strip()
            if not text:
                continue

            # Check if it is a divider
            if set(text) <= {'*', ' '}:
                 # If usage requires dividers to be stored, store distinct type? 
                 # Current app logic renders "***" if text is "***"
                 pass 

            p_id = f"{section_id}-{p_index}"
            is_ar = 1 if is_arabic(text) else 0
            
            cursor.execute("INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic) VALUES (?, ?, ?, ?, ?)",
                           (p_id, section_id, text, p_index, is_ar))
            p_index += 1

    conn.commit()
    conn.close()
    print(f"Database generated successfully at {OUTPUT_DB}")

if __name__ == "__main__":
    main()
