import { useState, useCallback, useEffect, useRef } from 'react';
import { Paragraph } from '../../../services/risale/schema';
import { LayoutMetrics, Page } from '../engine/types';
import { createLayoutHash, loadPaginationCache, savePaginationCache, validatePages } from '../utils/paginationCache';
import { MeasurementRequest } from '../components/PaginationMeasurer';

interface PaginationState {
    pages: Page[];
    isLoading: boolean;
    progress: number;
}

interface Job {
    id: number;
    sectionId: string;
    layoutHash: string;
    fullText: string;
    sourceFingerprint: string; // New Checksum
    layout: LayoutMetrics;

    // Cursor
    processedOffset: number;
    currentPages: Page[];
    isComplete: boolean;
}

export const usePagination = (
    sectionId: string,
    paragraphs: Paragraph[],
    layout: LayoutMetrics
) => {
    const [state, setState] = useState<PaginationState>({
        pages: [],
        isLoading: true,
        progress: 0
    });

    const [measurementReq, setMeasurementReq] = useState<MeasurementRequest | null>(null);
    const jobRef = useRef<Job | null>(null);
    const jobIdCounter = useRef(0);

    // Init
    useEffect(() => {
        if (!paragraphs.length) return;

        const startJob = async () => {
            const hash = createLayoutHash(sectionId, layout);
            const fullText = paragraphs.map(p => p.text).join('\n\n');

            // 2. Compute Strict Fingerprint
            const fingerprint = `${fullText.length}:${fullText.slice(0, 512)}:${fullText.slice(fullText.length - 512)}`;

            // 1. Try Cache with Strict Checks
            const cached = await loadPaginationCache(hash, fingerprint);
            if (cached) {
                console.log('[Pagination] Cache hit:', hash);
                setState({ pages: cached, isLoading: false, progress: 1 });
                return;
            }

            const newJobId = ++jobIdCounter.current;
            const job: Job = {
                id: newJobId,
                sectionId,
                layoutHash: hash,
                fullText,
                sourceFingerprint: fingerprint,
                layout,
                processedOffset: 0,
                currentPages: [],
                isComplete: false
            };

            jobRef.current = job;
            setState({ pages: [], isLoading: true, progress: 0 });

            processNextPage(job, 5000, 1); // Start with 5k chunk, attempt 1
        };

        startJob();

        return () => { jobRef.current = null; };
    }, [sectionId, paragraphs, layout]);

    // Request Measurement
    const processNextPage = (job: Job, chunkSize: number, attempt: number) => {
        if (jobRef.current?.id !== job.id) return;

        const remainingLen = job.fullText.length - job.processedOffset;
        if (remainingLen <= 0) {
            completeJob(job);
            return;
        }

        const sliceLen = Math.min(remainingLen, chunkSize);
        const chunkText = job.fullText.substr(job.processedOffset, sliceLen);

        setMeasurementReq({
            jobId: job.id,
            text: chunkText,
            metrics: job.layout,
            startOffset: job.processedOffset,
            chunkSize,
            attempt
        });
    };

    // Handle Result
    const onMeasured = useCallback((reqJobId: number, lines: any[], fits: boolean, req: MeasurementRequest) => {
        // 1. Validation to prevent Stale State
        const job = jobRef.current;
        if (!job || job.id !== reqJobId) return;

        const maxH = job.layout.height;
        let currentH = 0;
        let consumedChars = 0;

        // 2. Iterate lines to find raw fit
        for (const line of lines) {
            if (currentH + line.height > maxH) {
                break;
            }
            currentH += line.height;
            consumedChars += line.text.length;
        }

        // 3. Guards & Adaptive Chunking
        const chunkLen = req.text.length;
        const isChunkExhausted = consumedChars >= chunkLen;
        const isFullTextExhausted = (job.processedOffset + consumedChars) >= job.fullText.length;

        // RETRY: If chunk exhausted but page not full (and not end of book)
        if (isChunkExhausted && !isFullTextExhausted && currentH < maxH) {
            const nextSize = Math.min(req.chunkSize * 2, 20000);
            if (req.attempt < 3 && nextSize > req.chunkSize) {
                console.log(`[Pagination] Chunk ${req.chunkSize} too small. Retrying with ${nextSize}.`);
                processNextPage(job, nextSize, req.attempt + 1);
                return;
            }
            // If max retries reached, we accept the partial page to progress.
            console.warn('[Pagination] Max retries reached for chunk growth. Accepting partial page.');
        }

        // GUARD: 0 Progress
        if (consumedChars === 0) {
            if (lines.length > 0) {
                // Force at least one line
                consumedChars += lines[0].text.length;
            } else {
                // Total Failure (0 lines returned?)
                // Advance at least 1 char or fallback
                consumedChars = 1;
            }
        }

        // 4. Word Boundary Adjustment (Strict Substring)
        let finalCutLen = consumedChars;
        const start = job.processedOffset;
        const rawEnd = Math.min(start + consumedChars, job.fullText.length);

        // Attempt to cut at whitespace if inside a word
        // Only check if we are NOT at exact end of text (which is a valid break)
        if (rawEnd < job.fullText.length) {
            const candidate = job.fullText.slice(start, rawEnd);
            const lastSpaceIndex = candidate.lastIndexOf(' '); // Simple space check, usually sufficient for prose

            if (lastSpaceIndex > -1) {
                // Safety: Don't cut if it results in a tiny page (< 60% of capacity)
                // This prevents an orphan word triggering a massive pullback
                const ratio = lastSpaceIndex / candidate.length;
                if (ratio > 0.6) {
                    finalCutLen = lastSpaceIndex + 1; // Include the space
                }
            }
        }

        // Strict Clamp
        let end = start + finalCutLen;
        if (end <= start) {
            // Force advance
            end = Math.min(start + 1, job.fullText.length);
        }
        // Final clamp to text length
        end = Math.min(end, job.fullText.length);

        const pageText = job.fullText.substring(start, end);

        const newPage: Page = {
            pageKey: `${job.sectionId}-${job.layoutHash}-${job.currentPages.length}-${start}`,
            sectionId: job.sectionId,
            pageIndex: job.currentPages.length,
            contentRaw: pageText,
            startOffset: start,
            endOffset: end
        };

        job.currentPages.push(newPage);

        // Advance
        job.processedOffset = end;

        setState(s => ({
            ...s,
            pages: [...job.currentPages],
            progress: job.processedOffset / job.fullText.length
        }));

        // Next
        setTimeout(() => processNextPage(job, 5000, 1), 0); // Reset chunk size

    }, []);

    const completeJob = async (job: Job) => {
        // Final Strict Validation
        if (!validatePages(job.currentPages)) {
            console.error('[Pagination] Validation failed for generated pages. Discarding cache.');
            // Fallback state? keep what we have in memory but don't cache.
        } else {
            await savePaginationCache(job.layoutHash, job.sourceFingerprint, job.currentPages);
            console.log(`[Pagination] Job ${job.id} Complete & Valid.`);
        }

        job.isComplete = true;
        setState(s => ({ ...s, isLoading: false, progress: 1 }));
        setMeasurementReq(null);
    };

    return {
        state, // Export full state object
        measurementReq,
        onMeasured
    };
};
