import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { SCHEMA_SQL } from '../src/services/risale/schema';

// Configuration
const REPO_URL = 'https://github.com/alitekdemir/Risale-i-Nur-Diyanet.git';
const ASSETS_DIR = path.join(__dirname, '../assets/content');
const DB_PATH = path.join(ASSETS_DIR, 'risale.db');
const TEMP_DIR = path.join(__dirname, '../temp_risale_source');

// ===== METADATA PATTERNS =====
const METADATA_PATTERNS = [
    /^aliases\s*:/i,
    /^tags\s*:/i,
    /^keywords\s*:/i,
    /^source\s*name\s*:/i,
    /^source\s*url\s*:/i,
    /^source\s*:/i,
    /^year\s*:/i,
    /^publish(_date)?\s*:/i,
    /^language\s*:/i,
    /^category\s*:/i,
    /^slug\s*:/i,
    /^date\s*:/i,
    /^author\s*:/i,
    /^url\s*:/i,
];

// ===== CONTENT NORMALIZATION FUNCTIONS =====

/**
 * Remove UTF-8 BOM if present.
 */
function removeBOM(content: string): string {
    if (content.charCodeAt(0) === 0xFEFF) {
        return content.slice(1);
    }
    return content;
}

/**
 * Strip YAML front-matter from content using robust regex.
 * Handles BOM, leading whitespace, and various line ending styles.
 */
function stripFrontMatter(content: string): { cleanContent: string; meta: Record<string, string> } {
    const meta: Record<string, string> = {};

    // Remove BOM first
    let cleaned = removeBOM(content);

    // Normalize line endings to \n
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Trim leading whitespace for detection only
    const trimmedStart = cleaned.trimStart();

    // Check if starts with YAML delimiter
    if (!trimmedStart.startsWith('---')) {
        return { cleanContent: cleaned, meta };
    }

    // Use regex to match entire YAML block
    // Match: --- at start of line, content, --- at start of line
    const yamlRegex = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n/;
    const match = trimmedStart.match(yamlRegex);

    if (!match) {
        // Fallback: Try simpler detection
        const lines = trimmedStart.split('\n');
        if (lines[0].trim() === '---') {
            let endIndex = -1;
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    endIndex = i;
                    break;
                }
            }
            if (endIndex > 0) {
                // Parse meta from lines 1 to endIndex-1
                for (let i = 1; i < endIndex; i++) {
                    const line = lines[i];
                    const colonIdx = line.indexOf(':');
                    if (colonIdx > 0) {
                        const key = line.substring(0, colonIdx).trim().toLowerCase();
                        let value = line.substring(colonIdx + 1).trim();
                        // Clean quotes and brackets
                        value = value.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
                        if (key && value) {
                            meta[key] = value;
                        }
                    }
                }
                // Return content after the closing ---
                const afterYaml = lines.slice(endIndex + 1).join('\n').trim();
                return { cleanContent: afterYaml, meta };
            }
        }
        return { cleanContent: cleaned, meta };
    }

    // Parse key: value pairs from captured block
    const fmBlock = match[1];
    const fmLines = fmBlock.split('\n');
    for (const line of fmLines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim().toLowerCase();
            let value = line.substring(colonIdx + 1).trim();
            value = value.replace(/^["'\[\]]+|["'\[\]]+$/g, '');
            if (key && value) {
                meta[key] = value;
            }
        }
    }

    // Return content after YAML block
    const afterYaml = trimmedStart.substring(match[0].length).trim();
    return { cleanContent: afterYaml, meta };
}

/**
 * Strip inline metadata header lines that appear at start of content.
 * Stops when hitting a markdown heading or real paragraph text.
 */
function stripInlineMetadataHeaderLines(content: string): string {
    const lines = content.split('\n');
    let startIndex = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines at start
        if (line === '') {
            startIndex = i + 1;
            continue;
        }

        // Stop at markdown headings
        if (line.startsWith('#')) {
            break;
        }

        // Check if line matches metadata patterns
        let isMetadata = false;
        for (const pattern of METADATA_PATTERNS) {
            if (pattern.test(line)) {
                isMetadata = true;
                startIndex = i + 1;
                break;
            }
        }

        if (!isMetadata) {
            // If line is short and looks like leftover metadata remnant, skip it
            if (line.length <= 20 && /^[a-zA-Z_]+:/.test(line)) {
                startIndex = i + 1;
                continue;
            }
            // Otherwise, this is real content - stop here
            break;
        }
    }

    return lines.slice(startIndex).join('\n').trim();
}

/**
 * Normalize HTML content to plain text with strict cleaning.
 */
function normalizeHtml(text: string): string {
    let result = text;

    // Remove HTML comments
    result = result.replace(/<!--[\s\S]*?-->/g, '');

    // Remove script blocks
    result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove style blocks
    result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Replace <br> variants with newlines
    result = result.replace(/<br\s*\/?>/gi, '\n');

    // Remove all remaining HTML tags
    result = result.replace(/<[^>]+>/g, '');

    // Decode common HTML entities
    result = result
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&apos;/gi, "'")
        .replace(/&mdash;/gi, '—')
        .replace(/&ndash;/gi, '–')
        .replace(/&laquo;/gi, '«')
        .replace(/&raquo;/gi, '»')
        .replace(/&#\d+;/g, ''); // Remove any remaining numeric entities

    // Normalize whitespace while preserving paragraph breaks
    result = result
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trimEnd())
        .join('\n');

    // Collapse 3+ newlines to 2 newlines
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
}

/**
 * Detect if a paragraph is primarily Arabic based on Unicode range.
 */
function isArabicText(text: string): boolean {
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && arabicChars / totalChars > 0.5;
}

/**
 * Check if a paragraph is a metadata remnant that should be skipped.
 */
function isMetadataRemnant(text: string): boolean {
    const trimmed = text.trim();

    // Skip very short paragraphs
    if (trimmed.length <= 2) return true;

    // Skip if matches metadata pattern
    for (const pattern of METADATA_PATTERNS) {
        if (pattern.test(trimmed)) return true;
    }

    // Skip array-like metadata remnants: [tag1, tag2]
    if (/^\[.*\]$/.test(trimmed) && trimmed.length < 100) return true;

    return false;
}

/**
 * Check if content is "dirty" - contains HTML tags or metadata patterns.
 */
function isDirtyContent(text: string): { dirty: boolean; reason: string } {
    // Check for HTML tags
    if (/<[^>]+>/.test(text)) {
        return { dirty: true, reason: 'Contains HTML tags' };
    }

    // Check if entire paragraph is a metadata line
    const firstLine = text.split('\n')[0].trim();
    for (const pattern of METADATA_PATTERNS) {
        if (pattern.test(firstLine) && text.split('\n').length === 1) {
            return { dirty: true, reason: `Metadata pattern: ${firstLine.substring(0, 30)}` };
        }
    }

    return { dirty: false, reason: '' };
}

/**
 * Full content cleaning pipeline.
 */
function cleanContent(rawContent: string): { text: string; meta: Record<string, string> } {
    // Step 1: Remove BOM
    let content = removeBOM(rawContent);

    // Step 2: Normalize line endings
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Step 3: Strip YAML front-matter
    const { cleanContent: afterYaml, meta } = stripFrontMatter(content);

    // Step 4: Strip inline metadata header lines
    const afterMetaStrip = stripInlineMetadataHeaderLines(afterYaml);

    // Step 5: Normalize HTML
    const text = normalizeHtml(afterMetaStrip);

    return { text, meta };
}

/**
 * Parse title from content (first # heading).
 * Returns null if no valid heading found.
 */
function parseTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    if (!match) return null;

    const title = match[1].trim();

    // Ensure title is not a metadata-like token
    for (const pattern of METADATA_PATTERNS) {
        if (pattern.test(title)) return null;
    }

    return title;
}

async function main() {
    console.log('🚀 Starting Risale-i Nur Content Pack Build (V3 - Hardened)...');

    // 1. Ensure directories exist
    if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }

    // 2. Clone or Update Source
    if (fs.existsSync(TEMP_DIR)) {
        console.log('Checking for updates in source...');
        try {
            execSync('git pull', { cwd: TEMP_DIR, stdio: 'inherit' });
        } catch (e) {
            console.warn('Git pull failed, continuing with existing content.');
        }
    } else {
        console.log('Cloning source repository...');
        try {
            execSync(`git clone ${REPO_URL} ${TEMP_DIR}`, { stdio: 'inherit' });
        } catch (e) {
            console.error('Failed to clone repository.');
            createDummyContent(TEMP_DIR);
        }
    }

    // 3. Init Database
    console.log(`Creating database at ${DB_PATH}...`);
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
    }
    const db = new Database(DB_PATH);
    db.exec(SCHEMA_SQL);

    // Track dirty content for verification
    const dirtyParagraphs: { sectionId: string; paragraphId: string; preview: string; reason: string }[] = [];

    // 4. Parse and Insert Content
    const insertWork = db.prepare('INSERT INTO works (id, title, order_index) VALUES (?, ?, ?)');
    const insertSection = db.prepare('INSERT INTO sections (id, work_id, title, order_index, type) VALUES (?, ?, ?, ?, ?)');
    const insertParagraph = db.prepare('INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic) VALUES (?, ?, ?, ?, ?)');

    const processContent = db.transaction(() => {
        const works = [
            { id: 'sozler', title: 'Sözler', folder: '01 Sözler' },
            { id: 'mektubat', title: 'Mektubat', folder: '02 Mektubat' },
            { id: 'lemalar', title: 'Lemalar', folder: "03 Lem'alar" },
            { id: 'sualar', title: 'Şualar', folder: '04 Şuâlar' },
            { id: 'tarihce', title: 'Tarihçe-i Hayat', folder: '05 Tarihçe-i Hayat' },
            { id: 'mesnevi', title: 'Mesnevî-i Nuriye', folder: '06 Mesnevî-i Nuriye' },
            { id: 'isarat', title: 'İşaratü\'l-i\'caz', folder: "07 İşaratü'l-i'caz" },
            { id: 'barla', title: 'Barla Lâhikası', folder: '09 Barla Lâhikası' },
            { id: 'kastamonu', title: 'Kastamonu Lâhikası', folder: '10 Kastamonu Lâhikası' },
            { id: 'emirdag1', title: 'Emirdağ Lâhikası 1', folder: '11 Emirdağ Lâhikası 1' },
            { id: 'emirdag2', title: 'Emirdağ Lâhikası 2', folder: '12 Emirdağ Lâhikası 2' },
            { id: 'asayimusa', title: 'Asâ-yı Musa', folder: '13 Asâ-yı Musa' },
        ];

        let workOrder = 1;
        for (const work of works) {
            console.log(`Processing ${work.title}...`);
            insertWork.run(work.id, work.title, workOrder++);

            const workPath = path.join(TEMP_DIR, 'obsidian-markdown', work.folder);
            if (!fs.existsSync(workPath)) {
                console.warn(`  ⚠️ Folder not found for ${work.title}, skipping.`);
                continue;
            }

            const files = fs.readdirSync(workPath).filter(f => f.endsWith('.md') || f.endsWith('.txt')).sort();

            let sectionOrder = 1;
            for (const file of files) {
                const filePath = path.join(workPath, file);
                const rawContent = fs.readFileSync(filePath, 'utf-8');

                // ===== APPLY STRICT CONTENT NORMALIZATION =====
                const { text: cleanedContent, meta } = cleanContent(rawContent);

                // Parse title
                const title = parseTitle(cleanedContent) || file.replace(path.extname(file), '').replace(/^\d+[-_\s]*/, '');
                const sectionId = `${work.id}-${sectionOrder}`;

                insertSection.run(sectionId, work.id, title, sectionOrder++, 'chapter');

                // Split by double newlines for paragraphs
                const paragraphs = cleanedContent.split(/\n\s*\n/);
                let pOrder = 1;

                for (const p of paragraphs) {
                    const cleanText = p.trim();

                    // Skip empty, short, or metadata remnant paragraphs
                    if (cleanText.length === 0) continue;
                    if (isMetadataRemnant(cleanText)) continue;

                    // Verify content is clean
                    const { dirty, reason } = isDirtyContent(cleanText);
                    if (dirty) {
                        dirtyParagraphs.push({
                            sectionId,
                            paragraphId: `${sectionId}-${pOrder}`,
                            preview: cleanText.substring(0, 80),
                            reason
                        });
                    }

                    const isArabic = isArabicText(cleanText) ? 1 : 0;
                    insertParagraph.run(`${sectionId}-${pOrder}`, sectionId, cleanText, pOrder++, isArabic);
                }
            }
        }

        // Insert Metadata
        const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('contentVersion', '3.0.0');
        insertMeta.run('builtAt', new Date().toISOString());
        insertMeta.run('normalized', 'strict');
    });

    processContent();

    // ===== VERIFICATION: Fail if dirty content detected =====
    if (dirtyParagraphs.length > 0) {
        console.error('\n❌ BUILD FAILED: Dirty content detected!\n');
        for (const dp of dirtyParagraphs.slice(0, 20)) {
            console.error(`  [${dp.sectionId}] ${dp.paragraphId}: ${dp.reason}`);
            console.error(`    Preview: "${dp.preview}..."`);
        }
        if (dirtyParagraphs.length > 20) {
            console.error(`  ... and ${dirtyParagraphs.length - 20} more.`);
        }
        db.close();
        throw new Error(`Build failed: ${dirtyParagraphs.length} dirty paragraphs found.`);
    }

    console.log('✅ Content Pack Build Complete (V3 - Hardened & Verified)!');
    db.close();
}

function createDummyContent(dir: string) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    ['sozler', 'mektubat'].forEach(w => {
        const wDir = path.join(dir, w);
        if (!fs.existsSync(wDir)) fs.mkdirSync(wDir);

        for (let i = 1; i <= 3; i++) {
            const subTitle = w === 'sozler' ? `Soz ${i}` : `Mektup ${i}`;
            const text = `# ${subTitle}\n\nThis is paragraph 1 of ${subTitle}.\n\nThis is paragraph 2 with more content.\n\nParagraph 3.`;
            fs.writeFileSync(path.join(wDir, `0${i}_${subTitle.replace(' ', '_')}.md`), text);
        }
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
