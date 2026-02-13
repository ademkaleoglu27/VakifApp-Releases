#!/usr/bin/env node
/**
 * Content Pack Builder
 * 
 * Generates content pack ZIPs for downloadable books.
 * Each pack includes manifest.json, checksums.sha256, and content files.
 * 
 * Library Contract v1.1 Compliant
 * 
 * Usage:
 *   npm run packs:build
 *   node scripts/build_content_packs.js
 * 
 * Output:
 *   dist/packs/contentpack-<packId>-v<version>.zip
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const VERSION = '1.0.0';
const MIN_APP_VERSION = '1.0.0';
const DIST_DIR = path.join(__dirname, '..', 'dist', 'packs');

// Book packs to generate (matches CONTENT_PACK_CONFIG downloadable entries)
const PACKS = [
    { bookId: 'mektubat', packId: 'risale.mektubat.v2', sourceDir: '02_mektubat', title: 'Mektubat' },
    { bookId: 'lemalar', packId: 'risale.lemalar.v2', sourceDir: '03_lemalar', title: 'Lem\'alar' },
    { bookId: 'sualar', packId: 'risale.sualar.v2', sourceDir: '04_sualar', title: 'Şualar' },
    { bookId: 'tarihce', packId: 'risale.tarihce.v2', sourceDir: '05_tarihce', title: 'Tarihçe-i Hayat' },
    { bookId: 'mesnevi', packId: 'risale.mesnevi.v2', sourceDir: '06_mesnevi', title: 'Mesnevî-i Nuriye' },
    { bookId: 'isarat', packId: 'risale.isarat.v2', sourceDir: '07_isarat', title: 'İşaratü\'l-i\'caz' },
    { bookId: 'sikke', packId: 'risale.sikke.v2', sourceDir: '08_sikke', title: 'Sikke-i Tasdik-i Gaybî' },
    { bookId: 'barla', packId: 'risale.barla.v2', sourceDir: '09_barla', title: 'Barla Lahikası' },
    { bookId: 'kastamonu', packId: 'risale.kastamonu.v2', sourceDir: '10_kastamonu', title: 'Kastamonu Lahikası' },
    { bookId: 'emirdag1', packId: 'risale.emirdag1.v2', sourceDir: '11_emirdag1', title: 'Emirdağ Lahikası I' },
    { bookId: 'emirdag2', packId: 'risale.emirdag2.v2', sourceDir: '12_emirdag2', title: 'Emirdağ Lahikası II' },
    { bookId: 'asayi', packId: 'risale.asayi.v2', sourceDir: '13_asayi', title: 'Âsâ-yı Mûsâ' },
    { bookId: 'muhakemat', packId: 'risale.muhakemat.v2', sourceDir: '14_muhakemat', title: 'Muhakemat' },
    // Küçük Kitaplar
    { bookId: 'sunuhat', packId: 'risale.sunuhat.v2', sourceDir: '15_sunuhat', title: 'Sünuhat' },
    { bookId: 'isarat_k', packId: 'risale.isarat_k.v2', sourceDir: '16_isarat_k', title: 'İşarat' },
    { bookId: 'tuluat', packId: 'risale.tuluat.v2', sourceDir: '17_tuluat', title: 'Tulûat' },
    { bookId: 'nurcesmesi', packId: 'risale.nurcesmesi.v2', sourceDir: '19_nurcesmesi', title: 'Nur\'un İlk Kapısı' },
    { bookId: 'divaniharbi', packId: 'risale.divaniharbi.v2', sourceDir: '20_divaniharbi', title: 'Divan-ı Harb-i Örfî' },
    { bookId: 'hutbe', packId: 'risale.hutbe.v2', sourceDir: '21_hutbe', title: 'Hutbe-i Şamiye' },
    { bookId: 'munazarat', packId: 'risale.munazarat.v2', sourceDir: '22_munazarat', title: 'Münazarat' },
    { bookId: 'genclik', packId: 'risale.genclik.v2', sourceDir: '23_genclik', title: 'Gençlik Rehberi' },
    { bookId: 'hanimlar', packId: 'risale.hanimlar.v2', sourceDir: '24_hanimlar', title: 'Hanımlar Rehberi' },
    { bookId: 'konferans', packId: 'risale.konferans.v2', sourceDir: '25_konferans', title: 'Konferans' },
];

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate SHA256 hash of a file
 */
function sha256File(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate SHA256 hash of content string
 */
function sha256String(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Get all files in a directory recursively
 */
function getFilesRecursively(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    let files = [];

    for (const item of items) {
        const itemPath = path.join(dir, item.name);
        const relativePath = path.join(basePath, item.name).replace(/\\/g, '/');

        if (item.isDirectory()) {
            files = files.concat(getFilesRecursively(itemPath, relativePath));
        } else {
            const stats = fs.statSync(itemPath);
            files.push({
                path: relativePath,
                absolutePath: itemPath,
                bytes: stats.size
            });
        }
    }

    return files;
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function buildPack(pack, sourceBaseDir) {
    const { bookId, packId, sourceDir, title } = pack;

    const sourceContentDir = path.join(sourceBaseDir, sourceDir);

    // Check if source exists
    if (!fs.existsSync(sourceContentDir)) {
        console.log(`  ⚠️  SKIPPED: ${bookId} (source not found: ${sourceDir})`);
        return null;
    }

    // Get all content files
    const files = getFilesRecursively(sourceContentDir);

    if (files.length === 0) {
        console.log(`  ⚠️  SKIPPED: ${bookId} (no content files)`);
        return null;
    }

    // Build file manifest with sha256
    const manifestFiles = files.map(f => ({
        path: `content/${f.path}`,
        bytes: f.bytes,
        sha256: sha256File(f.absolutePath)
    }));

    // Calculate total size
    const totalBytes = manifestFiles.reduce((sum, f) => sum + f.bytes, 0);

    // Create manifest
    const manifest = {
        bookId,
        packId,
        version: VERSION,
        createdAt: new Date().toISOString(),
        minAppVersion: MIN_APP_VERSION,
        title,
        files: manifestFiles,
        totalBytes
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    const manifestSha256 = sha256String(manifestJson);

    // Create checksums file
    const checksums = [
        `${manifestSha256}  manifest.json`,
        ...manifestFiles.map(f => `${f.sha256}  ${f.path}`)
    ].join('\n');

    // Create ZIP
    const zipFileName = `contentpack-${packId}-v${VERSION}.zip`;
    const zipPath = path.join(DIST_DIR, zipFileName);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            const zipSize = archive.pointer();
            resolve({
                bookId,
                packId,
                zipPath,
                zipFileName,
                contentBytes: totalBytes,
                zipBytes: zipSize,
                fileCount: files.length
            });
        });

        archive.on('error', reject);
        archive.pipe(output);

        // Add manifest.json
        archive.append(manifestJson, { name: 'manifest.json' });

        // Add checksums.sha256
        archive.append(checksums, { name: 'checksums.sha256' });

        // Add content files
        for (const file of files) {
            archive.file(file.absolutePath, { name: `content/${file.path}` });
        }

        archive.finalize();
    });
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════════════');
    console.log('║  📦 Content Pack Builder - Library Contract v1.1  ');
    console.log('╚═══════════════════════════════════════════════════\n');

    // Determine source directory
    // Try multiple possible locations
    const possibleSourceDirs = [
        path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'risale_html_pilot'),
        path.join(__dirname, '..', 'assets', 'risale_html_pilot'),
        path.join(__dirname, '..', 'generated', 'risale_html_pilot'),
        path.join(__dirname, '..', 'meta', 'books'),
    ];

    let sourceBaseDir = null;
    for (const dir of possibleSourceDirs) {
        if (fs.existsSync(dir)) {
            sourceBaseDir = dir;
            break;
        }
    }

    if (!sourceBaseDir) {
        console.log('❌ ERROR: No source content directory found.');
        console.log('   Expected one of:');
        possibleSourceDirs.forEach(d => console.log(`     - ${d}`));
        console.log('\n   Run content generation first or check paths.');
        process.exit(1);
    }

    console.log(`📂 Source: ${sourceBaseDir}\n`);

    // Ensure output directory exists
    fs.mkdirSync(DIST_DIR, { recursive: true });

    console.log('Building packs...\n');

    const results = [];
    for (const pack of PACKS) {
        try {
            console.log(`  Processing ${pack.bookId}...`);
            const result = await buildPack(pack, sourceBaseDir);
            if (result) {
                results.push(result);
                console.log(`  ✅ ${result.bookId}: ${formatBytes(result.zipBytes)} (${result.fileCount} files)`);
            } else {
                const debugPath = path.join(sourceBaseDir, pack.sourceDir);
                console.log(`     SKIPPED ${pack.bookId}`);
                console.log(`     Checked: ${debugPath}`);
                console.log(`     Exists: ${fs.existsSync(debugPath)}`);
            }
        } catch (error) {
            console.error(`  ❌ ${pack.bookId}: ${error.message}`);
        }
    }

    console.log('\n───────────────────────────────────────────────────');
    console.log(`📊 Summary: ${results.length} packs generated`);

    if (results.length > 0) {
        const totalZipBytes = results.reduce((sum, r) => sum + r.zipBytes, 0);
        console.log(`   Total size: ${formatBytes(totalZipBytes)}`);
        console.log(`   Output: ${DIST_DIR}/\n`);

        console.log('📋 Generated files:');
        results.forEach(r => {
            console.log(`   - ${r.zipFileName}`);
        });
    }

    console.log('\n📤 Upload to GitHub Releases:');
    console.log('   gh release create content-packs-v1 dist/packs/*.zip --title "Content Packs v1"');
    console.log('');
}

main().catch(console.error);
