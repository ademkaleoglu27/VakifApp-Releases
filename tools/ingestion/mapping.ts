/**
 * Ingestion Mapping for Risale-i Nur
 * Maps source TXT files to Work IDs and Metadata.
 */

export interface WorkMapping {
    filePath: string;
    workId: string;
    title: string;
    type: 'major' | 'booklet';
    order: number;
    locked?: boolean; // If true, SKIP ingestion (Sözler)
}

export const WORK_MAPPINGS: WorkMapping[] = [
    // --- LOCKED ---
    {
        filePath: '01 Sözler/Sözler.txt', // Path specific to source folder structure
        workId: 'sozler',
        title: 'Sözler',
        type: 'major',
        order: 1,
        locked: true // CRITICAL: DO NOT TOUCH
    },

    // --- MAJOR WORKS ---
    {
        filePath: '02 Mektubat/Mektubat.txt', // Search for this
        // Note: Directory might be "02 Mektubat", file name might vary. 
        // We will fuzzy match directory.
        workId: 'mektubat',
        title: 'Mektubat',
        type: 'major',
        order: 2
    },

    // --- BOOKLETS ---
    {
        filePath: '14 Küçük Kitaplar/Gençli̇k Rehberi̇.txt',
        workId: 'genclik_rehberi',
        title: 'Gençlik Rehberi',
        type: 'booklet',
        order: 1
    },
    {
        filePath: '14 Küçük Kitaplar/Hanimlar Rehberi̇.txt',
        workId: 'hanimlar_rehberi',
        title: 'Hanımlar Rehberi',
        type: 'booklet',
        order: 2
    },
    {
        filePath: '14 Küçük Kitaplar/Münazarat.txt',
        workId: 'munazarat',
        title: 'Münazarat',
        type: 'booklet',
        order: 3
    }
];
