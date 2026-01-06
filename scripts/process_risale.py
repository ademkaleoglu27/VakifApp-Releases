
import json
import re
import os

def is_arabic(text):
    # Check if a significant portion of the text is Arabic
    # Ranges: 0600-06FF, 0750-077F, 08A0-08FF, FB50-FDFF, FE70-FEFF
    arabic_chars = [c for c in text if '\u0600' <= c <= '\u06ff' or '\u0750' <= c <= '\u077f' or '\ufb50' <= c <= '\ufdff' or '\ufe70' <= c <= '\ufeff']
    return len(arabic_chars) > len(text) * 0.5 and len(arabic_chars) > 0

def has_arabic(text):
    for c in text:
        if '\u0600' <= c <= '\u06ff' or '\u0750' <= c <= '\u077f' or '\ufb50' <= c <= '\ufdff' or '\ufe70' <= c <= '\ufeff':
            return True
    return False

def split_arabic_mix(text):
    # Splits text into chunks of non-Arabic and Arabic
    # Regex to capture Arabic sequences
    pattern = r'([\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]+)'
    parts = re.split(pattern, text)
    blocks = []
    for part in parts:
        if not part:
            continue
        if is_arabic(part):
            blocks.append({"type": "arabic_block", "text": part})
        else:
            blocks.append({"type": "paragraph", "text": part})
            
    return merge_blocks(blocks)

def merge_blocks(blocks):
    if not blocks:
        return []
        
    merged = []
    current = blocks[0]
    
    for i in range(1, len(blocks)):
        next_block = blocks[i]
        
        # Merge logic:
        # If current is Arabic and next is Arabic -> Merge (unlikely with regex split but possible?)
        # If current is Arabic, next is whitespace Paragraph, next-next is Arabic?
        # Simpler: If current is Arabic, and next is whitespace Paragraph, we hold text.
        # Check if we can append next to current?
        # Only if next is whitespace AND followed by Arabic?
        # Or if we just merge whitespace into Arabic if it's between Arabics.
        
        # Iterative approach might be better.
        pass
        
    # Let's restart logic
    res = []
    buffer_block = None
    
    for b in blocks:
        if buffer_block:
            # Try to merge b into buffer_block
            if buffer_block['type'] == 'arabic_block':
                if b['type'] == 'arabic_block':
                    buffer_block['text'] += b['text']
                    continue
                elif b['type'] == 'paragraph' and b['text'].strip() == "":
                    # It's whitespace.
                    # We tentatively add it to buffer, but if the NEXT one is not Arabic, we might need to revert?
                    # This lookahead is annoying.
                    # Alternative: Change regex to include whitespace in the match if surrounded by Arabic? Hard.
                    pass
            
            # If we couldn't merge, flush buffer
            res.append(buffer_block)
            buffer_block = None
            
        buffer_block = b
        
    # To handle the whitespace merge correctly:
    # We can iterate and build a new list.
    # Group: Arabic + (Whitespace + Arabic)*
    
    new_blocks = []
    i = 0
    while i < len(blocks):
        current = blocks[i]
        
        if current['type'] == 'arabic_block':
            # Look ahead
            j = i + 1
            text_acc = current['text']
            consumed = 0
            
            while j < len(blocks):
                b1 = blocks[j]
                if b1['type'] == 'arabic_block':
                    text_acc += b1['text']
                    consumed += 1
                    j += 1
                elif b1['type'] == 'paragraph' and not b1['text'].strip():
                    # Whitespace. Check next.
                    if j + 1 < len(blocks) and blocks[j+1]['type'] == 'arabic_block':
                         text_acc += b1['text'] # Add whitespace
                         text_acc += blocks[j+1]['text'] # Add Arabic
                         consumed += 2
                         j += 2
                    else:
                        break
                else:
                    break
            
            new_blocks.append({"type": "arabic_block", "text": text_acc})
            i += 1 + consumed
        else:
            new_blocks.append(current)
            i += 1
            
    return new_blocks


def process_line(line):
    line = line.strip()
    if not line:
        return []
        
    blocks = []
    
    # 1. Check for pure Arabic line
    if is_arabic(line):
        return [{"type": "arabic_block", "text": line}]
    
    # 2. Check for Note
    if line.startswith('(') and line.endswith(')'):
        return [{"type": "note", "text": line}]
        
    # 3. Check for Heading
    # Heuristics: Short line, specific keywords, title case
    # Keywords: "Söz", "Mektup", "Lem'a", "Şuâ", "Makale", "Nükte", "İşaret", "Sır"
    # And usually starts with a number word or "Birinci", "İkinci"...
    lower_line = line.lower()
    heading_keywords = ["söz", "mektup", "lem'a", "lem’a", "şuâ", "makale", "nükte", "işaret", "sır", "makam", "hatime", "zeyl"]
    is_heading_candidate = len(line) < 80 and any(k in lower_line for k in heading_keywords)
    # Check if it looks like a title (mostly capitalized words or specific structure)
    if is_heading_candidate:
        # Refine: "Birinci Söz", "On Dördüncü Lem’a’nın İkinci Makamı", "Birinci Sır"
        # "Bismillah her hayrın başıdır." contains "Bismillah" but is a sentence.
        # Headings usually don't end with a period, except maybe some.
        if not line.endswith('.') and not line.endswith(':'):
             return [{"type": "heading", "text": line}]
             
    # 4. Check for Label
    # Starts with "Word:" or "Word Word:"
    # Examples: "İhtar:", "Sual:", "Elcevap:", "Biri:", "İkincisi:"
    label_match = re.match(r'^([^\s:]+(?:\s+[^\s:]+)?):(\s.*)', line)
    if label_match:
        label_text = label_match.group(1) + ":"
        rest_text = label_match.group(2) # Keep leading space
        
        # Verify label is short
        if len(label_text) < 30:
            blocks.append({"type": "label", "text": label_text})
            
            # Process the rest
            if rest_text:
                # The rest might contain Arabic mix
                if has_arabic(rest_text):
                    blocks.extend(split_arabic_mix(rest_text))
                else:
                    blocks.append({"type": "paragraph", "text": rest_text})
            return blocks

    # 5. Default: Paragraph (possibly mixed)
    if has_arabic(line):
        return split_arabic_mix(line)
    
    return [{"type": "paragraph", "text": line}]

def main():
    print("Script started")
    file_path = r"c:\VakifApp\tools\risale_source_data\txt\01 Sözler\Sözler-01-Birinci Söz.txt"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Read {len(lines)} lines")
        
    final_blocks = []
    
    for line in lines:
        # We need to handle original newlines? 
        # The prompt says "Metindeki orijinal sırayı KESİNLİKLE koru".
        # But usually blocking implies consuming the text.
        # I will process line by line.
        processed = process_line(line)
        final_blocks.extend(processed)

    print(f"Processed {len(final_blocks)} blocks")
        
    # Output to file
    output_path = r"c:\VakifApp\birinci_soz_blocks.json"
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(final_blocks, f, ensure_ascii=False, indent=2)
        print(f"JSON generated at {output_path}")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    main()
