/**
 * Book ID Canonicalization Service
 * 
 * Provides a single source of truth for normalizing book IDs.
 * Maps legacy/full IDs (e.g., 'risale.sozler@diyanet.tr') to short IDs (e.g., 'sozler').
 * 
 * @packageDocumentation
 */

/**
 * Normalizes a book ID to its canonical short form.
 * Used for config lookups and file system paths.
 * 
 * @param input The raw book ID (potentially full format)
 * @returns The canonical short ID
 */
export function canonicalizeBookId(input: string): string {
    const id = (input || '').trim();

    // Risale-i Nur Collection Short ID Mapping
    switch (id) {
        // The Big Books
        case 'risale.sozler@diyanet.tr': return 'sozler';
        case 'risale.mektubat@diyanet.tr': return 'mektubat';
        case 'risale.lemalar@diyanet.tr': return 'lemalar';
        case 'risale.sualar@diyanet.tr': return 'sualar';
        case 'risale.tarihce@diyanet.tr': return 'tarihce';

        // The Small Books & Lahikas
        case 'risale.mesnevi@diyanet.tr': return 'mesnevi';
        case 'risale.isarat@diyanet.tr': return 'isarat';
        case 'risale.barla@diyanet.tr': return 'barla';
        case 'risale.kastamonu@diyanet.tr': return 'kastamonu';
        case 'risale.emirdag1@diyanet.tr': return 'emirdag1';
        case 'risale.emirdag2@diyanet.tr': return 'emirdag2';
        case 'risale.asayi@diyanet.tr': return 'asayi';
        case 'risale.sikke@diyanet.tr': return 'sikke';
        case 'risale.muhakemat@diyanet.tr': return 'muhakemat';
        case 'risale.divaniharbi@diyanet.tr': return 'divaniharbi';
        case 'risale.nutuklar@diyanet.tr': return 'nutuklar';
        case 'risale.hutbe@diyanet.tr': return 'hutbe';
        case 'risale.munazarat@diyanet.tr': return 'munazarat';
        case 'risale.konferans@diyanet.tr': return 'konferans';

        // The Small Books (Küçük Kitaplar)
        case 'risale.sunuhat@diyanet.tr': return 'sunuhat';
        case 'risale.isarat_k@diyanet.tr': return 'isarat_k';
        case 'risale.tuluat@diyanet.tr': return 'tuluat';
        case 'risale.nurcesmesi@diyanet.tr': return 'nurcesmesi';
        case 'risale.genclik@diyanet.tr': return 'genclik';
        case 'risale.hanimlar@diyanet.tr': return 'hanimlar';

        // Add specific fix for Asa-yı Musa if distinct from asayi
        case 'risale.asayimusa@diyanet.tr': return 'asayi';
    }

    // Quran ID normalization (defaulting to the main one)
    if (id === 'quran.pdf' || id === 'quran.pdf@vakifapp') {
        return 'quran.pdf@vakifapp';
    }

    // Default: return as-is (already short or unknown)
    if (id.startsWith('risale.') && __DEV__) {
        console.warn(`[bookId] Unmapped risale id detected: ${id}`);
    }

    return id;
}

/**
 * Maps a full ID to its canonical short form (Alias for canonicalizeBookId).
 */
export const toShortId = canonicalizeBookId;
