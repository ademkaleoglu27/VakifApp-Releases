
import { ReaderDatabase } from './src/services/ReaderDatabase';

const analyze = async () => {
    const db = await ReaderDatabase.getInstance();

    console.log("--- Analyzing Headers ---");
    // Fetch lines that look like headers (short, specific words)
    const headerPatterns = [
        "Birinci", "İkinci", "Üçüncü", "Dördüncü", "Beşinci",
        "Söz", "Mektup", "Lem'a", "Şua", "İhtar", "Tenbih"
    ];

    // We'll grab a sample of 200 paragraphs
    const rows = await db.getAllAsync<any>('SELECT text FROM paragraphs LIMIT 200');

    rows.forEach((row, i) => {
        const text = row.text.trim();

        // Check for Header Candidates
        if (text.length < 60) {
            const isPotentialHeader = headerPatterns.some(p => text.includes(p));
            if (isPotentialHeader) {
                console.log(`[HEADER_CANDIDATE] ID:${i} Content: "${text}"`);
            }
        }

        // Check for Inline Arabic
        const arabicMatch = text.match(/[\u0600-\u06FF]/g);
        if (arabicMatch && arabicMatch.length > 0 && arabicMatch.length < text.length * 0.5) {
            console.log(`[INLINE_ARABIC] ID:${i} Sample: "${text.substring(0, 100)}..."`);
        }
    });
}

analyze();
