import json
import re
import os

# --- Configuration ---
INPUT_FILE = r"c:\VakifApp\corpus_input.txt"
OUTPUT_DIR = r"c:\VakifApp\assets\risale_json"
META_VERSION = "1.0.5"
META_UPDATED = "2026-01-06"

# --- Stage 4: Premium Render Presets (Strict Schema) ---
PRESETS = {
    "heading": {
        "fontSizeDelta": 6,
        "fontWeight": "600",
        "textAlign": "center",
        "writingDirection": "ltr",
        "lineHeightMultiplier": 1.3,
        "marginTop": 28,
        "marginBottom": 18,
        "opacity": None
    },
    "note": {
        "fontSizeDelta": 0,
        "fontWeight": "400",
        "textAlign": "center",
        "writingDirection": "ltr",
        "lineHeightMultiplier": 1.55,
        "marginTop": 12,
        "marginBottom": 18,
        "opacity": 0.85
    },
    "arabic_block": {
        "fontSizeDelta": 2,
        "fontWeight": "400",
        "textAlign": "center",
        "writingDirection": "rtl",
        "lineHeightMultiplier": 1.6,
        "marginTop": 22,
        "marginBottom": 22,
        "opacity": None
    },
    "label": {
        "fontSizeDelta": 0,
        "fontWeight": "700",
        "textAlign": "left",
        "writingDirection": "ltr",
        "lineHeightMultiplier": 1.55,
        "marginTop": 18,
        "marginBottom": 4,
        "opacity": None
    },
    "paragraph": {
        "fontSizeDelta": 0,
        "fontWeight": "400",
        "textAlign": "justify",
        "writingDirection": "ltr",
        "lineHeightMultiplier": 1.62,
        "marginTop": 0,
        "marginBottom": 12,
        "opacity": None
    },
    "divider": {
        "fontSizeDelta": 0,
        "fontWeight": "400",
        "textAlign": "center",
        "writingDirection": "ltr",
        "lineHeightMultiplier": 1,
        "marginTop": 16,
        "marginBottom": 16,
        "opacity": 0.5
    }
}

# --- Stage 1: Block Logic ---

def is_arabic_content(text):
    # Arabic unicode ranges including presentation forms
    arabic_chars = [c for c in text if '\u0600' <= c <= '\u06ff' or '\u0750' <= c <= '\u077f' or '\ufb50' <= c <= '\ufdff' or '\ufe70' <= c <= '\ufeff']
    # If substantial arabic content exists
    return len(arabic_chars) > 0 and len(arabic_chars) > len(text) * 0.4

def get_block_type(text):
    # 1. Label Check (Endswith colon, short)
    # Checking for specific known labels is safer but heuristic works too
    if text.endswith(':'):
        if len(text) < 100: 
            return "label"
            
    # 2. Note Check (Parentheses)
    if text.startswith('(') and text.endswith(')'):
        return "note"
        
    # 3. Arabic Block Check
    if is_arabic_content(text):
        return "arabic_block"

    # 4. Heading Check
    clean_lower = text.lower()
    keywords = ["söz", "mektup", "lem'a", "şuâ", "makale", "nükte", "işaret", "sır", "makam", "hatime", "zeyl", "mesel", "ihtar", "sual", "elcevap"]
    
    if len(text) < 120:
        if text.isupper() and len(text) > 2:
            return "heading"
        
        # Title Case check for headings that are not fully uppercase
        if text[0].isupper() and not text.endswith('.'):
             if any(k in clean_lower for k in keywords):
                 return "heading"

    # 5. Default
    return "paragraph"

def clean_text(text):
    if not text:
        return ""
    # Trim and collapse multiple spaces
    return re.sub(r'\s+', ' ', text).strip()

def process_text_content(raw_content):
    lines = raw_content.split('\n')
    blocks = []
    
    for line in lines:
        cleaned = clean_text(line)
        if not cleaned:
            continue
            
        # Splitting Logic for Inline Labels (e.g. "Sual: Text...")
        split_match = re.match(r'^([A-ZİÇŞĞÜÖ][a-zıüöçğşA-ZİÜÖÇĞŞ\s]{1,40}:)\s+(.+)', cleaned)
        should_split = False
        
        if split_match:
            label_part = split_match.group(1)
            # Heuristic: mostly 1 or 2 words for these labels
            if len(label_part.split()) <= 4:
                should_split = True
        
        if should_split:
            label_text = split_match.group(1)
            content_text = split_match.group(2)
            
            blocks.append({
                "type": "label",
                "text": label_text
            })
            
            # Recurse/Determine type for the rest
            c_type = get_block_type(content_text)
            blocks.append({
                "type": c_type,
                "text": content_text
            })
            continue

        b_type = get_block_type(cleaned)
        
        blocks.append({
            "type": b_type,
            "text": cleaned
        })
        
    return blocks

# --- Stage 3: QA Reporting ---

def generate_qa_report(blocks):
    report = []
    
    divider_count = 0
    
    for i, block in enumerate(blocks):
        # 1. Duplicate Headings
        if block['type'] == 'heading':
            if i < len(blocks) - 1 and blocks[i+1]['type'] == 'heading':
                if block['text'] == blocks[i+1]['text']:
                    report.append(f"Duplicate heading at index {i}: {block['text']}")
        
        # 2. Suspicious Arabic Flow
        if block['type'] == 'arabic_block':
            if i < len(blocks) - 1 and blocks[i+1]['type'] == 'paragraph':
                next_text = blocks[i+1]['text']
                if next_text and next_text[0].islower():
                    report.append(f"Suspicious lowercase continuation after Arabic at index {i}: {next_text[:30]}...")
        
        # 3. Divider Count
        if block['type'] == 'paragraph' and block['text'] == '***':
            divider_count += 1
            
    report.append(f"Total dividers found: {divider_count}")
    return report

def process_corpus_file(input_file):
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading input: {e}")
        return

    works = re.split(r'===ESER_START===', content)
    generated_files = []
    
    print(f"Found {len(works)-1} works in corpus.")

    for work_raw in works:
        if not work_raw.strip():
            continue
            
        if '===ESER_END===' not in work_raw:
            continue
            
        work_content = work_raw.split('===ESER_END===')[0]
        
        # Parse Metadata
        title_match = re.search(r'TITLE:\s*(.*)', work_content)
        slug_match = re.search(r'SLUG:\s*(.*)', work_content)
        content_match = re.split(r'CONTENT:\s*', work_content, maxsplit=1)
        
        if not (title_match and slug_match and len(content_match) > 1):
            continue
            
        title = title_match.group(1).strip()
        slug = slug_match.group(1).strip()
        raw_text = content_match[1].strip()
        
        # Stage 1: Blocks
        blocks = process_text_content(raw_text)
        
        # Stage 3: QA
        qa_report = generate_qa_report(blocks)
        
        output_data = {
            "meta": {
                "title": title,
                "slug": slug,
                "version": 1
            },
            "blocks": blocks, # Strictly 'blocks' per instruction
            "presets": PRESETS, # Strictly 'presets' per instruction
            "qa_report": qa_report
        }
        
        filename = f"{slug}.json"
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
            
        generated_files.append(filename)
        print(f"Generated {filename}")

    # Generate Meta File
    if generated_files:
        meta_data = {
            "version": META_VERSION,
            "updatedAt": META_UPDATED,
            "books": generated_files
        }
        
        meta_path = os.path.join(OUTPUT_DIR, "risale.meta.json")
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    if os.path.exists(INPUT_FILE):
        process_corpus_file(INPUT_FILE)
    else:
        print(f"Input file not found at {INPUT_FILE}")
