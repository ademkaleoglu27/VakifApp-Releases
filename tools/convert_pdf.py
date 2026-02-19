
import os
import fitz  # PyMuPDF
from tqdm import tqdm
from PIL import Image
import io

# Configuration
PDF_PATH = "assets/risale_pdfs/buyuk_cevsen.pdf"
OUTPUT_DIR = "tools/output_pages"
FORMAT = "webp" # webp is smaller/better for apps
DPI = 200 # 200 is good balance

def convert_pdf():
    if not os.path.exists(PDF_PATH):
        print(f"❌ Error: {PDF_PATH} not found!")
        return

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"📁 Created output directory: {OUTPUT_DIR}")

    print(f"🚀 Starting conversion of {PDF_PATH}...")
    print(f"⚙️ Settings: DPI={DPI}, Format={FORMAT}")

    try:
        doc = fitz.open(PDF_PATH)
        print(f"📄 Found {len(doc)} pages.")

        for i, page in enumerate(tqdm(doc)):
            page_num = i + 1
            filename = f"page_{page_num:03d}.{FORMAT}"
            save_path = os.path.join(OUTPUT_DIR, filename)
            
            # Render page to image (Pixmap)
            pix = page.get_pixmap(dpi=DPI)
            
            # Convert to PIL Image
            img_data = pix.tobytes("ppm")
            img = Image.open(io.BytesIO(img_data))
            
            # Save as WebP
            img.save(save_path, FORMAT, quality=80)
        
        print(f"✅ Conversion complete! {len(doc)} images saved to {OUTPUT_DIR}")
        print("\nNext Steps:")
        print(f"1. Create a folder in your GitHub repo: VakifApp-Assets/books/buyuk_cevsen/")
        print(f"2. Upload all files from {OUTPUT_DIR} to that folder.")
        print(f"3. Update manifest.json with totalPages: {len(doc)}")
    
    except Exception as e:
        print(f"❌ Error during conversion: {e}")

if __name__ == "__main__":
    convert_pdf()
