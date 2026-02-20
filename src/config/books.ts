/**
 * Book cover image registry.
 * Keys match work IDs from risale.db.
 * Falls back to default cover if specific cover not available.
 */

// Default cover for books without specific covers
const defaultCover = require('../../assets/books/default.png');

// Book covers mapping
export const BookCovers: Record<string, any> = {
    sozler: require('../../assets/covers/sozler.png'),
    mektubat: require('../../assets/covers/mektubat.png'),
    lemalar: require('../../assets/covers/lemalar.png'),
    sualar: require('../../assets/covers/sualar.png'),
    muhakemat: require('../../assets/covers/muhakemat.png'),
    isarat: require('../../assets/covers/isarat.png'),
    barla: require('../../assets/covers/barla.png'),
    kastamonu: require('../../assets/covers/kastamonu.png'),
    emirdag1: require('../../assets/covers/emirdag1.png'),
    emirdag2: require('../../assets/covers/emirdag2.png'),
    asayimusa: require('../../assets/covers/asayi.png'),
    default: defaultCover,
};

/**
 * Get cover for a work ID.
 * Falls back to default if not found.
 */
export const getBookCover = (workId: string): any => {
    return BookCovers[workId] || BookCovers.default;
};
