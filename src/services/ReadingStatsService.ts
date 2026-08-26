import { getSupabaseClient } from './supabaseClient';
import { getDb } from './db/sqlite';
import { getCurrentVakifId } from '@/store/vakifStore';

export interface ReadingStat {
    user_id: string;
    display_name: string;
    initials: string;
    total_pages: number;
    has_reading: boolean;
    rank: number;
    last_reading_date: string | null;
    avatar_url: string | null;
    is_me?: boolean;
    phone?: string;
}

export type StatsRange = 'week' | 'month' | 'year';
export type FetchMode = 'homeTop10' | 'full' | 'needsAttention';

export const ReadingStatsService = {
    async fetchLeaderboard(range: StatsRange, mode: FetchMode): Promise<ReadingStat[]> {
        const supabase = getSupabaseClient();
        const db = await getDb();

        // ✅ Önceden tanımlanmış helper'ı kullan
        const vakifId = getCurrentVakifId();

        if (!vakifId) {
            console.warn('[ReadingStats] vakifId bulunamadı, boş liste dönülüyor.');
            return [];
        }

        console.log('[ReadingStats] →', { vakifId, range, mode }); // debug için

        const cacheKey = `stats:${vakifId}:${range}:${mode}`;

        let limit: number | null = null;
        let includeZero = false;

        if (mode === 'homeTop10') {
            limit = 10;
        } else if (mode === 'full') {
            includeZero = true;
        } else if (mode === 'needsAttention') {
            includeZero = true;
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

                if (error) {
                    console.error('[ReadingStats] RPC Hatası:', error);
                    throw error;
                }

                // Success!
                console.log('[ReadingStats] Dönen kayıt sayısı:', data?.length);
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
