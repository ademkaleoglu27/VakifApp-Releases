/**
 * numberNormalize.ts
 * Turkish number-to-ordinal word conversion for search.
 * 
 * Converts numeric ordinals to Turkish words:
 * - "4" → "dördüncü" / "dört"
 * - "4.söz" → "dördüncü söz"
 * - "10.mektup" → "onuncu mektup"
 */

// Ordinal number to Turkish word mapping
const ORDINAL_MAP: Record<string, string> = {
    '1': 'birinci',
    '2': 'ikinci',
    '3': 'üçüncü',
    '4': 'dördüncü',
    '5': 'beşinci',
    '6': 'altıncı',
    '7': 'yedinci',
    '8': 'sekizinci',
    '9': 'dokuzuncu',
    '10': 'onuncu',
    '11': 'on birinci',
    '12': 'on ikinci',
    '13': 'on üçüncü',
    '14': 'on dördüncü',
    '15': 'on beşinci',
    '16': 'on altıncı',
    '17': 'on yedinci',
    '18': 'on sekizinci',
    '19': 'on dokuzuncu',
    '20': 'yirminci',
    '21': 'yirmi birinci',
    '22': 'yirmi ikinci',
    '23': 'yirmi üçüncü',
    '24': 'yirmi dördüncü',
    '25': 'yirmi beşinci',
    '26': 'yirmi altıncı',
    '27': 'yirmi yedinci',
    '28': 'yirmi sekizinci',
    '29': 'yirmi dokuzuncu',
    '30': 'otuzuncu',
    '31': 'otuz birinci',
    '32': 'otuz ikinci',
    '33': 'otuz üçüncü',
};

// Cardinal numbers for general search
const CARDINAL_MAP: Record<string, string> = {
    '1': 'bir',
    '2': 'iki',
    '3': 'üç',
    '4': 'dört',
    '5': 'beş',
    '6': 'altı',
    '7': 'yedi',
    '8': 'sekiz',
    '9': 'dokuz',
    '10': 'on',
};

/**
 * Expands a query by converting numbers to Turkish ordinal words.
 * 
 * Examples:
 * - "4.söz" → "dördüncü söz"
 * - "4. söz" → "dördüncü söz"
 * - "10.mektup" → "onuncu mektup"
 * - "4" (alone) → keeps as "4" (too ambiguous)
 * 
 * @param query The search query
 * @returns Expanded query with Turkish ordinal words
 */
export function expandNumbersInQuery(query: string): string {
    if (!query) return query;

    let expanded = query;

    // Pattern 1: "4.söz" or "4. söz" → "dördüncü söz"
    // Match: number followed by optional dot, optional space, then word
    expanded = expanded.replace(
        /(\d+)\.?\s*(söz|mektup|lem['']?a|şu[aâ]|risale|bölüm|kısım|mesele|nükte|işaret|pencere|meyve)/gi,
        (match, num, word) => {
            const ordinal = ORDINAL_MAP[num];
            if (ordinal) {
                return `${ordinal} ${word.toLowerCase()}`;
            }
            return match;
        }
    );

    // Pattern 2: Standalone "4." at the start → "dördüncü"
    // Only if followed by space and text
    expanded = expanded.replace(
        /^(\d+)\.\s+/,
        (match, num) => {
            const ordinal = ORDINAL_MAP[num];
            if (ordinal) {
                return `${ordinal} `;
            }
            return match;
        }
    );

    return expanded;
}

/**
 * Generates search variants including number expansions.
 * Returns multiple query options for flexible matching.
 * 
 * @param query Original query
 * @returns Array of query variants
 */
export function getNumberExpandedVariants(query: string): string[] {
    const variants: string[] = [query];
    const expanded = expandNumbersInQuery(query);

    if (expanded !== query) {
        variants.push(expanded);
    }

    return variants;
}

/**
 * Check if a query contains expandable number patterns
 */
export function hasExpandableNumbers(query: string): boolean {
    return /\d+\.?\s*(söz|mektup|lem['']?a|şu[aâ]|risale|bölüm)/i.test(query);
}
