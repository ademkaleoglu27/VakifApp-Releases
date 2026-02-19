
import os
import zipfile
import hashlib
import json
from datetime import datetime

# Config
SOURCE_DIR = "tools/output_pages"
OUTPUT_DIR = "tools/dist"
BASE_NAME = "buyuk_cevsen"
MANIFEST_NAME = "manifest.json"
REPO_OWNER = "ademkaleoglu27"
REPO_NAME = "VakifApp-Assets"
BASE_URL_TEMPLATE = f"https://raw.githubusercontent.com/{REPO_OWNER}/{REPO_NAME}/main/books/buyuk_cevsen/{{}}"
MAX_SIZE_BYTES = 20 * 1024 * 1024 # 20MB limit

def calculate_sha256(file_path):
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def package():
    if not os.path.exists(SOURCE_DIR):
        print(f"❌ Source directory {SOURCE_DIR} not found!")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        # Clean output dir
        for f in os.listdir(OUTPUT_DIR):
            os.remove(os.path.join(OUTPUT_DIR, f))

    print(f"📦 Packaging files from {SOURCE_DIR}...")
    
    all_files = sorted([f for f in os.listdir(SOURCE_DIR) if f.endswith('.webp')])
    total_files = len(all_files)
    
    parts = []
    current_part_files = []
    current_part_size = 0
    part_index = 1
    
    global_page_start = 1

    for filename in all_files:
        filepath = os.path.join(SOURCE_DIR, filename)
        filesize = os.path.getsize(filepath)
        
        # Check if adding this file exceeds limit (heuristic: compressed size is roughly smaller, but let's be safe and use raw size sum for decision to force split earlier)
        # Actually WebP is already compressed, so zip won't shrink it much.
        if current_part_size + filesize > MAX_SIZE_BYTES and current_part_files:
            # Flush current part
            parts.append(create_zip_part(part_index, current_part_files))
            part_index += 1
            current_part_files = []
            current_part_size = 0
        
        current_part_files.append((filename, filepath))
        current_part_size += filesize

    # Flush last part
    if current_part_files:
        parts.append(create_zip_part(part_index, current_part_files))

    # Create Manifest
    manifest = {
        "version": "v1",
        "totalPages": total_files,
        "filePattern": "page_\\d{3}.webp",
        "downloadMode": "multipart",
        "cacheBust": str(int(datetime.now().timestamp())),
        "assets": parts,
        "updatedAt": datetime.now().isoformat()
    }
    
    manifest_path = os.path.join(OUTPUT_DIR, MANIFEST_NAME)
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=4)
        
    print(f"✅ Created {len(parts)} parts.")
    print(f"📄 Manifest saved to {manifest_path}")
    print("\n🚀 READY FOR UPLOAD!")
    print(f"Please upload everything in '{OUTPUT_DIR}' to GitHub.")

def create_zip_part(index, files):
    zip_filename = f"{BASE_NAME}_part{index}.zip"
    zip_path = os.path.join(OUTPUT_DIR, zip_filename)
    
    print(f"  -> Creating {zip_filename} with {len(files)} files...")
    
    start_page = int(files[0][0].split('_')[1].split('.')[0])
    end_page = int(files[-1][0].split('_')[1].split('.')[0])
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf: # STORED is faster and WebP is already compressed
        for fname, fpath in files:
            zipf.write(fpath, fname)
            
    size = os.path.getsize(zip_path)
    sha = calculate_sha256(zip_path)
    
    return {
        "id": f"part_{index}",
        "filename": zip_filename,
        "sizeBytes": size,
        "sha256": sha,
        "url": BASE_URL_TEMPLATE.format(zip_filename),
        "pageFrom": start_page,
        "pageTo": end_page
    }

if __name__ == "__main__":
    package()
