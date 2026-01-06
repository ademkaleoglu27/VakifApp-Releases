import { useState, useCallback, useEffect, useRef } from 'react';
import { Paragraph } from '../../../services/risale/schema';
import { LayoutMetrics, Page } from '../engine/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLayoutHash } from '../utils/layoutHasher';

interface PaginationState {
    pages: Page[];
    isCalculating: boolean;
    error: string | null;
    measurementQueue: string | null; // Content waiting to be measured
}

export const usePaginationV2 = (
    sectionId: string,
    paragraphs: Paragraph[],
    layout: LayoutMetrics
) => {
    const [state, setState] = useState<PaginationState>({
        pages: [],
        isCalculating: true,
        error: null,
        measurementQueue: null
    });

    // Ref to track if we've already started distinct processes
    const hasStarted = useRef(false);
    const currentLayoutHash = useRef<string>('');

    // 1. Init: Check Cache or Prepare Measurement
    useEffect(() => {
        const hash = createLayoutHash(layout);

        // Skip if no change (deep check not possible easily in effect dep, relying on manual check)
        if (hasStarted.current && currentLayoutHash.current === hash && paragraphs.length > 0) return;

        hasStarted.current = true;
        currentLayoutHash.current = hash;

        const run = async () => {
            // Try Cache
            const cacheKey = `paginate_v2:${sectionId}:${hash}`;
            try {
                const cached = await AsyncStorage.getItem(cacheKey);
                if (cached) {
                    const data = JSON.parse(cached);
                    if (Array.isArray(data) && data.length > 0) {
                        console.log('📦 cache hit for', sectionId);
                        setState(s => ({ ...s, pages: data, isCalculating: false, measurementQueue: null }));
                        return;
                    }
                }
            } catch (e) {
                console.warn('Cache failed', e);
            }

            // Start Measurement
            // Strategy: Join all paragraphs into one massive string with newlines.
            // This ensures text flow handles paragraph spacing naturally (if we add extra newlines).
            // NOTE: Double newline for paragraph break.
            if (paragraphs.length === 0) {
                setState(s => ({ ...s, isCalculating: false }));
                return;
            }

            const fullText = paragraphs.map(p => p.text).join('\n\n');

            setState(s => ({
                ...s,
                isCalculating: true,
                measurementQueue: fullText, // Push to view for measurement
                pages: []
            }));
        };

        run();
    }, [sectionId, paragraphs, layout]);

    // 2. Callback from View (TextMeasurer)
    const onMeasurementsReceived = useCallback(async (lines: any[]) => {
        // Process lines into pages
        const pages: Page[] = [];
        const pageHeight = layout.height;
        let currentHeight = 0;
        let currentPageLines: string[] = [];
        let pageIndex = 0;

        // Metrics
        const lineHeight = layout.lineHeight; // Or use line.height from event if variable

        for (const line of lines) {
            // Native line height might vary if font scaling is weird, but usually stable.
            // Let's use the event's height for specific accuracy.
            const lh = line.height;

            if (currentHeight + lh > pageHeight) {
                // Finish Page
                pages.push({
                    pageKey: `${sectionId}-${pageIndex}`,
                    sectionId,
                    pageIndex: pageIndex++,
                    contentRaw: currentPageLines.join(''), // Simplified content reconstruction
                    startParagraphId: 'unknown', // Lost in batch join? We can recover or just track text.
                    // For V2 robustness, we focus on CONTENT VISIBILITY first. 
                    // Precise paragraph ID tracking requires mapping lines back to source paragraphs which is complex with 'join'.
                    // Compromise: We store raw content for display. Metadata can be approximated if needed.
                    startParagraphIndex: 0,
                    startOffset: 0,
                    endParagraphId: 'unknown',
                    endParagraphIndex: 0,
                    endOffset: 0
                });

                // Reset for next page
                currentHeight = 0;
                currentPageLines = [];
            }

            currentPageLines.push(line.text);
            currentHeight += lh;
        }

        // Flush last page
        if (currentPageLines.length > 0) {
            pages.push({
                pageKey: `${sectionId}-${pageIndex}`,
                sectionId,
                pageIndex: pageIndex++,
                contentRaw: currentPageLines.join(''),
                startParagraphId: '',
                startParagraphIndex: 0, startOffset: 0, endParagraphId: '', endParagraphIndex: 0, endOffset: 0
            });
        }

        // Persist
        const hash = createLayoutHash(layout);
        const cacheKey = `paginate_v2:${sectionId}:${hash}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify(pages));

        setState(s => ({
            ...s,
            pages,
            isCalculating: false,
            measurementQueue: null // Done
        }));

    }, [layout, sectionId]);

    const onMeasurementError = useCallback(() => {
        console.error("Text measurement failed");
        setState(s => ({ ...s, isCalculating: false, error: 'Measurement Failed' }));
    }, []);

    return {
        state,
        onMeasurementsReceived,
        onMeasurementError
    };
};
