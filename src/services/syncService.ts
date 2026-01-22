import { getSupabaseClient } from '@/services/supabaseClient';
import { getDb, getLastSyncedAt, setLastSyncedAt } from '@/services/db/sqlite';
import { NetInfoState, useNetInfo } from '@react-native-community/netinfo'; // Or simple check
import { Alert } from 'react-native';

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
            let skippedCount = 0;

            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Sync failed: Supabase client not initialized.');

            // A. Decisions
            let queryD = supabase.from('decisions').select('*');
            if (lastSyncedAt) queryD = queryD.gt('created_at', lastSyncedAt);

            const { data: decisions, error: errD } = await queryD;
            if (errD) throw errD;

            if (decisions && decisions.length > 0) {
                for (const d of decisions as Decision[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO decisions (id, title, summary, date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                            [d.id, d.title || 'Adsız Karar', d.summary, d.date || new Date().toISOString(), d.created_by, d.created_at]
                        );
                    } catch (rowError) {
                        console.warn('[Sync] Skip Decision row:', d.id, rowError);
                        skippedCount++;
                    }
                }
            }

            // B. Transactions (Role-Based Access Control)
            let userRole: string | undefined;
            try {
                userRole = require('@/store/authStore').useAuthStore.getState().user?.role;
            } catch (e) { console.warn('Auth store access failed', e); }

            const canViewDetails = userRole ? require('@/config/permissions').canAccess(userRole, 'VIEW_ACCOUNTING_DETAILS') : false;

            if (!canViewDetails) {
                // RESTRICTED VIEW: Do not fetch transaction details.
                // TODO: Fetch Summary RPC when available on server.
                // await supabase.rpc('get_finance_summary', ...);
                console.log('[Sync] Restricted user (Meşveret): Skipping detailed transaction pull for privacy.');
            } else {
                let queryT = supabase.from('transactions').select('*');
                if (lastSyncedAt) queryT = queryT.gt('created_at', lastSyncedAt);

                const { data: transactions, error: errT } = await queryT;
                if (errT) throw errT;

                if (transactions && transactions.length > 0) {
                    for (const t of transactions as any[]) {
                        try {
                            // SANITIZE: Prevent NOT NULL crashes
                            if (t.amount === undefined || t.amount === null) {
                                console.warn('[Sync] Skip Transaction (Missing Amount):', t.id);
                                skippedCount++;
                                continue;
                            }
                            if (!t.type) {
                                console.warn('[Sync] Skip Transaction (Missing Type):', t.id);
                                skippedCount++;
                                continue;
                            }

                            // Robust Date Fallback
                            const safeDate = t.date
                                ? t.date
                                : (t.created_at ? t.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));

                            await db.runAsync(
                                `INSERT OR REPLACE INTO transactions (id, type, amount, currency, category, date, description, payment_method, contact_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    t.id,
                                    t.type,
                                    t.amount,
                                    t.currency || 'TRY',
                                    t.category || 'Genel',
                                    safeDate,
                                    t.description,
                                    t.payment_method || 'CASH',
                                    t.contact_id,
                                    t.created_by,
                                    t.created_at
                                ]
                            );
                        } catch (rowError) {
                            console.warn('[Sync] Skip Transaction row:', t.id, rowError);
                            skippedCount++;
                        }
                    }
                }
            }

            // C. Hatims
            let queryH = supabase.from('hatims').select('*');
            if (lastSyncedAt) queryH = queryH.gt('created_at', lastSyncedAt);
            const { data: hatims, error: errH } = await queryH;
            if (errH) throw errH;
            if (hatims && hatims.length > 0) {
                for (const h of hatims as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO hatims (id, title, target_date, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                            [h.id, h.title, h.target_date, h.status, h.created_by, h.created_at]
                        );
                    } catch (e) { console.warn('Skip Hatim:', h.id); }
                }
            }

            // D. Hatim Parts
            let queryHP = supabase.from('hatim_parts').select('*');
            if (lastSyncedAt) queryHP = queryHP.gt('updated_at', lastSyncedAt);
            const { data: parts, error: errHP } = await queryHP;
            if (errHP) throw errHP;
            if (parts && parts.length > 0) {
                for (const p of parts as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO hatim_parts (id, hatim_id, juz_number, status, assigned_to_name, assigned_to_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [p.id, p.hatim_id, p.juz_number, p.status, p.assigned_to_name, p.assigned_to_id, p.updated_at]
                        );
                    } catch (e) { console.warn('Skip HatimPart:', p.id); }
                }
            }

            // E. Reading Logs
            let queryRL = supabase.from('reading_logs').select('*');
            if (lastSyncedAt) queryRL = queryRL.gt('created_at', lastSyncedAt);
            const { data: logs, error: errRL } = await queryRL;
            if (errRL) throw errRL;
            if (logs && logs.length > 0) {
                for (const l of logs as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO reading_logs (id, user_id, book_id, pages_read, duration_minutes, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [l.id, l.user_id, l.book_id, l.pages_read, l.duration_minutes, l.date, l.created_at]
                        );
                    } catch (e) { console.warn('Skip ReadingLog:', l.id); }
                }
            }

            // F. Contacts
            let queryC = supabase.from('contacts').select('*');
            if (lastSyncedAt) queryC = queryC.gt('created_at', lastSyncedAt);
            const { data: contacts, error: errC } = await queryC;
            if (errC) throw errC;
            if (contacts && contacts.length > 0) {
                for (const c of contacts as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO contacts (id, name, surname, phone, address, group_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [c.id, c.name, c.surname, c.phone, c.address, c.group_type, c.created_at]
                        );
                    } catch (e) { console.warn('Skip Contact:', c.id); }
                }
            }

            // G. Contact Readings
            let queryCR = supabase.from('contact_readings').select('*');
            if (lastSyncedAt) queryCR = queryCR.gt('created_at', lastSyncedAt);
            const { data: readings, error: errCR } = await queryCR;
            if (errCR) throw errCR;
            if (readings && readings.length > 0) {
                for (const r of readings as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO contact_readings (id, contact_id, pages_read, date, created_at) VALUES (?, ?, ?, ?, ?)`,
                            [r.id, r.contact_id, r.pages_read, r.date, r.created_at]
                        );
                    } catch (e) { console.warn('Skip ContactReading:', r.id); }
                }
            }

            // H. Assignments
            let queryA = supabase.from('assignments').select('*');
            if (lastSyncedAt) queryA = queryA.gt('created_at', lastSyncedAt);
            const { data: assignments, error: errA } = await queryA;
            if (errA) throw errA;
            if (assignments && assignments.length > 0) {
                for (const a of assignments as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO assignments (id, title, description, assigned_to_id, due_date, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [a.id, a.title, a.description, a.assigned_to_id, a.due_date, a.is_completed, a.created_at]
                        );
                    } catch (e) { console.warn('Skip Assignment:', a.id); }
                }
            }

            // I. Decision Links
            let queryDL = supabase.from('risale_decision_links').select('*');
            if (lastSyncedAt) queryDL = queryDL.gt('created_at', lastSyncedAt);
            const { data: links, error: errDL } = await queryDL;
            if (errDL) throw errDL;
            if (links && links.length > 0) {
                for (const l of links as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO risale_decision_links (id, decision_id, book_id, page_number, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                            [l.id, l.decision_id, l.book_id, l.page_number, l.note, l.created_at]
                        );
                    } catch (e) { console.warn('Skip Link:', l.id); }
                }
            }

            // K. Risale Notes
            let queryRN = supabase.from('risale_notes').select('*');
            if (lastSyncedAt) queryRN = queryRN.gt('updated_at', lastSyncedAt);
            const { data: notes, error: errRN } = await queryRN;
            if (errRN) throw errRN;
            if (notes && notes.length > 0) {
                for (const n of notes as any[]) {
                    try {
                        await db.runAsync(
                            `INSERT OR REPLACE INTO risale_notes (id, book_id, page_number, content, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [n.id, n.book_id, n.page_number, n.content, n.color, n.created_at, n.updated_at]
                        );
                    } catch (e) { console.warn('Skip Note:', n.id); }
                }
            }

            // Update Sync Timestamp - ONLY AFTER ALL SUCCESS
            await setLastSyncedAt(new Date().toISOString());

            if (skippedCount > 0) {
                console.warn(`[SyncService] Completed with ${skippedCount} skipped rows.`);
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
            const supabase = getSupabaseClient();
            if (!supabase) {
                console.warn('Push skipped: Supabase client missing.');
                return;
            }

            // Get Current Tenant ID (Safe Access)
            let currentVakifId: string | null = null;
            try {
                // Dynamic require to ensure store is initialized
                const vakifStore = require('@/store/vakifStore');
                // Prefer direct state access if available, fallback to helper
                if (vakifStore.useVakifStore) {
                    currentVakifId = vakifStore.useVakifStore.getState().currentVakif?.id || null;
                } else if (vakifStore.getCurrentVakifId) {
                    currentVakifId = vakifStore.getCurrentVakifId();
                }
            } catch (e) {
                console.warn('[SyncService] Failed to get vakif context:', e);
            }

            // Read Outbox
            const pendingParams = await db.getAllAsync<{ id: number, type: string, payload: string }>('SELECT * FROM outbox ORDER BY id ASC');

            for (const item of pendingParams) {
                const payload = JSON.parse(item.payload);

                // --- 1. ROBUST VAKIF_ID INJECTION ---
                // All INSERT_ types need vakif_id (including reading_logs)
                const isTenantScoped = item.type.startsWith('INSERT_');

                if (isTenantScoped) {
                    // 1. Try Payload
                    if (!payload.vakif_id) {
                        payload.vakif_id = currentVakifId;
                    }

                    // 2. Try Fetching from Server (Self-Repair)
                    if (!payload.vakif_id) {
                        try {
                            console.log('[SyncService] Missing vakif_id for upload, fetching user profile...');
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                                const { data: profile } = await supabase
                                    .from('profiles')
                                    .select('vakif_id')
                                    .eq('id', user.id)
                                    .single();

                                if (profile?.vakif_id) {
                                    payload.vakif_id = profile.vakif_id;
                                    // Optionally update store or local cache here if we could
                                    currentVakifId = profile.vakif_id;
                                }
                            }
                        } catch (fetchErr) {
                            console.warn('[SyncService] Failed to fetch profile for vakif_id correction:', fetchErr);
                        }
                    }

                    // 3. Fallback (Single Tenant Default)
                    if (!payload.vakif_id) {
                        const DEFAULT_VAKIF_ID = '00000000-0000-0000-0000-000000000001';
                        console.warn('[SyncService] Still missing vakif_id, using fallback:', DEFAULT_VAKIF_ID);
                        payload.vakif_id = DEFAULT_VAKIF_ID;
                    }

                    // CRITICAL CHECK
                    if (!payload.vakif_id) {
                        console.error('[SyncService] FATAL: Could not determine vakif_id for item:', item.id);
                        await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);
                        continue;
                    }
                }

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

                    // Deletions 
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

                    if (error) throw error;

                    // If success, remove from outbox
                    await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);

                } catch (pushError: any) {

                    // --- 2. ROBUST ERROR PARSING & SAFE REMOVAL ---
                    const errorCode = String(pushError?.code ?? pushError?.error?.code ?? '');

                    const isFormatError = errorCode === '22P02';
                    const isDuplicateError = errorCode === '23505';
                    const isNotNullError = errorCode === '23502'; // Missing Required Field
                    const isForeignKeyError = errorCode === '23503'; // Orphaned data

                    if (isFormatError || isDuplicateError || isNotNullError || isForeignKeyError) {
                        console.warn(`[SyncService] Auto-removing fatal item (Code: ${errorCode}):`, item.id);
                        await db.runAsync('DELETE FROM outbox WHERE id = ?', [item.id]);
                    } else {
                        // Regular network/server error - Retry silently or with warning
                        // Downgrading to WARN to stop LogBox spam
                        console.warn(`[SyncService] Push retry pending for item ${item.id}:`, pushError?.message || pushError);

                        // DEBUG: Notify user of logic errors
                        if (pushError?.message?.includes('violates row-level security') || pushError?.code === '42501') {
                            Alert.alert('Senkronizasyon Hatası', 'Veri gönderme izniniz reddedildi. Lütfen RLS scriptini çalıştırdığınızdan emin olun.');
                        } else if (pushError?.code === '23503') {
                            Alert.alert('Veri Hatası', 'Bağlı olduğunuz Vakıf bilgisi sunucuda bulunamadı. Lütfen yöneticinizle iletişime geçin.');
                        }

                        break; // Stop queue processing, retry later
                    }
                }
            }

        } catch (error) {
            console.error('Push loop critical failure:', error);
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
