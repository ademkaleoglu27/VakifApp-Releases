import { supabase } from '@/services/supabaseClient';
import { getDb, getLastSyncedAt, setLastSyncedAt } from '@/services/db/sqlite';
import { NetInfoState, useNetInfo } from '@react-native-community/netinfo'; // Or simple check

// Types matching Supabase Schema
interface Decision {
    id: string;
    title: string;
    summary: string | null;
    date: string;
    created_by: string | null;
    created_at: string;
}

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    category: string;
    date: string;
    description: string | null;
    payment_method: string;
    created_by: string | null;
    created_at: string;
}

export const syncService = {
    // 1. PULL: Get latest data from Cloud -> SQLite
    pullChanges: async () => {
        try {
            const lastSyncedAt = await getLastSyncedAt();
            const db = await getDb();

            // A. Decisions
            let queryD = supabase.from('decisions').select('*');
            if (lastSyncedAt) queryD = queryD.gt('created_at', lastSyncedAt); // Should rely on updated_at if available

            const { data: decisions, error: errD } = await queryD;
            if (errD) throw errD;

            if (decisions && decisions.length > 0) {
                for (const d of decisions as Decision[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO decisions (id, title, summary, date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                        [d.id, d.title, d.summary, d.date, d.created_by, d.created_at]
                    );
                }
            }

            // B. Transactions
            let queryT = supabase.from('transactions').select('*');
            if (lastSyncedAt) queryT = queryT.gt('created_at', lastSyncedAt);

            const { data: transactions, error: errT } = await queryT;
            if (errT) throw errT;

            if (transactions && transactions.length > 0) {
                for (const t of transactions as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO transactions (id, type, amount, currency, category, date, description, payment_method, contact_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [t.id, t.type, t.amount, t.currency, t.category, t.date, t.description, t.payment_method, t.contact_id, t.created_by, t.created_at]
                    );
                }
            }

            // C. Hatims
            let queryH = supabase.from('hatims').select('*');
            if (lastSyncedAt) queryH = queryH.gt('created_at', lastSyncedAt);

            const { data: hatims, error: errH } = await queryH;
            if (errH) throw errH;

            if (hatims && hatims.length > 0) {
                for (const h of hatims as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO hatims (id, title, target_date, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                        [h.id, h.title, h.target_date, h.status, h.created_by, h.created_at]
                    );
                }
            }

            // D. Hatim Parts
            let queryHP = supabase.from('hatim_parts').select('*');
            if (lastSyncedAt) queryHP = queryHP.gt('updated_at', lastSyncedAt);

            const { data: parts, error: errHP } = await queryHP;
            if (errHP) throw errHP;

            if (parts && parts.length > 0) {
                for (const p of parts as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO hatim_parts (id, hatim_id, juz_number, status, assigned_to_name, assigned_to_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [p.id, p.hatim_id, p.juz_number, p.status, p.assigned_to_name, p.assigned_to_id, p.updated_at]
                    );
                }
            }

            // E. Reading Logs
            let queryRL = supabase.from('reading_logs').select('*');
            if (lastSyncedAt) queryRL = queryRL.gt('created_at', lastSyncedAt);

            const { data: logs, error: errRL } = await queryRL;
            if (errRL) throw errRL;

            if (logs && logs.length > 0) {
                for (const l of logs as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO reading_logs (id, user_id, book_id, pages_read, duration_minutes, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [l.id, l.user_id, l.book_id, l.pages_read, l.duration_minutes, l.date, l.created_at]
                    );
                }
            }

            // Update Sync Timestamp
            await setLastSyncedAt(new Date().toISOString());

            // F. Contacts
            let queryC = supabase.from('contacts').select('*');
            if (lastSyncedAt) queryC = queryC.gt('created_at', lastSyncedAt);
            const { data: contacts, error: errC } = await queryC;
            if (errC) throw errC;
            if (contacts && contacts.length > 0) {
                for (const c of contacts as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO contacts (id, name, surname, phone, address, group_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [c.id, c.name, c.surname, c.phone, c.address, c.group_type, c.created_at]
                    );
                }
            }

            // G. Contact Readings
            let queryCR = supabase.from('contact_readings').select('*');
            if (lastSyncedAt) queryCR = queryCR.gt('created_at', lastSyncedAt);
            const { data: readings, error: errCR } = await queryCR;
            if (errCR) throw errCR;
            if (readings && readings.length > 0) {
                for (const r of readings as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO contact_readings (id, contact_id, pages_read, date, created_at) VALUES (?, ?, ?, ?, ?)`,
                        [r.id, r.contact_id, r.pages_read, r.date, r.created_at]
                    );
                }
            }

            // H. Assignments
            let queryA = supabase.from('assignments').select('*');
            if (lastSyncedAt) queryA = queryA.gt('created_at', lastSyncedAt);
            const { data: assignments, error: errA } = await queryA;
            if (errA) throw errA;
            if (assignments && assignments.length > 0) {
                for (const a of assignments as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO assignments (id, title, description, assigned_to_id, due_date, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [a.id, a.title, a.description, a.assigned_to_id, a.due_date, a.is_completed, a.created_at]
                    );
                }
            }

            // I. Announcements - MOVED TO CLOUD ONLY (Skipping Sync)
            // AnnouncementService now fetches directly from Supabase.
            // Leaving this empty to prevent schema mismatch errors with old SQLite table.

            // J. Decision Links
            let queryDL = supabase.from('risale_decision_links').select('*');
            if (lastSyncedAt) queryDL = queryDL.gt('created_at', lastSyncedAt);
            const { data: links, error: errDL } = await queryDL;
            if (errDL) throw errDL;
            if (links && links.length > 0) {
                for (const l of links as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO risale_decision_links (id, decision_id, book_id, page_number, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                        [l.id, l.decision_id, l.book_id, l.page_number, l.note, l.created_at]
                    );
                }
            }

            // K. Risale Notes
            let queryRN = supabase.from('risale_notes').select('*');
            if (lastSyncedAt) queryRN = queryRN.gt('updated_at', lastSyncedAt);
            const { data: notes, error: errRN } = await queryRN;
            if (errRN) throw errRN;
            if (notes && notes.length > 0) {
                for (const n of notes as any[]) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO risale_notes (id, book_id, page_number, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [n.id, n.book_id, n.page_number, n.content, n.color, n.created_at, n.updated_at]
                    );
                }
            }


        } catch (error) {
            console.error('Pull failed:', error);
            throw error;
        }
    },

    // 2. PUSH: Outbox -> Cloud
    pushChanges: async () => {
        const db = await getDb();
        try {
            // Read Outbox
            const pendingParams = await db.getAllAsync<{ id: number, type: string, payload: string }>('SELECT * FROM outbox ORDER BY id ASC');

            for (const item of pendingParams) {
                const payload = JSON.parse(item.payload);

                try {
                    let error = null;

                    if (item.type === 'INSERT_TRANSACTION') {
                        const { error: err } = await supabase.from('transactions').insert(payload);
                        error = err;
                    } else if (item.type === 'INSERT_DECISION') {
                        const { error: err } = await supabase.from('decisions').insert(payload);
                        error = err;
                    } else if (item.type === 'UPDATE_HATIM_PART') {
                        const { id, ...updates } = payload;
                        const { error: err } = await supabase.from('hatim_parts').update(updates).eq('id', id);
                        error = err;
                    } else if (item.type === 'INSERT_READING_LOG') {
                        const { error: err } = await supabase.from('reading_logs').insert(payload);
                        error = err;
                    } else if (item.type === 'INSERT_CONTACT') {
                        const { error: err } = await supabase.from('contacts').insert(payload);
                        error = err;
                    } else if (item.type === 'INSERT_CONTACT_READING') {
                        const { error: err } = await supabase.from('contact_readings').insert(payload);
                        error = err;
                    } else if (item.type === 'INSERT_ASSIGNMENT') {
                        const { error: err } = await supabase.from('assignments').insert(payload);
                        error = err;
                    } else if (item.type === 'UPDATE_ASSIGNMENT') {
                        const { id, ...updates } = payload;
                        const { error: err } = await supabase.from('assignments').update(updates).eq('id', id);
                        error = err;
                    } else if (item.type === 'INSERT_ANNOUNCEMENT') {
                        const { error: err } = await supabase.from('announcements').insert(payload);
                        error = err;
                    } else if (item.type === 'INSERT_NOTE') {
                        const { error: err } = await supabase.from('risale_notes').insert(payload);
                        error = err;
                    } else if (item.type === 'INSERT_DECISION_LINK') {
                        const { error: err } = await supabase.from('risale_decision_links').insert(payload);
                        error = err;
                    }
                    // ... (previous handlers)

                    else if (item.type === 'DELETE_TRANSACTION') {
                        const { error: err } = await supabase.from('transactions').delete().eq('id', payload.id);
                        error = err;
                    } else if (item.type === 'DELETE_CONTACT') {
                        const { error: err } = await supabase.from('contacts').delete().eq('id', payload.id);
                        error = err;
                    } else if (item.type === 'DELETE_READING_LOG') {
                        const { error: err } = await supabase.from('reading_logs').delete().eq('id', payload.id);
                        error = err;
                    } else if (item.type === 'DELETE_CONTACT_READING') {
                        const { error: err } = await supabase.from('contact_readings').delete().eq('id', payload.id);
                        error = err;
                    } else if (item.type === 'DELETE_DECISION') {
                        const { error: err } = await supabase.from('decisions').delete().eq('id', payload.id);
                        error = err;
                    } else if (item.type === 'DELETE_NOTE') {
                        const { error: err } = await supabase.from('risale_notes').delete().eq('id', payload.id);
                        error = err;
                    } else if (item.type === 'DELETE_ASSIGNMENT') {
                        const { error: err } = await supabase.from('assignments').delete().eq('id', payload.id);
                        error = err;
                    }

                    // Add other types here

                    if (error) throw error;

                    // If success, remove from outbox
                    await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);

                } catch (pushError: any) {
                    // Check if this is an auto-removable error
                    const isAutoRemovable = pushError?.code?.startsWith('PGR') ||
                        pushError?.code === '23503' ||
                        pushError?.code === '22P02' ||
                        pushError?.code === '23505';

                    if (isAutoRemovable) {
                        // Use warn instead of error to prevent red error popup
                        console.warn('Auto-removing item from outbox:', item.id, pushError?.code);
                        await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);
                    } else {
                        // Real error - log it and stop
                        console.error('Push failed for item', item.id, pushError);
                        break;
                    }
                }
            }

        } catch (error) {
            console.error('Push loop failed:', error);
        }
    },

    // 3. Full Sync
    sync: async () => {

        await syncService.pushChanges();
        await syncService.pullChanges();

    }
};

// Helper to queue offline changes
export const addToOutbox = async (type: string, payload: any) => {
    const db = await getDb();
    await db.runAsync(
        'INSERT INTO outbox (type, payload) VALUES (?, ?)',
        [type, JSON.stringify(payload)]
    );
    // Try to sync immediately if online
    syncService.pushChanges().catch(() => { });
};
