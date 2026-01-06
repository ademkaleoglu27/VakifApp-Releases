/**
 * Font configuration for the app.
 * These font names must match the names passed to useFonts in App.tsx.
 * 
 * FONT ROLES (GOOGLE FONTS):
 * - Title (PirataOne): Section headings ONLY - Gothic/Blackletter style
 * - Body (Tinos): Main Turkish prose text - Sturdy, readable serif (Times New Roman alternative)
 * - Script (TinosItalic): Footnotes, haşiye, dipnot
 * - Arabic (Amiri): Arabic text blocks (Naskh style, very clear)
 */
export const FontFamily = {
    /** SECTION TITLES - Gotik/Blackletter tarzı (Pirata One) */
    Title: 'PirataOne',

    /** MAIN BODY TEXT - Turkish prose, daha tok ve okunaklı kitap fontu (Tinos) */
    Body: 'Tinos',
    BodyBold: 'TinosBold',
    BodyItalic: 'TinosItalic',

    /** FOOTNOTES/NOTES - İtalik versiyon */
    Script: 'TinosItalic',

    /** ARABIC TEXT - Kuran hattı stili (Amiri) */
    Arabic: 'Amiri',
    ArabicBold: 'AmiriBold',

    /** System fallback */
    Serif: 'serif',
} as const;

/** Theme colors matching cream paper aesthetic */
export const ReaderTheme = {
    /** Warm cream/manila paper background (lighter/cleaner) */
    background: '#FFF9E6',

    /** Near-black text color for Turkish text */
    text: '#1A1A1A',

    /** Arabic text color - deep red like reference image */
    arabic: '#B3261E',

    /** Section title text color */
    titleText: '#000000',

    /** Footnote/note text color - slightly lighter */
    footnote: '#4A4A4A',

    /** Overlay for header/footer */
    overlay: 'rgba(255, 249, 230, 0.98)',

    /** Subtle border/divider color */
    border: 'rgba(0, 0, 0, 0.1)',

    /** Very subtle border */
    borderLight: 'rgba(0, 0, 0, 0.05)',

    /** Loading overlay background */
    loadingOverlay: 'rgba(255, 249, 230, 0.90)',
} as const;

/**
 * Clean title string - remove any metadata-like prefixes that may have leaked.
 */
export const cleanTitle = (title: string): string => {
    if (!title) return '';
    return title
        .trim()
        .replace(/^(aliases|tags|keywords|source\s*name|source\s*url|year|date|publish_date|language|category|slug)\s*:\s*/i, '')
        .trim();
};

/**
 * Detect if text block is primarily Arabic based on Unicode range.
 */
export const isArabicBlock = (text: string): boolean => {
    if (!text || text.length < 5) return false;
    const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && arabicChars / totalChars > 0.4;
};

/**
 * Detect if text is a section heading
 */
export const isSectionTitle = (text: string): boolean => {
    if (!text || text.length > 100) return false;
    const trimmed = text.trim();

    const patterns = [
        /^(Birinci|İkinci|Üçüncü|Dördüncü|Beşinci|Altıncı|Yedinci|Sekizinci|Dokuzuncu|Onuncu|On\s*Birinci|On\s*İkinci)/i,
        /^(Birinci|İkinci|Üçüncü|Dördüncü|Beşinci)\s+(Söz|Mektup|Lem'a|Şuâ|Risale|Kısım|Nokta|Basamak|Meyve|Makam|Mesele)/i,
        /^(Söz|Mektup|Lem'a|Şuâ)\s*$/i,
        /^[\u0041-\u005A\u00C0-\u00D6\s]{3,}$/, // ALL CAPS shorter lines
    ];

    return patterns.some(p => p.test(trimmed));
};

/**
 * Detect footnote block
 */
export const isFootnoteBlock = (text: string): boolean => {
    if (!text) return false;
    const trimmed = text.trim();

    const patterns = [
        /^(Dipnot|Haşiye|Lügat|Lugat|İzah|Not|Açıklama)\s*:/i,
        /^\*\s/,
        /^\[\d+\]/,
    ];

    return patterns.some(p => p.test(trimmed));
};

export type SegmentType = 'arabic' | 'turkish' | 'title' | 'footnote';

export interface TextSegment {
    text: string;
    type: SegmentType;
}

export const parsePageSegments = (content: string): TextSegment[] => {
    if (!content) return [];

    const paragraphs = content.split(/\n\n+/);

    return paragraphs
        .filter(p => p.trim().length > 0)
        .map(p => {
            let trimmed = p.trim();

            // Markdown Header Detection (# Header)
            const isMarkdownHeader = trimmed.startsWith('#');
            if (isMarkdownHeader) {
                // Remove # and extra spaces
                trimmed = trimmed.replace(/^#+\s*/, '');
            }

            if (isArabicBlock(trimmed)) {
                return { text: trimmed, type: 'arabic' as SegmentType };
            }
            // Check title if it was a markdown header OR matches title patterns
            if (isMarkdownHeader || isSectionTitle(trimmed)) {
                return { text: trimmed, type: 'title' as SegmentType };
            }
            if (isFootnoteBlock(trimmed)) {
                return { text: trimmed, type: 'footnote' as SegmentType };
            }
            return { text: trimmed, type: 'turkish' as SegmentType };
        });
};
