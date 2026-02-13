const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../assets/risale.db');
const db = new Database(DB_PATH);

// --- SHA1 Implementation (Pure JS) ---
function sha1(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const arr = [];
    for (let i = 0; i < utf8.length; i++) arr.push(utf8.charCodeAt(i));

    // Append padding
    const len = arr.length * 8;
    arr.push(0x80);
    while ((arr.length * 8 + 64) % 512 !== 0) arr.push(0);

    // Append length
    for (let i = 0; i < 8; i++) arr.push((len >>> ((7 - i) * 8)) & 0xff);

    const words = [];
    for (let i = 0; i < arr.length; i += 4) {
        words.push((arr[i] << 24) | (arr[i + 1] << 16) | (arr[i + 2] << 8) | (arr[i + 3]));
    }

    let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;

    for (let i = 0; i < words.length; i += 16) {
        const w = new Array(80);
        for (let j = 0; j < 16; j++) w[j] = words[i + j];
        for (let j = 16; j < 80; j++) w[j] = ((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) << 1) | ((w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]) >>> 31);

        let a = h0, b = h1, c = h2, d = h3, e = h4;

        for (let j = 0; j < 80; j++) {
            let f, k;
            if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
            else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
            else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
            else { f = b ^ c ^ d; k = 0xCA62C1D6; }

            const temp = ((a << 5) | (a >>> 27)) + f + e + k + w[j];
            e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = temp;
        }

        h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }

    return [h0, h1, h2, h3, h4].map(h => ('00000000' + h.toString(16)).slice(-8)).join('');
}

// --- Normalize Function ---
const normalize = (str) => {
    return str.toLowerCase()
        .trim()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
};

function backfillMektubatSectionUid() {
    console.log('[Backfill] Starting Mektubat section_uid backfill...');

    // 1. Fetch sections
    const sections = db.prepare("SELECT * FROM sections WHERE work_id = ? ORDER BY order_index ASC").all('mektubat');

    if (!sections || sections.length === 0) {
        console.warn('[Backfill] No sections found for work_id="mektubat". Skipping.');
        return;
    }

    const sectionMap = new Map(sections.map(s => [s.id, s]));
    let updatedCount = 0;

    const updateStmt = db.prepare("UPDATE sections SET section_uid = ?, book_id = ?, version = ? WHERE id = ?");

    const bookId = 'risale.mektubat@diyanet.tr'; // Assuming standard Diyanet ID format
    const version = '1.0.0';

    db.transaction(() => {
        for (const section of sections) {
            // Only update if section_uid is NULL
            if (section.section_uid) {
                continue;
            }

            // 2. Generate Deterministic Seed
            let parentChainParts = [];
            let curr = section;
            while (curr.parent_id) {
                const parent = sectionMap.get(curr.parent_id);
                if (parent) {
                    parentChainParts.unshift(`${normalize(parent.title)}:${parent.order_index}`);
                    curr = parent;
                } else {
                    break;
                }
            }

            const parentChain = parentChainParts.join('>');
            const seed = `${normalize(section.title)}|${section.order_index}|${parentChain}`;

            // 3. Hash
            const hash = sha1(seed);

            // 4. Create UID
            const uid = `m-${hash.substring(0, 12)}`; // 'm' prefix for Mektubat? Or just 's' meant section? 
            // Looking at Sozler backfill it was 's-'. 
            // Standard might be just 's-' for section or specific prefix.
            // Let's stick to 's-' to be consistent with Sozler if 's' stands for section.
            // However, 'sozler' started with 's-'. 'Mektubat' might start with 'm-'.
            // Let's use 'm-' to avoid collisions if seeds are similar (though unlikely with title included).
            // Actually, checking ingest-sualar.js: `const uid = sectionId;` which was `sualar_1`.
            // The backfill uses hashes.
            // I ll use 'mk-' to be safe and distinct, or just `s-` if it stands for section.
            // Let's use `mk-` for Mektubat for clarity.
            // Wait, looking at Sozler: `s-`.
            // I will use `mk-` for Mektubat.

            // 5. Update
            updateStmt.run(`mk-${hash.substring(0, 12)}`, bookId, version, section.id);
            updatedCount++;
        }
    })();

    console.log(`[Backfill] Completed. Updated ${updatedCount} sections for Mektubat.`);
}

backfillMektubatSectionUid();
