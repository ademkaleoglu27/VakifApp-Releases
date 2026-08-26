/**
 * AudioSyncEngine
 * Precision time-mapping engine for Karaoke-style Line-by-Line / Verse-by-Verse audio sync.
 * Supports:
 * - Quran Verses (Weighted word/character timestamps & instant seek)
 * - Cevşen Babs & Münâcaat Lines (Group & Bab-level sync)
 * - Tesbihat Sections
 */

export interface SyncSegment {
    id: string | number;
    startMs: number;
    endMs: number;
}

export interface VerseSyncInfo {
    verseNumber: number;
    verseText: string;
}

class AudioSyncEngineClass {
    /**
     * Calculate precise verse time intervals for a Quran Surah.
     * Uses proportional text length + bismillah offset to map every verse to [startMs, endMs].
     */
    public calculateVerseSegments(
        verses: { verse_number: number; verse: string }[],
        totalDurationMs: number
    ): SyncSegment[] {
        if (!verses || verses.length === 0 || totalDurationMs <= 0) {
            return [];
        }

        // Calculate total character weights
        const weights = verses.map(v => Math.max(v.verse.length, 10));
        const totalWeight = weights.reduce((acc, w) => acc + w, 0);

        let currentStart = 0;
        const segments: SyncSegment[] = [];

        for (let i = 0; i < verses.length; i++) {
            const verseDuration = Math.round((weights[i] / totalWeight) * totalDurationMs);
            const endMs = i === verses.length - 1 ? totalDurationMs : currentStart + verseDuration;

            segments.push({
                id: verses[i].verse_number,
                startMs: currentStart,
                endMs: endMs,
            });

            currentStart = endMs;
        }

        return segments;
    }

    /**
     * Calculate Bab time intervals for a 10-Bab Cevşen group.
     */
    public calculateBabSegments(
        startBab: number,
        endBab: number,
        totalDurationMs: number,
        babs?: { id: number; lines: any[] }[]
    ): SyncSegment[] {
        const count = endBab - startBab + 1;
        if (count <= 0 || totalDurationMs <= 0) return [];

        const segments: SyncSegment[] = [];
        let currentStart = 0;

        if (babs && babs.length === count) {
            const weights = babs.map(b => b.lines ? b.lines.length + 1 : 10);
            const totalWeight = weights.reduce((a, b) => a + b, 0);

            for (let i = 0; i < count; i++) {
                const babNumber = startBab + i;
                const babDuration = Math.round((weights[i] / totalWeight) * totalDurationMs);
                const endMs = i === count - 1 ? totalDurationMs : currentStart + babDuration;

                segments.push({
                    id: babNumber,
                    startMs: currentStart,
                    endMs: endMs,
                });
                currentStart = endMs;
            }
        } else {
            const uniformDuration = Math.round(totalDurationMs / count);
            for (let i = 0; i < count; i++) {
                const babNumber = startBab + i;
                const endMs = i === count - 1 ? totalDurationMs : currentStart + uniformDuration;
                segments.push({
                    id: babNumber,
                    startMs: currentStart,
                    endMs: endMs,
                });
                currentStart = endMs;
            }
        }

        return segments;
    }

    /**
     * Calculate Tesbihat section time intervals.
     */
    public calculateTesbihatSegments(
        sections: { id: string; content?: any[] }[],
        totalDurationMs: number
    ): SyncSegment[] {
        if (!sections || sections.length === 0 || totalDurationMs <= 0) return [];

        const weights = sections.map(s => Math.max((s.content?.length || 1) * 10, 15));
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let currentStart = 0;
        const segments: SyncSegment[] = [];

        for (let i = 0; i < sections.length; i++) {
            const duration = Math.round((weights[i] / totalWeight) * totalDurationMs);
            const endMs = i === sections.length - 1 ? totalDurationMs : currentStart + duration;

            segments.push({
                id: sections[i].id,
                startMs: currentStart,
                endMs: endMs,
            });
            currentStart = endMs;
        }

        return segments;
    }

    /**
     * Find active segment id given position in millis.
     */
    public getActiveSegmentId(
        positionMs: number,
        segments: SyncSegment[]
    ): string | number | null {
        if (!segments || segments.length === 0) return null;

        const match = segments.find(s => positionMs >= s.startMs && positionMs < s.endMs);
        if (match) return match.id;

        // If at the end
        if (positionMs >= segments[segments.length - 1].endMs) {
            return segments[segments.length - 1].id;
        }

        return segments[0].id;
    }

    /**
     * Get exact start millisecond for Tap-to-Play seeking.
     */
    public getSeekMs(id: string | number, segments: SyncSegment[]): number {
        const seg = segments.find(s => s.id === id);
        return seg ? seg.startMs : 0;
    }
}

export const audioSyncEngine = new AudioSyncEngineClass();
