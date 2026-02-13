/**
 * RisaleHtmlReaderHomeGated - Content Gate Wrapper
 * 
 * Wraps RisaleHtmlReaderHomeScreen with RequireContent gate.
 * Triggers download if content pack is not available.
 * 
 * Library Contract v1.1 Compliant: FROZEN paths untouched
 * 
 * @packageDocumentation
 */

import React from 'react';
import { RequireContent } from '@/features/contentpacks';
import { RisaleHtmlReaderHomeScreen } from '@/features/reader/html_pilot/RisaleHtmlReaderHomeScreen';
import { getBookById } from '@/config/booksRegistry';

/**
 * Gated version of RisaleHtmlReaderHomeScreen.
 * Checks content availability before rendering.
 */
export const RisaleHtmlReaderHomeGated = ({ route }: any) => {
    const bookId = route?.params?.bookId || 'sozler';
    const book = getBookById(bookId);
    const bookTitle = book?.title || bookId;

    return (
        <RequireContent bookId={bookId} bookTitle={bookTitle}>
            <RisaleHtmlReaderHomeScreen />
        </RequireContent>
    );
};

export default RisaleHtmlReaderHomeGated;
