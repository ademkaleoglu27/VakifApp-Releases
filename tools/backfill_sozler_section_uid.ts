// import * as Crypto from 'expo-crypto'; // Removed to avoid native dependency requirement for tool

/**
 * Backfill Tool: Sözler Section UID Generator
 * 
 * This script is designed to be run within the app context or a compatible runtime
 * that has access to the SQLite database instance.
 */

interface SectionRow {
    id: string;
    work_id: string;
    title: string;
    order_index: number;
    parent_id?: string;
    section_uid?: string;
    book_id?: string;
    version?: string;
}

export async function backfillSozlerSectionUid(db: any) {
    console.log('[Backfill] Starting Sözler section_uid backfill...');

    // 1. Fetch all sections for standard formatting
    // Assuming 'sozler' is the legacy work_id in the DB
    const sections = await db.getAllAsync('SELECT * FROM sections WHERE work_id = ? ORDER BY order_index ASC', ['sozler']) as SectionRow[];

    if (!sections || sections.length === 0) {
        console.warn('[Backfill] No sections found for work_id="sozler". Skipping.');
        return;
    }

    const sectionMap = new Map(sections.map((s: any) => [s.id, s]));
    let updatedCount = 0;

    // Helper: Normalize title for deterministic seeding
    const normalize = (str: string) => {
        return str.toLowerCase()
            .trim()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '');
    };

    for (const section of sections) {
        // CONSTRAINT: Only update if section_uid is NULL
        if (section.section_uid) {
            continue;
        }

        // 2. Generate Deterministic Seed (Strict)
        // User Spec: normalize(title) + '|' + order_index + '|' + parent_chain
        // Parent Chain: normalize(p.title) + ':' + p.order_index joined by '>' (root to direct parent)

        let parentChainParts: string[] = [];
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

        // 3. Hash the Seed (SHA-1 via JS)
        const hash = sha1(seed);

        // 4. Create UID (s prefix + first 12 chars of hash)
        const uid = `s-${hash.substring(0, 12)}`;
        const bookId = 'risale.sozler@diyanet.tr';
        const version = '1.0.0';

        // 5. Update Record
        await db.runAsync(
            'UPDATE sections SET section_uid = ?, book_id = ?, version = ? WHERE id = ?',
            [uid, bookId, version, section.id]
        );
        updatedCount++;
    }

    console.log(`[Backfill] Completed. Updated ${updatedCount} sections.`);
}

/**
 * Pure JS SHA-1 Implementation (Compact)
 */
function sha1(str: string): string {
    const utf8 = unescape(encodeURIComponent(str));
    const arr = [];
    for (let i = 0; i < utf8.length; i++) arr.push(utf8.charCodeAt(i));

    // Append padding
    const len = arr.length * 8;
    arr.push(0x80);
    while ((arr.length * 8 + 64) % 512 !== 0) arr.push(0);

    // Append length
    for (let i = 0; i < 8; i++) arr.push((len >>> ((7 - i) * 8)) & 0xff);

    const words: number[] = [];
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
