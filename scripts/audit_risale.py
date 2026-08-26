import os
import re

SOURCE_DIR = r"c:\VakifApp\temp_risale_source\txt\01 Sözler"

# Regex from RisaleTextRenderer.tsx
AR_RANGE = r"\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF"
# Python re doesn't support \uXXXX consistently in ranges combined like that? 
# Actually python 3 does. But let's be safe.
# We will use the unicode ranges.
# simplified range for python: 
RE_ARABIC_PHRASE = re.compile(r'([' + AR_RANGE + r']+(?:[\s\.,;!?]+[' + AR_RANGE + r']+)*)', re.UNICODE)

SACRED_TERMS = [
    "Allah", "Rabb", "Rab", "İlah", "Mabud", "Hâlık", "Halık", "Sâni", "Sani",
    "Rahmân", "Rahman", "Rahîm", "Rahim", "Kerîm", "Kerim", "Hakîm", "Hakim",
    "Alîm", "Alim", "Kadîr", "Kadir", "Kuddûs", "Kuddus", "Kuddüs",
    "Adl", "Ferd", "Hayy", "Kayyûm", "Kayyum", "Şâfi", "Şafi", "Rezzâk", "Rezzak",
    "Cemîl", "Cemil", "Celîl", "Celil", "Vâhid", "Vahid", "Ehad", "Samed",
    "Bismillah", "Bi's-mi'llah", "Bismillahi",
    "Resul", "Nebi", "Peygamber", "Habib", "Sünnet", "Hadis", "Vahiy",
    "Kur'an", "Kur'ân", "Furkan", "Kelamullah",
    "Bediüzzaman", "Said Nursi", "Risale-i Nur", "Risale-i Nur'u",
    "Vesselam", "Elhamdülillah", "Sübhanallah", "Maşallah", "İnşallah",
    "Barekallah", "Ve aleykümselam", "Aleykümselam"
]

# Regex for Suffix checks: Word + Apostrophe + Suffix
# We want to find patterns in TEXT that resemble SacredSuffix but might be missed
TERMS_PATTERN = "|".join([re.escape(t) for t in SACRED_TERMS])
RE_SACRED_CANDIDATE = re.compile(rf'\b({TERMS_PATTERN})([\'’][a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+)', re.IGNORECASE)

def should_be_block(s):
    s = s.strip()
    if not s: return False
    if " " in s: return True
    if len(s) > 12: return True
    return False

def audit():
    print("Starting Audit...")
    files = sorted([f for f in os.listdir(SOURCE_DIR) if f.endswith(".txt")])
    
    total_ab_blocks = 0
    total_ab_inline = 0
    suffixes_found = set()

    for fname in files:
        path = os.path.join(SOURCE_DIR, fname)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check Arabic
        # Split into pseudo-paragraphs (lines)
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            # Find Arabic Phrases
            matches = RE_ARABIC_PHRASE.findall(line)
            for m in matches:
                # remove tags if any
                clean = re.sub(r'<[^>]+>', '', m)
                if should_be_block(clean):
                    total_ab_blocks += 1
                else:
                    total_ab_inline += 1

        # Check Suffixes (Global content scan)
        # Find all occurrences of Sacred Term + Suffix
        suffix_matches = RE_SACRED_CANDIDATE.findall(content)
        for term, suffix in suffix_matches:
            suffixes_found.add(f"{term}{suffix}")

    print(f"Total Files Scanned: {len(files)}")
    print(f"Total Arabic Blocks Detected (Space or >12 chars): {total_ab_blocks}")
    print(f"Total Arabic Inline Detected: {total_ab_inline}")
    print(f"Unique Sacred Words with Suffixes Found: {len(suffixes_found)}")
    print("Sample Suffixes:", list(suffixes_found)[:20])

if __name__ == "__main__":
    audit()
