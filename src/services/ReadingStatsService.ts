import { getDb } from './db/sqlite';

export interface ReadingStat {
    id: string; // user_id (preferred) or contact_id
    identityKey: string; // N:normalized_name or U:user_id
    name: string;
    surname: string;
    displayName: string;
    initials: string;
    totalPages: number;
    phone?: string;
    hasReading: boolean;
    lastReadingDate?: string;
    rank?: number;
}

export type StatsRange = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const ReadingStatsService = {
    /**
     * The SINGLE Source of Truth for Leaderboard Calculations.
     * Fetches data from BOTH reading_logs and contact_readings (legacy),
     * merges them strictly by Identity Key (User ID > Normalized Name),
     * and returns a consistent list for all screens.
     */
    async fetchLeaderboard(range: StatsRange, includeZero: boolean = false): Promise<ReadingStat[]> {
        const db = await getDb();
        const { startStr } = getRangeDates(range);

        // 1. Fetch from reading_logs (Official Users)
        // Join with contacts on user_id to get names
        const logs = await db.getAllAsync<any>(`
            SELECT 
                rl.user_id as id,
                c.name, c.surname, c.phone,
                SUM(rl.pages_read) as pages,
                MAX(rl.date) as last_date
            FROM reading_logs rl
            LEFT JOIN contacts c ON rl.user_id = c.user_id
            WHERE rl.date >= ?
            GROUP BY rl.user_id
        `, [startStr]);

        // 2. Fetch from contact_readings (Legacy / Manual)
        const contactLogs = await db.getAllAsync<any>(`
            SELECT 
                c.id as contact_id,
                c.user_id,
                c.name, c.surname, c.phone,
                SUM(cr.pages_read) as pages,
                MAX(cr.date) as last_date
            FROM contact_readings cr
            JOIN contacts c ON cr.contact_id = c.id
            WHERE cr.date >= ?
            GROUP BY cr.contact_id
        `, [startStr]);

        // 3. Fetch All Contacts (for Zero-Reading users if needed)
        let allContacts: any[] = [];
        if (includeZero) {
            allContacts = await db.getAllAsync<any>(`SELECT id, user_id, name, surname, phone FROM contacts`);
        }

        // --- Aggregation & Deduplication Engine ---
        const map = new Map<string, ReadingStat>();

        const normalize = (s: string) => s ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '';
        const buildDisplayName = (n: string, s: string) => `${n || ''} ${s || ''}`.trim();
        const getInitials = (n?: string, s?: string) => {
            const nI = n ? n[0].toUpperCase() : '';
            const sI = s ? s[0].toUpperCase() : '';
            return nI + sI;
        }

        const mergeToMap = (row: any) => {
            const name = row.name || '';
            const surname = row.surname || '';
            const displayName = buildDisplayName(name, surname);
            const normName = normalize(displayName);

            // 1. CANONICAL IDENTITY KEY
            let identityKey = '';
            if (row.user_id) identityKey = `U:${row.user_id}`;
            else if (row.contact_id) identityKey = `C:${row.contact_id}`;
            else identityKey = `N:${normName}`;

            if (!map.has(identityKey)) {
                map.set(identityKey, {
                    id: row.user_id || row.contact_id || row.id,
                    identityKey,
                    name,
                    surname,
                    displayName,
                    initials: getInitials(name, surname),
                    totalPages: 0,
                    phone: row.phone,
                    hasReading: false,
                    lastReadingDate: undefined
                });
            }

            const existing = map.get(identityKey)!;
            if (row.pages) {
                existing.totalPages += row.pages;
                existing.hasReading = true;
            }

            // Date Logic: Keep Max
            if (row.last_date) {
                if (!existing.lastReadingDate || row.last_date > existing.lastReadingDate) {
                    existing.lastReadingDate = row.last_date;
                }
            }

            // Profile Enrichment
            if (row.phone && !existing.phone) existing.phone = row.phone;
        };

        // Pass 1: Reading Logs
        logs.forEach(row => mergeToMap(row));

        // Pass 2: Contact Logs
        contactLogs.forEach(row => mergeToMap(row));

        // Pass 3: Zeros (if requested)
        if (includeZero) {
            allContacts.forEach(row => mergeToMap({ ...row, pages: 0 }));
        }

        // --- IDENTITY BUG DETECTION (Rule 4) ---
        const nameToKeyMap = new Map<string, string>();
        map.forEach((val, key) => {
            const norm = normalize(val.displayName);
            if (nameToKeyMap.has(norm) && nameToKeyMap.get(norm) !== key) {
                console.warn(`[ReadingStats] IDENTITY BUG: Name "${val.displayName}" found with multiple keys: [${nameToKeyMap.get(norm)}] and [${key}]. Merge suggested!`);
            }
            nameToKeyMap.set(norm, key);
        });

        // Final Sort
        const result = Array.from(map.values()).sort((a, b) => b.totalPages - a.totalPages);

        // Computed Ranks
        result.forEach((item, index) => {
            item.rank = index + 1;
        });

        console.log(`[ReadingStats] source=local range=${range} count=${result.length} top1=${result[0]?.totalPages || 0}`);

        return result;
    }
};

// Initials Logic: First two words
function getInitials(name: string, surname: string) {
    const full = `${name} ${surname}`.trim();
    if (!full) return '?';
    const parts = full.split(/\s+/);
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
}

// Helper for Range Dates (Mon 00:00 aligned)
function getRangeDates(range: StatsRange) {
    const now = new Date();
    // Monday Alignment Logic
    const day = now.getDay();
    const diff = (day - 1 + 7) % 7;
    const start = new Date(now);

    if (range === 'WEEKLY') {
        start.setDate(now.getDate() - diff); // Last Monday
    } else if (range === 'MONTHLY') {
        start.setDate(1); // 1st of Month
    } else {
        start.setMonth(0, 1); // Jan 1st
    }

    start.setHours(0, 0, 0, 0);
    return { startStr: start.toISOString() };
}
