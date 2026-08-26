import json
import re
import sys

# Constants
INPUT_FILE = 'birinci_soz_stage1.json'
OUTPUT_FILE = 'birinci_soz_final_structure.json'

def clean_text(text):
    if not text:
        return ""
    # Trim and collapse multiple spaces
    return re.sub(r'\s+', ' ', text).strip()

def process_blocks(blocks):
    cleaned_blocks = []
    
    for block in blocks:
        # 1. Validation: Check if type/text exist
        if 'type' not in block or 'text' not in block:
            continue
            
        # 2. Cleaning
        text = clean_text(block['text'])
        
        # Remove empty blocks
        if not text:
            continue
            
        cleaned_blocks.append({
            "type": block['type'],
            "text": text
        })
        
    return cleaned_blocks

def generate_qa_report(blocks):
    report = []
    
    for i, block in enumerate(blocks):
        # 2.1 Duplicate Headings
        if block['type'] == 'heading':
            if i < len(blocks) - 1 and blocks[i+1]['type'] == 'heading':
                 if block['text'] == blocks[i+1]['text']:
                     report.append({
                         "code": "DUPLICATE_HEADING", 
                         "index": i, 
                         "message": f"Duplicate heading found: {block['text']}"
                     })
                     
        # 2.2 Divider Check
        if block['type'] == 'paragraph' and block['text'] == '***':
            # This is technically fine but worth noting if it's not handled as a divider type?
            # User instructions said: "paragraph içinde tek başına '***' veya benzeri ayraçlar varsa"
            report.append({
                "code": "DIVIDER_IN_PARAGRAPH",
                "index": i,
                "message": "*** divider found in paragraph type"
            })
            
        # 2.3 Suspicious Arabic Flow
        if block['type'] == 'arabic_block':
            if i < len(blocks) - 1:
                next_block = blocks[i+1]
                # Check if next block starts with lowercase or looks like continuation "in binler..."
                # Heuristic: starts with lowercase letter?
                if next_block['text'] and next_block['text'][0].islower():
                     report.append({
                         "code": "SUSPICIOUS_FLOW_AFTER_ARABIC",
                         "index": i,
                         "message": f"Text after arabic block starts with lowercase: {next_block['text'][:20]}..."
                     })
                     
    return report

def generate_presets():
    return {
        "heading": {
            "fontFamily": "System", 
            "fontSizeDelta": 6,
            "fontWeight": "600",
            "textAlign": "center",
            "writingDirection": "ltr",
            "lineHeightMultiplier": 1.3,
            "marginTop": 24,
            "marginBottom": 16
        },
        "note": {
             "fontFamily": "System",
             "fontSizeDelta": -2,
             "fontWeight": "400",
             "textAlign": "center",
             "writingDirection": "ltr",
             "lineHeightMultiplier": 1.4,
             "marginTop": 8,
             "marginBottom": 8
             # Note: Italics would be handled by font selection in app code usually, keeping it simple here
        },
         "arabic_block": {
            "fontFamily": "System", # Should be Arabic font in real app
            "fontSizeDelta": 4,
            "fontWeight": "400",
            "textAlign": "center",
            "writingDirection": "rtl",
            "lineHeightMultiplier": 1.6,
            "marginTop": 16,
            "marginBottom": 16
        },
        "label": {
            "fontFamily": "System",
            "fontSizeDelta": 0,
            "fontWeight": "700",
            "textAlign": "left",
            "writingDirection": "ltr",
            "lineHeightMultiplier": 1.5,
            "marginTop": 16,
            "marginBottom": 4
        },
        "paragraph": {
            "fontFamily": "System",
            "fontSizeDelta": 0,
            "fontWeight": "400",
            "textAlign": "justify",
            "writingDirection": "ltr",
            "lineHeightMultiplier": 1.62,
            "marginTop": 0,
            "marginBottom": 12
        }
    }

def main():
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            raw_blocks = json.load(f)
    except FileNotFoundError:
        print(f"Error: {INPUT_FILE} not found.")
        return

    # Stage 3: Clean
    cleaned_blocks = process_blocks(raw_blocks)
    
    # Stage 3: QA
    qa_report = generate_qa_report(cleaned_blocks)
    
    # Stage 4: Presets
    presets = generate_presets()
    
    output_data = {
        "cleaned_blocks": cleaned_blocks,
        "qa_report": qa_report,
        "render_presets": presets
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed. Output written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
