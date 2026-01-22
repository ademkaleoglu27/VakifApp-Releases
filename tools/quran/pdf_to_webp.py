import os
import json
import argparse
import fitz  # PyMuPDF
from PIL import Image

def convert_pdf_to_webp(pdf_path, output_dir, target_width=2200, quality=82):
    """
    Converts each page of a PDF into an optimized WebP image.
    Generates a manifest.json for the app.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return

    pages_dir = os.path.join(output_dir, "pages")
    os.makedirs(pages_dir, exist_ok=True)

    print(f"Opening PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    page_count = len(doc)
    print(f"Found {page_count} pages.")

    for page_num in range(page_count):
        print(f"Processing page {page_num + 1}/{page_count}...", end="\r")
        page = doc.load_page(page_num)
        
        # Calculate scaling factor to reach target width
        rect = page.rect
        scale = target_width / rect.width
        matrix = fitz.Matrix(scale, scale)
        
        pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB)
        
        # Convert to PIL Image for WebP saving
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        output_filename = f"{page_num + 1:04d}.webp"
        output_path = os.path.join(pages_dir, output_filename)
        
        img.save(output_path, "WEBP", quality=quality, lossless=False)

    print(f"\nSuccessfully converted {page_count} pages to WebP.")

    # Generate Manifest
    manifest = {
        "id": "quran.mushaf.image.v1",
        "pageCount": page_count,
        "format": "webp",
        "widthPx": target_width,
        "heightPx": "variable",
        "filePattern": "pages/{page}.webp",
        "pagePad": 4,
        "quality": quality,
        "version": 1
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"Generated manifest.json at {manifest_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert Quran PDF to optimized WebP pages.")
    parser.add_argument("--input", default="kuran_v2_lite.pdf", help="Path to input PDF")
    parser.add_argument("--output", default="./assets/quran_pages/v1", help="Output directory")
    parser.add_argument("--width", type=int, default=2200, help="Target page width")
    parser.add_argument("--quality", type=int, default=82, help="WebP quality (0-100)")

    args = parser.parse_args()
    convert_pdf_to_webp(args.input, args.output, args.width, args.quality)
