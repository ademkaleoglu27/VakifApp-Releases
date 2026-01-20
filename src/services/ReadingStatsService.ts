import { getSupabaseClient } from './supabaseClient';
import { getDb } from './db/sqlite';
// If authService doesn't have it, we might need to get it from a different place or local storage.
// Correction: We should fetch it from the RPC call or just pass it if known.
// Actually, let's look at `ReadingStatsService.ts` original code again. It used `getDb` and local SQL.
// We need to know 'vakif_id' to call the RPC.

export interface ReadingStat {
    user_id: string;
    display_name: string;
    initials: string;
    total_pages: number;
    has_reading: boolean;
    rank: number;
    last_reading_date?: string;
    avatar_url?: string;
    // Client-side computed or passed through
    is_me?: boolean;
}

export type StatsRange = 'week' | 'month' | 'year';
export type FetchMode = 'homeTop10' | 'full' | 'needsAttention';

export const ReadingStatsService = {

    /**
     * SINGLE Source of Truth for Leaderboard.
     * Uses RPC 'get_reading_leaderboard' with offline caching.
     */
    async fetchLeaderboard(range: StatsRange, mode: FetchMode): Promise<ReadingStat[]> {
        const supabase = getSupabaseClient();
        const db = await getDb();

        // 1. Get Vakif ID (Required for RPC)
        const DEFAULT_VAKIF_ID = '00000000-0000-0000-0000-000000000001';
        let vakifId = DEFAULT_VAKIF_ID;

        const cacheKey = `stats:${vakifId}:${range}:${mode}`;

        // Determine RPC Params based on Mode
        let limit: number | null = null;
        let includeZero = false;

        if (mode === 'homeTop10') {
            limit = 10;
            includeZero = false;
        } else if (mode === 'full') {
            limit = null; // No limit
            includeZero = true; // Show everyone
        } else if (mode === 'needsAttention') {
            limit = null;
            includeZero = true; // We need zeros to filter them later
        }

        // 2. Try Online Fetch (RPC)
        if (supabase) {
            try {
                const { data, error } = await supabase.rpc('get_reading_leaderboard', {
                    p_vakif_id: vakifId,
                    p_range_type: range,
                    p_limit: limit,
                    p_include_zero: includeZero
                });

                if (error) throw error;

                // Success!
                // Filter for 'needsAttention' client-side (RPC returns all including zeros if requested)
                let result = (data as any[]).map(mapRpcToStat);

                if (mode === 'needsAttention') {
                    result = result.filter(r => r.total_pages === 0);
                }

                // Cache the result
                await db.runAsync(
                    `INSERT OR REPLACE INTO reading_leaderboard_cache (key, payload, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`,
                    [cacheKey, JSON.stringify(result)]
                );

                return result;

            } catch (err: any) {
                // Fallthrough to cache
            }
        }

        // 3. Fallback to Cache
        try {
            const cached = await db.getFirstAsync<{ payload: string }>(
                `SELECT payload FROM reading_leaderboard_cache WHERE key = ?`,
                [cacheKey]
            );

            if (cached) {
                return JSON.parse(cached.payload);
            }
        } catch (e) {
            // Cache read failed, return empty
        }

        return [];
    }
};

function mapRpcToStat(row: any): ReadingStat {
    return {
        user_id: row.user_id,
        display_name: row.display_name,
        initials: row.initials,
        total_pages: Number(row.total_pages), // BigInt serialized as likely number or string
        has_reading: row.has_reading,
        rank: Number(row.rank),
        last_reading_date: row.last_reading_date,
        avatar_url: row.avatar_url
    };
}
