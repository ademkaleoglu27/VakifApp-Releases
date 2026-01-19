# Content Pack Release Guide

> Library Contract v1.1 Compliant

## Overview

This guide documents how to build and release content packs for downloadable books.

---

## 1. Build Content Packs

```bash
npm run packs:build
```

**Output:** `dist/packs/contentpack-*.zip`

Each ZIP contains:
- `manifest.json` - Pack metadata and file list
- `checksums.sha256` - SHA256 verification hashes
- `content/` - Book content files

---

## 2. Upload to GitHub Releases

### Using GitHub CLI

```bash
# Create release with all packs
gh release create content-packs-v1 dist/packs/*.zip \
    --title "Content Packs v1" \
    --notes "Initial content packs for Risale-i Nur library"
```

### Using GitHub Web UI

1. Go to repository → Releases → "Create a new release"
2. Tag: `content-packs-v1`
3. Title: "Content Packs v1"
4. Upload all ZIP files from `dist/packs/`
5. Publish release

---

## 3. Download URL Format

After upload, asset URLs will be:

```
https://github.com/<owner>/<repo>/releases/download/<tag>/<filename>
```

Example:
```
https://github.com/ademkaleoglu27/VakifApp-Releases/releases/download/content-packs-v1/contentpack-risale.mektubat.v1-v1.0.0.zip
```

---

## 4. App Configuration

Update `CONTENT_PACK_CONFIG` in `booksRegistry.ts`:

```typescript
'mektubat': {
    contentMode: 'downloadable',
    contentPackId: 'risale.mektubat.v1',
    estimatedSizeMb: 2.8,
    downloadUrl: 'https://github.com/.../contentpack-risale.mektubat.v1-v1.0.0.zip'
}
```

---

## 5. Verify APK Size

```bash
# Build release APK
cd android && ./gradlew assembleRelease && cd ..

# Generate size report
node scripts/report_apk_size.js
```

Report saved to: `reports/apk_size_report.md`

---

## Release Checklist

- [ ] `npm run packs:build` completed
- [ ] All ZIPs in `dist/packs/`
- [ ] `gh release create content-packs-v1 ...` executed
- [ ] Download URLs verified working
- [ ] `CONTENT_PACK_CONFIG` URLs updated
- [ ] Release APK built
- [ ] `reports/apk_size_report.md` generated
