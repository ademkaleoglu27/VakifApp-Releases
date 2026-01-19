const fs = require('fs');
const path = require('path');

// INPUT: Zakir2025 dualar.js (we will read it as string to avoid module issues)
const INPUT_FILE = path.join(__dirname, '../temp_repo/zakir2025/src/components/tesbihat/dualar.js');
const OUTPUT_FILE = path.join(__dirname, '../assets/books/tesbihat.json');

// Ensure output dir exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Read the file
console.log(`Reading ${INPUT_FILE}...`);
const fileContent = fs.readFileSync(INPUT_FILE, 'utf8');

// 2. Extract the 'dualar' object string
// We look for 'export const dualar = {' and the matching closing brace
const startMarker = 'export const dualar = {';
const startIndex = fileContent.indexOf(startMarker);

if (startIndex === -1) {
    console.error('Could not find start of dualar object');
    process.exit(1);
}

// Simple heuristic: read until end of file, then try to evaluate or parse
// Since it's a JS file, we can try to eval it strictly if we strip the export
const rawJs = fileContent.substring(startIndex).replace('export const dualar =', 'global.dualar =');

try {
    // Execute the JS in a sandbox to get the object
    eval(rawJs);
} catch (e) {
    console.error('Failed to eval raw JS:', e);
    process.exit(1);
}

const dualarData = global.dualar;
console.log('Successfully parsed dualar data. Keys:', Object.keys(dualarData));

// 3. Transform to Book Format
const book = {
    bookId: 'evrad.tesbihat',
    title: 'Namaz Tesbihatı',
    author: 'Bediüzzaman Said Nursi',
    description: 'Namazlardan sonra yapılan tesbihatlar.',
    language: 'tr',
    sections: []
};

// Helper to convert Zakir content to our Section Content structure
function transformContent(key, data) {
    const segments = [];

    // Generic handler for 'latin' and 'arabic' arrays
    // Some entries like 'ecirna' have nested parts (part1, part2...)

    // Flatten logic
    const processPart = (textArray, type) => {
        if (!textArray) return;
        if (Array.isArray(textArray)) {
            textArray.forEach(line => {
                if (typeof line === 'string') {
                    segments.push({ type: type, text: line });
                } else if (line.text) {
                    segments.push({ type: type, text: line.text, meta: line });
                } else if (Array.isArray(line)) {
                    // Nested array (Ismi Azam tables)
                    line.forEach(sub => segments.push({ type: type, text: sub }));
                }
            });
        } else if (typeof textArray === 'object') {
            // Check for parts
            Object.keys(textArray).forEach(partKey => {
                processPart(textArray[partKey], type);
            });
        }
    };

    // Process Arabic first (Convention: Arabic usually on top or side-by-side)
    // Actually, usually we want blocks. Let's interleave or just dump.
    // Given the structure, simple dumping is safest for now.

    if (data.arabic) processPart(data.arabic, 'arabic');
    if (data.latin) processPart(data.latin, 'latin');

    return segments;
}

// 4. Map specific sections
const SECTION_ORDER = [
    { key: 'entesselam', title: 'Farzdan Sonra (Entesselam)' }, // Note: check availability
    { key: 'tuncina', title: 'Salaten Tuncina' },
    { key: 'nukaddimu', title: 'Nukaddimu' },
    { key: 'ecirna', title: 'Allahümme Ecirna' },
    { key: 'subhanallahi', title: 'Sübhânallâhi' },
    { key: 'tesbih', title: 'Tesbih Çekilir' },
    { key: 'ismiazam', title: 'İsm-i Âzam' },
    { key: 'tercuman', title: 'Tercüman-ı İsm-i Âzam' },
    { key: 'tercumandua', title: 'Tercüman-ı İsm-i Âzam Duası' },
    // ... add others as needed based on keys
];

// Auto-add available keys
Object.keys(dualarData).forEach(key => {
    // Skip if already in order list
    if (SECTION_ORDER.find(s => s.key === key)) return;
    SECTION_ORDER.push({ key, title: key.charAt(0).toUpperCase() + key.slice(1) });
});

SECTION_ORDER.forEach(item => {
    if (dualarData[item.key]) {
        book.sections.push({
            id: item.key,
            title: item.title,
            content: transformContent(item.key, dualarData[item.key])
        });
    }
});

// 5. Write JSON
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(book, null, 2));
console.log(`Generated ${OUTPUT_FILE} with ${book.sections.length} sections.`);
