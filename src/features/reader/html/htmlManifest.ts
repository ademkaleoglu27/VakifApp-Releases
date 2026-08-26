export type HtmlChapter = {
    id: string;
    title: string;
    assetPath: string;
    sectionId?: string; // Optional: Link to real TOC if needed later
};

export const HTML_CHAPTERS: HtmlChapter[] = Array.from({ length: 33 }, (_, i) => {
    const num = i + 1;
    const padded = String(num).padStart(2, '0');
    // Determine title: 
    // Basic conversion: 1 -> Birinci, 2 -> İkinci etc using helper or just "X. Söz"
    // For now simple formatting "X. Söz" is cleaner and reliable.
    // Or we can map specific ones if needed.
    // The user wants to see them.

    // Simple ordinal mapping for first few, then numbers?
    // Let's use "X. Söz" format for robustness.

    return {
        id: `soz_${padded}`,
        title: `${num}. Söz`,
        assetPath: `risale_html_pilot/01_sozler/01_${padded}.html`,
    };
});
