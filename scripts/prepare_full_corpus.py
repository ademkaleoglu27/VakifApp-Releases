import os
import re

SOURCE_DIR = r"c:\VakifApp\temp_risale_source\txt"
OUTPUT_FILE = r"c:\VakifApp\corpus_input.txt"

# Mapping: Folder Name -> (Slug, Title)
FOLDER_MAP = {
    "01 Sözler": ("sozler", "Sözler"),
    "02 Mektubat": ("mektubat", "Mektubat"),
    "03 Lem'alar": ("lemalar", "Lem'alar"),
    "04 Şuâlar": ("sualar", "Şuâlar"),
    "05 Tarihçe-i Hayat": ("tarihce-i-hayat", "Tarihçe-i Hayat"),
    "06 Mesnevî-i Nuriye": ("mesnevi-nuriye", "Mesnevî-i Nuriye"),
    "07 İşaratü'l-i'caz": ("isaratul-icaz", "İşaratü'l-İ'caz"),
    "08 Sikke-i Tasdik-i Gaybî": ("sikke-i-tasdiki-gaybi", "Sikke-i Tasdik-i Gaybî"),
    "09 Barla Lâhikası": ("barla-lahikasi", "Barla Lâhikası"),
    "10 Kastamonu Lâhikası": ("kastamonu-lahikasi", "Kastamonu Lâhikası"),
    "13 Asâ-yı Musa": ("asayi-musa", "Asâ-yı Musa"),
    "15 Muhakemat": ("muhakemat", "Muhakemat"),
}

# Combined books: (List of Folders -> (Slug, Title))
COMBINED_MAP = {
    "emirdag-lahikasi": {
         "folders": ["11 Emirdağ Lâhikası 1", "12 Emirdağ Lâhikası 2"],
         "title": "Emirdağ Lâhikası"
    }
}

# Individual Files in 14 Küçük Kitaplar
SMALL_BOOKS_FOLDER = "14 Küçük Kitaplar"
SMALL_BOOKS_MAP = {
    "Gençli̇k Rehberi̇.txt": ("genclik-rehberi", "Gençlik Rehberi"),
    "Hanimlar Rehberi̇.txt": ("hanimlar-rehberi", "Hanımlar Rehberi"),
    "Münazarat.txt": ("munazarat", "Münazarat"),
    "Hutbe-i̇ Şami̇ye.txt": ("hutbe-i-samiye", "Hutbe-i Şamiye"),
    "Di̇van-i Harb-i̇ Örfî.txt": ("divan-i-harb-i-orfi", "Divan-ı Harb-i Örfî"),
    "Nur'un İlk Kapısı.txt": ("nurun-ilk-kapisi", "Nur'un İlk Kapısı"),
    "Sünuhat.txt": ("sunuhat", "Sünuhat"),
    "Tulûat.txt": ("tuluat", "Tulûat"),
    "İşarat.txt": ("isarat", "İşarat"),
    "Nur Çeşmesi̇.txt": ("nur-cesmesi", "Nur Çeşmesi"),
    "Konferans.txt": ("konferans", "Konferans"),
}

def clean_text(text):
    # Ensure UTF-8 clean and remove BOM if present
    return text.replace('\ufeff', '').strip()

def process_folder(folder_path):
    # Read all txt files sorted by name
    files = sorted([f for f in os.listdir(folder_path) if f.endswith(".txt")])
    content = ""
    for file in files:
        with open(os.path.join(folder_path, file), 'r', encoding='utf-8', errors='ignore') as f:
            content += clean_text(f.read()) + "\n\n***\n\n"
    return content

def main():
    print(f"Aggregating corpus from {SOURCE_DIR}...")
    full_corpus = ""
    
    # 1. Standard Folders
    for folder_name, (slug, title) in FOLDER_MAP.items():
        folder_path = os.path.join(SOURCE_DIR, folder_name)
        if os.path.exists(folder_path):
            print(f"Processing {folder_name} -> {slug}")
            content = process_folder(folder_path)
            full_corpus += f"===ESER_START===\nTITLE: {title}\nSLUG: {slug}\nCONTENT:\n{content}\n===ESER_END===\n\n"
        else:
            print(f"Warning: Folder not found {folder_name}")

    # 2. Combined Books (Emirdağ)
    for slug, info in COMBINED_MAP.items():
        title = info['title']
        print(f"Processing Combined -> {slug}")
        combined_content = ""
        for folder_name in info['folders']:
            folder_path = os.path.join(SOURCE_DIR, folder_name)
            if os.path.exists(folder_path):
                combined_content += process_folder(folder_path) + "\n"
        
        full_corpus += f"===ESER_START===\nTITLE: {title}\nSLUG: {slug}\nCONTENT:\n{combined_content}\n===ESER_END===\n\n"

    # 3. Small Books
    folder_path = os.path.join(SOURCE_DIR, SMALL_BOOKS_FOLDER)
    if os.path.exists(folder_path):
        print(f"Processing {SMALL_BOOKS_FOLDER}")
        for filename, (slug, title) in SMALL_BOOKS_MAP.items():
            file_path = os.path.join(folder_path, filename)
            if os.path.exists(file_path):
                print(f"  Processing {filename} -> {slug}")
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = clean_text(f.read())
                full_corpus += f"===ESER_START===\nTITLE: {title}\nSLUG: {slug}\nCONTENT:\n{content}\n===ESER_END===\n\n"
            else:
                 # Try ignoring unicode accents in filename if direct match fails? 
                 # Python file system calls usually handle this but sometimes...
                 pass

    # Write Output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(full_corpus)
    
    print(f"Successfully generated {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
