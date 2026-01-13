/**
 * Deterministic Section UID Generator
 * 
 * Strict Logic:
 * seed = normalize(title) + '|' + orderIndex + '|' + parent_chain
 * parent_chain = normalize(p.title) + ':' + p.orderIndex joined by '>' (Root -> Parent)
 * uid = 's-' + sha1(seed).slice(0, 12)
 */

export const normalizeTitle = (str: string): string => {
    return str.toLowerCase()
        .trim()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, ''); // Remove punctuation/spaces
};

export const generateSectionUid = (
    title: string,
    orderIndex: number,
    parentChain: { title: string; orderIndex: number }[]
): string => {
    // Build Parent Chain String (Root -> Parent)
    // Expect parentChain to be ordered [Root, ..., DirectParent]
    const chainStr = parentChain.map(p => `${normalizeTitle(p.title)}:${p.orderIndex}`).join('>');

    // Seed Construction
    const seed = `${normalizeTitle(title)}|${orderIndex}|${chainStr}`;

    // Generating Hash
    const hash = sha1(seed);

    // UID Formatting
    return `s-${hash.substring(0, 12)}`;
};

/**
 * Pure JS SHA-1 Implementation
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
