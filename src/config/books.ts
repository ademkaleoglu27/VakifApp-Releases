/**
 * Book cover image registry.
 * Keys match work IDs from risale.db.
 * Falls back to default cover if specific cover not available.
 */

// Default cover for books without specific covers
const defaultCover = require('../../assets/books/default.png');

// Book covers mapping - using default for now since no specific covers exist yet
export const BookCovers: Record<string, any> = {
    sozler: defaultCover,
    mektubat: defaultCover,
    lemalar: defaultCover,
    sualar: defaultCover,
    tarihce: defaultCover,
    mesnevi: defaultCover,
    isarat: defaultCover,
    barla: defaultCover,
    kastamonu: defaultCover,
    emirdag1: defaultCover,
    emirdag2: defaultCover,
    asayimusa: defaultCover,
    default: defaultCover,
};

/**
 * Get cover for a work ID.
 * Falls back to default if not found.
 */
export const getBookCover = (workId: string): any => {
    return BookCovers[workId] || BookCovers.default;
};
