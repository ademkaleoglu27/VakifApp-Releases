export const normalizeText = (text: string): string => {
    if (!text) return '';

    let out = text.toLocaleLowerCase('tr-TR');

    // Normalize Turkish characters and common variations if needed
    // (toLocaleLowerCase 'tr-TR' generally handles I/İ -> ı/i correctly)

    // Replace circumflex chars if desired for broad matching 
    // (User request: "küçük harf, noktalama temizleme, apostrof ve tire temizleme")
    out = out
        .replace(/â/g, 'a')
        .replace(/î/g, 'i')
        .replace(/û/g, 'u');

    // Remove apostrophes, hyphens, and other punctuation
    // We explicitly remove ' and - and then all other non-word chars except space
    out = out.replace(/['’`\-]/g, ' ');

    // Remove all non-alphanumeric (Turkish alphabet compatible) identifiers
    // Keeping: a-z, 0-9, ç, ğ, ı, ö, ş, ü
    // Simplest regex for "remove punctuation": replace [^\w\s] with space
    // But we need to keep Turkish chars. 
    // \w in JS regex doesn't always cover unicode properly without /u flag and property escapes.
    // Safer: block list of punctuation.
    out = out.replace(/[.,:;!?()\[\]"”“*\/]/g, ' ');

    // Collapse whitespace
    out = out.replace(/\s+/g, ' ').trim();

    return out;
};

export const tokenizeText = (text: string): string[] => {
    return normalizeText(text).split(' ').filter(x => x.length > 0);
};
