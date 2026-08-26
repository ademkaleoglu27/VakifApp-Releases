#!/usr/bin/env node
/**
 * APK Size Report Generator
 * 
 * Generates a comparison report between bundled and downloadable content builds.
 * 
 * Library Contract v1.1 Compliant
 * 
 * Usage:
 *   node scripts/report_apk_size.js
 * 
 * Output:
 *   reports/apk_size_report.md
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const ANDROID_BUILD_DIR = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs');

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Get file size or null if not exists
 */
function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch {
        return null;
    }
}

/**
 * Find APK files in build directory
 */
function findApkFiles() {
    const apkDir = path.join(ANDROID_BUILD_DIR, 'apk');
    const results = {
        debug: null,
        release: null
    };

    try {
        // Debug APK
        const debugPath = path.join(apkDir, 'debug', 'app-debug.apk');
        results.debug = getFileSize(debugPath) ? { path: debugPath, size: getFileSize(debugPath) } : null;

        // Release APK
        const releasePath = path.join(apkDir, 'release', 'app-release.apk');
        results.release = getFileSize(releasePath) ? { path: releasePath, size: getFileSize(releasePath) } : null;
    } catch (e) {
        console.warn('Could not scan APK directory:', e.message);
    }

    return results;
}

/**
 * Calculate dist/packs total size
 */
function getPacksSize() {
    const packsDir = path.join(__dirname, '..', 'dist', 'packs');
    let total = 0;
    let count = 0;

    try {
        const files = fs.readdirSync(packsDir);
        for (const file of files) {
            if (file.endsWith('.zip')) {
                const size = getFileSize(path.join(packsDir, file));
                if (size) {
                    total += size;
                    count++;
                }
            }
        }
    } catch {
        // Packs directory doesn't exist yet
    }

    return { total, count };
}

/**
 * Generate the report
 */
function generateReport() {
    const apks = findApkFiles();
    const packs = getPacksSize();
    const timestamp = new Date().toISOString();

    // For comparison, we estimate bundled APK would be current + packs
    // This is a rough estimate since actual bundled size varies
    const estimatedBundledSizeNote = packs.total > 0
        ? `Approximate bundled APK size would be: ${formatBytes((apks.release?.size || 0) + packs.total)}`
        : 'Content packs not yet generated. Run `npm run packs:build` first.';

    const report = `# APK Size Report

> Generated: ${timestamp}

## Current Build

| Metric | Value |
|--------|-------|
| **Release APK** | ${apks.release ? formatBytes(apks.release.size) : 'Not found'} |
| **Debug APK** | ${apks.debug ? formatBytes(apks.debug.size) : 'Not found'} |

## Content Packs (Downloadable)

| Metric | Value |
|--------|-------|
| **Pack Count** | ${packs.count} packs |
| **Total Pack Size** | ${formatBytes(packs.total)} |

## Size Comparison

| Build Type | Size | Notes |
|------------|------|-------|
| **Build B (Current)** | ${apks.release ? formatBytes(apks.release.size) : 'N/A'} | Sözler only bundled |
| **Build A (Estimated)** | ${estimatedBundledSizeNote} | All content bundled |
| **Difference** | ${packs.total > 0 ? formatBytes(packs.total) : 'Calculate after packs:build'} | Savings from downloadable content |

## Configuration

- **Bundled Content:** Sözler (01_sozler)
- **Downloadable Content:** ${packs.count} books as content packs
- **Library Contract:** v1.1 (FROZEN paths protected)

## Notes

- Sözler remains bundled in APK for offline-first experience
- Other books download on first access
- Content packs hosted on GitHub Releases
- SHA256 integrity verification on download

---

## APK File Locations

\`\`\`
Release: android/app/build/outputs/apk/release/app-release.apk
Debug:   android/app/build/outputs/apk/debug/app-debug.apk
\`\`\`
`;

    // Ensure reports directory exists
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    // Write report
    const reportPath = path.join(REPORTS_DIR, 'apk_size_report.md');
    fs.writeFileSync(reportPath, report, 'utf8');

    console.log('\n╔═══════════════════════════════════════════════════');
    console.log('║  📊 APK Size Report Generated                     ');
    console.log('╚═══════════════════════════════════════════════════\n');

    if (apks.release) {
        console.log(`  📱 Release APK: ${formatBytes(apks.release.size)}`);
    } else {
        console.log('  ⚠️  Release APK not found. Build with: ./gradlew assembleRelease');
    }

    if (packs.count > 0) {
        console.log(`  📦 Content Packs: ${packs.count} packs (${formatBytes(packs.total)})`);
    } else {
        console.log('  ⚠️  No content packs found. Run: npm run packs:build');
    }

    console.log(`\n  📄 Report: ${reportPath}\n`);
}

generateReport();
