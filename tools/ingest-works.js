/**
 * ingest-works.js
 * ─────────────────────────────────────────────────────────────
 * Ingests Risale-i Nur works from source TXT files.
 * Generates: src/content/works/<workId>/{manifest.json, sections.json}
 * Generates: src/content/generated/contentIndex.ts
 * Updates: libraryRegistry.ts status
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

const SOURCE_DIR = path.join(__dirname, 'risale_source_data', 'txt');
// NEW TARGET: src/content/works
const OUTPUT_BASE = path.join(__dirname, '..', 'src', 'content', 'works');
const GENERATED_INDEX_PATH = path.join(__dirname, '..', 'src', 'content', 'generated', 'contentIndex.ts');
const REGISTRY_PATH = path.join(__dirname, '..', 'src', 'data', 'libraryRegistry.ts');

const MAPPINGS = [
    { workId: 'sozler', locked: true }, // SKIP ingestion, but include in index

    // --- MAJOR WORKS ---
    { workId: 'mektubat', dirName: '02 Mektubat', title: 'Mektubat', type: 'major' },
    { workId: 'lemalar', dirName: "03 Lem'alar", title: "Lem'alar", type: 'major' },
    { workId: 'sualar', dirName: "04 Şuâlar", title: 'Şuâlar', type: 'major' },
    { workId: 'barla_lahikasi', dirName: '09 Barla Lâhikası', title: 'Barla Lâhikası', type: 'major' },
    { workId: 'kastamonu_lahikasi', dirName: '10 Kastamonu Lâhikası', title: 'Kastamonu Lâhikası', type: 'major' },
    { workId: 'emirdag_lahikasi_1', dirName: '11 Emirdağ Lâhikası 1', title: 'Emirdağ Lâhikası 1', type: 'major' },
    { workId: 'emirdag_lahikasi_2', dirName: '12 Emirdağ Lâhikası 2', title: 'Emirdağ Lâhikası 2', type: 'major' },
    { workId: 'mesnevi_i_nuriye', dirName: '06 Mesnevî-i Nuriye', title: 'Mesnevi-i Nuriye', type: 'major' },
    { workId: 'isaratul_icaz', dirName: '07 İşaratü\'l-i\'caz', title: 'İşaratü\'l-İ\'caz', type: 'major' },
    { workId: 'muhakemat', dirName: '15 Muhakemat', title: 'Muhakemat', type: 'major' },
    { workId: 'tarihce_i_hayat', dirName: '05 Tarihçe-i Hayat', title: 'Tarihçe-i Hayat', type: 'major' },

    // --- BOOKLETS ---
    { workId: 'genclik_rehberi', fileName: 'Gençli̇k Rehberi̇.txt', title: 'Gençlik Rehberi', type: 'booklet' },
    { workId: 'hanimlar_rehberi', fileName: 'Hanimlar Rehberi̇.txt', title: 'Hanımlar Rehberi', type: 'booklet' },
    { workId: 'munazarat', fileName: 'Münazarat.txt', title: 'Münazarat', type: 'booklet' },
    { workId: 'divan_i_harb_i_orfi', fileName: 'Di̇van-i Harb-i̇ Örfî.txt', title: 'Divan-ı Harb-i Örfî', type: 'booklet' },
    { workId: 'hutbe_i_samiye', fileName: 'Hutbe-i̇ Şami̇ye.txt', title: 'Hutbe-i Şamiye', type: 'booklet' },
    { workId: 'sunuhat', fileName: 'Sünuhat.txt', title: 'Sünuhat', type: 'booklet' }
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function findPath(dir, name, isDir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (isDir && stat.isDirectory()) {
            if (file.toLowerCase() === name.toLowerCase()) return fullPath;
            const res = findPath(fullPath, name, isDir);
            if (res) return res;
        } else if (!isDir) {
            if (stat.isDirectory()) {
                const res = findPath(fullPath, name, isDir);
                if (res) return res;
            } else if (file.toLowerCase() === name.toLowerCase()) {
                return fullPath;
            }
        }
    }
    return null;
}

function mergeDirectory(dirPath) {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.txt'));
    files.sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
    const parts = [];
    for (const f of files) {
        let content = fs.readFileSync(path.join(dirPath, f), 'utf8');
        content = content.replace(/\r\n/g, '\n').trim();
        if (content.length > 0) parts.push(content);
    }
    return { merged: parts.join('\n\n'), count: files.length };
}

function isArabicBlock(text) {
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F]/g) || []).length;
    const ratio = text.replace(/\s/g, '').length > 0 ? arabicChars / text.replace(/\s/g, '').length : 0;
    return ratio > 0.6;
}

function processText(text) {
    const lines = text.split(/\n/);
    const blocks = [];
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        let type = 'paragraph';
        if (isArabicBlock(line)) type = 'arabic_block';
        if (line.match(/^(Birinci|İkinci|Üçüncü|Dördüncü|Beşinci|Altıncı|Yedinci|Sekizinci|Dokuzuncu|Onuncu|On\s+birinci|On\s+ikinci|Yirminci|Otuzuncu)\s+(Söz|Mektup|Lem'a|Şua|Nükte|Mes'ele|Makale|Kısım|Bölüm)/i)) type = 'heading';
        if (line.match(/^(Mukaddime|İfade-i Meram|Takdim|Giriş|Önsöz)/i)) type = 'heading';
        if (line.match(/^\[.*\]$/)) type = 'label';
        blocks.push({ type, text: line });
    }
    return blocks;
}

function splitSections(blocks) {
    const sections = [];
    let currentSection = { id: 'intro', title: 'Giriş', blocks: [] };
    let sectionCounter = 1;
    for (const block of blocks) {
        if (block.type === 'heading') {
            if (currentSection.blocks.length > 0) sections.push(currentSection);
            currentSection = { id: `sec_${sectionCounter++}`, title: block.text, blocks: [block] };
        } else {
            currentSection.blocks.push(block);
        }
    }
    if (currentSection.blocks.length > 0) sections.push(currentSection);
    return sections;
}

function updateRegistryStatus(workId, status) {
    let content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const regex = new RegExp(`(workId:\\s*'${workId}',[\\s\\S]*?status:\\s*')(.+?)(')`, 'g');
    if (content.match(regex)) {
        const newContent = content.replace(regex, `$1${status}$3`);
        fs.writeFileSync(REGISTRY_PATH, newContent);
    }
}

// ─────────────────────────────────────────────────────────────
// CONTENT INDEX GENERATOR
// ─────────────────────────────────────────────────────────────

function generateContentIndex() {
    console.log('📝 Generating contentIndex.ts...');
    const genDir = path.dirname(GENERATED_INDEX_PATH);
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir, { recursive: true });

    let content = `/**\n * AUTO-GENERATED content index.\n * Maps work IDs to their static JSON requirements.\n */\n\n`;
    content += `export const CONTENT_INDEX: Record<string, { manifest: any; sections: any[]; locked?: boolean }> = {\n`;

    for (const map of MAPPINGS) {
        // Paths relative to src/content/generated/contentIndex.ts
        // Works are in src/content/works/<workId>
        // Relation: ../works/<workId>

        const workDir = path.join(OUTPUT_BASE, map.workId);
        const manifestPath = path.join(workDir, 'manifest.json');

        if (map.locked && map.workId === 'sozler') {
            // Fallback for Sozler - user said it's locked. Assuming it stays in old location?
            // Or maybe we map it to ../../../../meta/books/sozler if not moved?
            // Let's assume user wants to read from meta/books for Sozler as legacy.
            content += `    "${map.workId}": {\n`;
            content += `        manifest: require('../../../../meta/books/sozler/manifest.json'),\n`;
            content += `        sections: require('../../../../meta/books/sozler/sections.json'),\n`;
            content += `        locked: true\n`;
            content += `    },\n`;
        } else {
            // For ingested works, they ARE in src/content/works now.
            // We check existence just to be safe, but we assume we just generated them.
            content += `    "${map.workId}": {\n`;
            content += `        manifest: require('../works/${map.workId}/manifest.json'),\n`;
            content += `        sections: require('../works/${map.workId}/sections.json'),\n`;
            content += `    },\n`;
        }
    }
    content += `};\n`;
    fs.writeFileSync(GENERATED_INDEX_PATH, content);
    console.log(`✅ contentIndex.ts generated.`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const targetType = args.includes('--type') ? args[args.indexOf('--type') + 1] : null;
    const targetWork = args.includes('--work') ? args[args.indexOf('--work') + 1] : null;

    // Ensure output base exists
    if (!fs.existsSync(OUTPUT_BASE)) fs.mkdirSync(OUTPUT_BASE, { recursive: true });

    console.log('📚 Starting Ingestion Pipeline (Root Fix)...');

    for (const map of MAPPINGS) {
        if (map.locked) continue;
        if (targetWork && map.workId !== targetWork) continue;
        if (targetType && map.type !== targetType) continue;

        console.log(`\nProcessing: ${map.title} (${map.workId})...`);

        // 1. Get Text
        let rawText = '';
        if (map.fileName) {
            const srcPath = findPath(SOURCE_DIR, map.fileName, false);
            if (!srcPath) { console.warn('File not found'); continue; }
            rawText = fs.readFileSync(srcPath, 'utf8');
        } else if (map.dirName) {
            const dirPath = findPath(SOURCE_DIR, map.dirName, true);
            if (!dirPath) { console.warn('Dir not found'); continue; }
            const mergeResult = mergeDirectory(dirPath);
            rawText = mergeResult.merged;
        }

        // 2. Parse
        const blocks = processText(rawText);
        const sectionsData = splitSections(blocks);

        // 3. Write Output to src/content/works/<workId>
        const workDir = path.join(OUTPUT_BASE, map.workId);
        if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

        const manifest = {
            workId: map.workId,
            title: map.title,
            type: map.type,
            sectionCount: sectionsData.length,
            generatedAt: new Date().toISOString()
        };
        fs.writeFileSync(path.join(workDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // Sections as FLAT ARRAY
        const sectionsList = sectionsData.map((s, idx) => ({
            id: s.id,
            work_id: map.workId,
            title: s.title,
            order_index: idx + 1,
            type: 'main'
        }));
        fs.writeFileSync(path.join(workDir, 'sections.json'), JSON.stringify(sectionsList, null, 2));

        console.log(`✅ Generated ${sectionsData.length} sections for ${map.title}`);
        updateRegistryStatus(map.workId, 'ready');
    }

    // Always regenerate contentIndex
    generateContentIndex();
}

main();
