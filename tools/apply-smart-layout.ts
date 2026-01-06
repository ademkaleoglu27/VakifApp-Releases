
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../assets/content/risale.db');
const db = new Database(DB_PATH);

// Keywords to bold (Case insensitive pattern matching)
const KEYWORDS = [
    'Bismillah', 'Allah', 'Rahman', 'Rahim', 'Rahmet', 'Hikmet',
    'Şükür', 'Zikir', 'Fikir', 'Sultan', 'Halık', 'Rezzak',
    'Mün\'im', 'Daire-i', 'Rububiyet', 'Uluhiyet', 'Ebedi', 'Ezel'
];

function applySmartLayout() {
    console.log('Applying Smart Layout to Birinci Söz (sozler-2)...');

    // 1. Get Paragraphs
    const paragraphs = db.prepare("SELECT id, text, is_arabic FROM paragraphs WHERE section_id = 'sozler-2'").all() as any[];

    const updateStmt = db.prepare("UPDATE paragraphs SET text = ? WHERE id = ?");

    let updatedCount = 0;

    const runTransaction = db.transaction(() => {
        for (const p of paragraphs) {
            let text = p.text;
            let originalText = text;

            // Skip Arabic-only paragraphs (they have their own styling)
            if (p.is_arabic) continue;

            // Apply Bold to Keywords
            // Use regex with word boundaries to avoid partial matches inside other words
            for (const keyword of KEYWORDS) {
                // Escape special characters in keyword for regex
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b(${escaped})\\b`, 'gi');

                // Replace with **Keyword** (preserving original case)
                text = text.replace(regex, '**$1**');
            }

            // Clean up: Ensure clean spacing around bold markers
            // (Optional, regex replacement usually handles this fine)

            if (text !== originalText) {
                updateStmt.run(text, p.id);
                updatedCount++;
            }
        }
    });

    runTransaction();
    console.log(`✅ Smart Layout Applied! Updated ${updatedCount} paragraphs.`);
}

try {
    applySmartLayout();
} catch (error) {
    console.error('Error applying smart layout:', error);
}
