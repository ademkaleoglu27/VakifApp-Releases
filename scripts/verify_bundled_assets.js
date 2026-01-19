#!/usr/bin/env node
/**
 * Verify Bundled Assets Script
 * 
 * Pre-build verification to ensure Sözler content is included in APK.
 * Run before build to catch missing assets early.
 * 
 * Usage:
 *   node scripts/verify_bundled_assets.js
 * 
 * Exit codes:
 *   0 - All bundled assets verified
 *   1 - Missing bundled assets (build should fail)
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const ROOT_DIR = path.join(__dirname, '..');

// Source of Truth for Bundled Assets
// Note: In this project, the bundled assets are committed directly to 
// android/app/src/main/assets. This is the source directory, not a build artifact.
const SOURCE_ASSET_ROOT = path.join(ROOT_DIR, 'android/app/src/main/assets');

const BUNDLED_ASSETS = [
    {
        bookId: 'sozler',
        // Relative to SOURCE_ASSET_ROOT
        assetPath: 'risale_html_pilot/01_sozler',
        requiredFiles: ['manifest.json']
    }
];

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           BUNDLED ASSET VERIFICATION                          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📂 Source Root: ${SOURCE_ASSET_ROOT}`);

let hasErrors = false;

for (const asset of BUNDLED_ASSETS) {
    const fullPath = path.join(SOURCE_ASSET_ROOT, asset.assetPath);

    console.log(`📦 Checking ${asset.bookId}...`);
    console.log(`   Path: ${asset.assetPath}`);

    // Check directory exists
    if (!fs.existsSync(fullPath)) {
        console.log(`   ❌ BUNDLED_ASSET_GUARD_FAIL: Directory not found`);
        console.log(`      Expected: ${fullPath}`);
        hasErrors = true;
        continue;
    }

    // Check required files
    let filesMissing = false;
    for (const reqFile of asset.requiredFiles) {
        const filePath = path.join(fullPath, reqFile);
        if (!fs.existsSync(filePath)) {
            console.log(`   ❌ BUNDLED_ASSET_GUARD_FAIL: Missing ${reqFile}`);
            filesMissing = true;
            hasErrors = true;
        }
    }

    if (!filesMissing) {
        // Count content files
        const files = fs.readdirSync(fullPath);
        const htmlFiles = files.filter(f => f.endsWith('.html'));
        console.log(`   ✅ Verified (${htmlFiles.length} HTML files, ${files.length} total)`);
    }
}

console.log('');

if (hasErrors) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('❌ BUNDLED ASSET VERIFICATION FAILED');
    console.log('');
    console.log('   Sözler içeriği APK\'ya dahil edilmemiş olabilir.');
    console.log('   Lütfen şunları kontrol edin:');
    console.log('   1. android/app/src/main/assets/risale_html_pilot/01_sozler/ mevcut mu?');
    console.log('   2. .easignore veya build config bu klasörü hariç tutmuyor mu?');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(1);
} else {
    console.log('✅ All bundled assets verified successfully');
    console.log('');
    process.exit(0);
}
