const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '..', 'corpus_input.txt');
const OUTPUT_BASE = path.join(__dirname, '..', 'meta', 'books');
const SOZLER_DIR = path.join(OUTPUT_BASE, 'sozler');
const PAGES_DIR = path.join(SOZLER_DIR, 'pages');

if (!fs.existsSync(SOZLER_DIR)) fs.mkdirSync(SOZLER_DIR, { recursive: true });
if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });

// Pattern detection for section classification
const MAIN_SECTION_PATTERNS = [
    /^Birinci Söz$/i,
    /^İkinci Söz$/i,
    /^Üçüncü Söz$/i,
    /^Dördüncü Söz$/i,
    /^Beşinci Söz$/i,
    /^Altıncı Söz$/i,
    /^Yedinci Söz$/i,
    /^Sekizinci Söz$/i,
    /^Dokuzuncu Söz$/i,
    /^Onuncu Söz$/i,
    /^On Birinci Söz$/i,
    /^On İkinci Söz$/i,
    /^On Üçüncü Söz$/i,
    /^On Dördüncü Söz$/i,
    /^On Beşinci Söz$/i,
    /^On Altıncı Söz$/i,
    /^On Yedinci Söz$/i,
    /^On Sekizinci Söz$/i,
    /^On Dokuzuncu Söz$/i,
    /^Yirminci Söz$/i,
    /^Yirmi Birinci Söz$/i,
    /^Yirmi İkinci Söz$/i,
    /^Yirmi Üçüncü Söz$/i,
    /^Yirmi Dördüncü Söz$/i,
    /^Yirmi Beşinci Söz$/i,
    /^Yirmi Altıncı Söz$/i,
    /^Yirmi Yedinci Söz$/i,
    /^Yirmi Sekizinci Söz$/i,
    /^Yirmi Dokuzuncu Söz$/i,
    /^Otuzuncu Söz$/i,
    /^Otuz Birinci Söz$/i,
    /^Otuz İkinci Söz$/i,
    /^Otuz Üçüncü Söz$/i,
];

const FOOTNOTE_PATTERNS = [
    /^\[\d+\]\s*Hâşiye/i,
    /^Hâşiye:/i,
];

const SUB_SECTION_PATTERNS = [
    /Makam/i,
    /Zeyl/i,
    /Parça/i,
    /Lahika/i,
    /Mukaddime/i,
    /Hâtime/i,
    /Nükte/i,
    /Mesele/i,
    /Tenbih/i,
    /İhtar/i,
    /^بِاسْمِهٖ/,  // Arabic headers
];

function classifySection(title) {
    // Check footnotes first
    for (const pattern of FOOTNOTE_PATTERNS) {
        if (pattern.test(title)) return 'footnote';
    }

    // Check main sections
    for (const pattern of MAIN_SECTION_PATTERNS) {
        if (pattern.test(title)) return 'main';
    }

    // Check sub sections
    for (const pattern of SUB_SECTION_PATTERNS) {
        if (pattern.test(title)) return 'sub';
    }

    // Default to sub (safer for TOC filtering)
    return 'sub';
}

let content = fs.readFileSync(INPUT_FILE, 'utf-8').replace(/\r\n/g, '\n');
const books = content.split('===ESER_START===');
if (books[0].trim() === '') books.shift();

const rawContent = books[0].split('\n').slice(books[0].split('\n').findIndex(l => l.startsWith('CONTENT:')) + 1).join('\n');
const rawSections = rawContent.split('***');

const sections = [];
let pageCounter = 1;
let sectionCounter = 1;
let currentMainSectionId = null; // Track current parent for sub-sections

rawSections.forEach((rawSection) => {
    const sText = rawSection.trim();
    if (!sText) return;
    const lines = sText.split('\n').filter(l => l.trim().length > 0);
    const title = lines[0].trim();
    const sectionId = `sozler-section-${String(sectionCounter).padStart(3, '0')}`;
    const sectionType = classifySection(title);

    // Track parent relationships
    let parentId = null;
    if (sectionType === 'main') {
        currentMainSectionId = sectionId; // This becomes the new parent
    } else if (sectionType === 'sub' || sectionType === 'footnote') {
        parentId = currentMainSectionId; // Link to current main section
    }

    const paragraphs = lines.slice(1);
    const PARAGRAPHS_PER_PAGE = 7;
    const loops = Math.max(1, Math.ceil(paragraphs.length / PARAGRAPHS_PER_PAGE));

    for (let i = 0; i < loops; i++) {
        const pageId = `sozler-${String(pageCounter).padStart(4, '0')}`;
        const pSegs = paragraphs.slice(i * PARAGRAPHS_PER_PAGE, (i + 1) * PARAGRAPHS_PER_PAGE).map((t, idx) => ({
            segmentId: `${pageId}-${String(idx + 1).padStart(3, '0')}`,
            type: 'paragraph', text: t, lang: t.match(/[\u0600-\u06FF]/) ? 'ar' : 'tr'
        }));
        if (i === 0) pSegs.unshift({ segmentId: `${pageId}-header`, type: 'heading', text: title, lang: 'tr' });

        fs.writeFileSync(path.join(PAGES_DIR, `${String(pageCounter).padStart(4, '0')}.json`), JSON.stringify({
            bookId: 'sozler', pageId, pageIndex: pageCounter, sectionId, header: { title, sticky: true }, segments: pSegs
        }, null, 4));
        pageCounter++;
    }
    sections.push({
        sectionId,
        title,
        order: sectionCounter,
        startPage: 1,
        type: sectionType,
        parentId: parentId
    });
    sectionCounter++;
});

fs.writeFileSync(path.join(SOZLER_DIR, 'sections.json'), JSON.stringify({ bookId: 'sozler', sections }, null, 4));
console.log(`✅ Restore: ${pageCounter - 1} pages generated.`);
console.log(`   Main sections: ${sections.filter(s => s.type === 'main').length}`);
console.log(`   Sub sections: ${sections.filter(s => s.type === 'sub').length}`);
console.log(`   Footnotes: ${sections.filter(s => s.type === 'footnote').length}`);
