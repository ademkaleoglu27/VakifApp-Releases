# Quran Pages Converter Tools

This directory contains tools to generate WebP assets for the Page-Based Quran Reader from source vector files (AI/PDF).

## Prerequisites

1. **PowerShell** (Pre-installed on Windows).
2. **ImageMagick**: Must be installed and available in your PATH as `magick`.
   - Install via Chocolatey: `choco install imagemagick`
   - Or download from [imagemagick.org](https://imagemagick.org/script/download.php#windows).
   - **Verification**: Run `magick -version` in a new terminal.

## Usage

### 1. Download Source
Get the ZIP file containing 604 Quran pages (AI format) from the source (e.g., `dm.qurancomplex.gov.sa`).
Do NOT extract it manually; the script handles extraction to a temp folder to avoid clutter.

### 2. Run Conversion
Open PowerShell and run the conversion script.

**Arguments:**
- `-ZipPath`: Full path to the downloaded ZIP file.
- `-ProjectRoot`: Path to the root of this app (where `package.json` is).
- `-Density` (Optional): DPI for rasterization (default: 200).
- `-Quality` (Optional): WebP quality 0-100 (default: 85).

**Example:**
```powershell
# Run from repository root
./tools/quran_pages/convert-quran-pages.ps1 `
  -ZipPath "C:\Users\You\Downloads\001-604_Uthmanic_Hafs_AI.zip" `
  -ProjectRoot "C:\VakifApp"
```

### 3. Verify Output
Run the verification script to ensure no pages were missed.

```powershell
./tools/quran_pages/verify-quran-pages.ps1 `
  -ProjectRoot "C:\VakifApp" `
  -OpenSample
```

## Post-Conversion
After generating the assets, you should:
1. Rebuild the Android/iOS app if adding new assets requires it (usually `npx expo run:android` or `npx expo prebuild`).
2. Ensure `src/config/quranPages.ts` is generated and linked (handled in implementation phase).
