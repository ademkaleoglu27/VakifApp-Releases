import { z } from 'zod';
import { ReadingStat } from '../ReadingStatsService';

// Schema for a single reading log row from RPC or DB
export const ReadingStatRowSchema = z.object({
    user_id: z.string().nullable().optional(),
    display_name: z.string().nullable().optional(),
    initials: z.string().nullable().optional(),
    total_pages: z.number().nonnegative().or(z.string().transform(Number)), // Handle string serialization
    has_reading: z.boolean().optional(),
    rank: z.number().optional(),
    last_reading_date: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
}).passthrough();

export const ReadingStatsResponseSchema = z.array(ReadingStatRowSchema);

export function parseReadingStats(data: unknown): ReadingStat[] {
    const result = ReadingStatsResponseSchema.safeParse(data);

    if (!result.success) {
        console.warn('ReadingStats Validation Failed:', result.error);
        return [];
    }

    // Map to domain object
    return result.data.map(row => ({
        user_id: row.user_id || '', // Ensure string if required? Interface says string.
        display_name: row.display_name || 'Unknown',
        initials: row.initials || '',
        total_pages: row.total_pages,
        has_reading: !!row.has_reading, // Ensure boolean
        rank: row.rank || 0,
        last_reading_date: row.last_reading_date || undefined,
        avatar_url: row.avatar_url || undefined
    }));
}
