import * as SQLite from 'expo-sqlite';

const SOZLER_WORK_ID = 'sozler';
const SOZLER_BOOK_ID = 'risale.sozler@diyanet.tr';
const VERSION = '1.0.0';

/**
 * Pure JS SHA-1 Implementation (Compact)
 * Used to avoid native dependencies for this critical migration.
 */
/**
 * Pure JS SHA-1 Implementation (Compact)
 * Used to avoid native dependencies for this critical migration.
 * 
 * FIX: Using BigInt for 64-bit length appending to avoid JS 32-bit bitwise limitations.
 */
function sha1(str: string): string {
    const utf8 = unescape(encodeURIComponent(str));
    const arr = [];
    for (let i = 0; i < utf8.length; i++) arr.push(utf8.charCodeAt(i));

    // Append padding
    const originalLengthBytes = arr.length;
    arr.push(0x80);
    while ((arr.length * 8 + 64) % 512 !== 0) arr.push(0);

    // Append length (64-bit big-endian)
    // FIX: JS bitwise operators treat operands as 32-bit integers.
    // For 64-bit length, we need BigInt.
    const lenBits = BigInt(originalLengthBytes) * 8n;
    // Push 8 bytes (Big Endian)
    for (let i = 7; i >= 0; i--) {
        const shift = BigInt(i) * 8n;
        const byte = Number((lenBits >> shift) & 0xffn);
        arr.push(byte);
    }

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

const normalize = (str: string) => {
    return str.toLowerCase()
        .trim()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
};

/**
 * Single Source of Truth for Sözler Section UID Backfill
 * Idempotent, Deterministic, and Fail-Fast.
 */
export async function backfillSozlerSectionUid(db: SQLite.SQLiteDatabase) {
    console.log('[Backfill] Starting Sözler section_uid backfill (Single Source)...');

    // 0. Pre-Normalization: Ensure ALL Sozler sections have book_id and version set.
    // This supports the UNIQUE index even if backfill doesn't need to generate a UID (already exists).
    // We do NOT touch section_uid here.
    try {
        const updateResult = await db.runAsync(
            `UPDATE sections 
             SET book_id = ?, version = ?
             WHERE work_id = ? AND (book_id IS NULL OR book_id = '' OR version IS NULL OR version = '')`,
            [SOZLER_BOOK_ID, VERSION, SOZLER_WORK_ID]
        );
        // Note: Expo SQLite runAsync result typically returns 'changes'
        console.log(`[Backfill] Normalized book_id/version for ${updateResult.changes} Sozler sections.`);
    } catch (e) {
        console.warn('[Backfill] Normalization warning (non-fatal):', e);
    }

    // 1. Fetch only candidates (NULL UIDs)
    // We strictly touch only NULL uids.
    const sections = await db.getAllAsync<any>(
        'SELECT * FROM sections WHERE work_id = ? AND section_uid IS NULL ORDER BY order_index ASC',
        [SOZLER_WORK_ID]
    );

    if (!sections || sections.length === 0) {
        console.log('[Backfill] No incomplete Sözler sections found. Everything looks good.');
        // Even if no UIDs to generate, we must check guards below.
    } else {
        // Need full map for parent chain resolution
        const allSections = await db.getAllAsync<any>(
            'SELECT * FROM sections WHERE work_id = ?',
            [SOZLER_WORK_ID]
        );
        const sectionMap = new Map(allSections.map((s) => [s.id, s]));

        let updatedCount = 0;

        for (const section of sections) {
            if (section.section_uid) continue;

            // Seed Generation (Strict Deterministic)
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
            const hash = sha1(seed);
            const uid = `s-${hash.substring(0, 12)}`;

            await db.runAsync(
                'UPDATE sections SET section_uid = ?, book_id = ?, version = ? WHERE id = ?',
                [uid, SOZLER_BOOK_ID, VERSION, section.id]
            );
            updatedCount++;
        }
        console.log(`[Backfill] Updated ${updatedCount} sections with deterministic UIDs.`);
    }

    // 2. Final Guards (Strict)

    // Guard A: Check for any remaining NULL or EMPTY book_id in Sozler
    const nullBookIdCount = await db.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM sections WHERE work_id=? AND (book_id IS NULL OR book_id = '')`,
        [SOZLER_WORK_ID]
    );
    if ((nullBookIdCount?.c ?? 0) > 0) {
        console.error(`[Backfill] FATAL: Found ${nullBookIdCount?.c} sections with NULL/EMPTY book_id after normalization!`);
        throw new Error('ERR_BOOK_ID_NULL_PRESENT');
    }

    // Guard B: Duplicate Check (Fail Fast)
    const duplicates = await db.getAllAsync<{ section_uid: string, c: number }>(
        `SELECT section_uid, COUNT(*) as c FROM sections WHERE book_id=? GROUP BY section_uid HAVING c>1`,
        [SOZLER_BOOK_ID]
    );

    if (duplicates.length > 0) {
        console.error('[Backfill] FATAL: Duplicate UIDs detected after backfill!', duplicates);
        throw new Error('ERR_UID_DUPLICATE_GENERATED');
    }
}
