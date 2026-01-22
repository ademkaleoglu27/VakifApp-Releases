import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { assertFeature } from '@/utils/guard';
import { getDb } from './db/sqlite';
import { addToOutbox } from './syncService';
import { ReadingLog } from '@/types/risale';

import { generateUUID } from '@/utils/uuid';


export interface RisaleBookmark {
    id: string;
    book_id: string;
    page_number: number;
    created_at: string;
}

export interface RisaleNote {
    id: string;
    book_id: string;
    page_number: number;
    content: string;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface RisaleDecisionLink {
    id: string;
    decision_id: string;
    book_id: string;
    page_number: number;
    note?: string;
    created_at: string;
}

export interface Contact {
    id: string;
    name: string;
    surname: string;
    phone: string;
    address: string | null;
    group_type: 'MESVERET' | 'SOHBET';
}

export interface Decision {
    id: string;
    title: string;
    content: string;
    image_uri?: string;
    created_at: string;
    is_sent: number;
}

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    assigned_to_id: string;
    assignee_name?: string;
    assignee_surname?: string;
    due_date?: string;
    is_completed: number;
    created_at: string;
}

export const RisaleUserDb = {
    // No internal DB init needed, use getDb()

    async importImage(sourceUri: string): Promise<string> {
        const filename = sourceUri.split('/').pop();
        const dir = FileSystem.documentDirectory + 'decision_images/';
        const newPath = dir + filename;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        await FileSystem.copyAsync({ from: sourceUri, to: newPath });
        return newPath;
    },

    // --- Bookmarks ---
    async toggleBookmark(bookId: string, pageNumber: number): Promise<boolean> {
        const db = await getDb();

        const existing = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM risale_bookmarks WHERE book_id = ? AND page_number = ?',
            [bookId, pageNumber]
        );

        if (existing) {
            await db.runAsync('DELETE FROM risale_bookmarks WHERE id = ?', [existing.id]);
            return false;
        } else {
            const newId = generateUUID();
            await db.runAsync(
                'INSERT INTO risale_bookmarks (id, book_id, page_number) VALUES (?, ?, ?)',
                [newId, bookId, pageNumber]
            );
            return true;
        }
    },

    async isBookmarked(bookId: string, pageNumber: number): Promise<boolean> {
        const db = await getDb();
        const res = await db.getFirstAsync('SELECT id FROM risale_bookmarks WHERE book_id = ? AND page_number = ?', [bookId, pageNumber]);
        return !!res;
    },

    async getBookmarks(bookId?: string): Promise<RisaleBookmark[]> {
        const db = await getDb();
        if (bookId) {
            return await db.getAllAsync<RisaleBookmark>(
                'SELECT * FROM risale_bookmarks WHERE book_id = ? ORDER BY page_number ASC',
                [bookId]
            );
        }
        return await db.getAllAsync<RisaleBookmark>('SELECT * FROM risale_bookmarks ORDER BY created_at DESC');
    },

    // --- Notes ---
    async saveNote(bookId: string, pageNumber: number, content: string, color: string = '#FEF3C7') {
        const db = await getDb();
        const newId = generateUUID();
        await db.runAsync(
            'INSERT INTO risale_notes (id, book_id, page_number, content, color) VALUES (?, ?, ?, ?, ?)',
            [newId, bookId, pageNumber, content, color]
        );
    },

    async getNotes(bookId?: string): Promise<RisaleNote[]> {
        const db = await getDb();
        if (bookId) {
            return await db.getAllAsync<RisaleNote>(
                'SELECT * FROM risale_notes WHERE book_id = ? ORDER BY page_number ASC',
                [bookId]
            );
        }
        return await db.getAllAsync<RisaleNote>('SELECT * FROM risale_notes ORDER BY created_at DESC');
    },

    async deleteNote(id: string) {
        const db = await getDb();
        await db.runAsync('DELETE FROM risale_notes WHERE id = ?', [id]);
        await addToOutbox('DELETE_NOTE', { id });
    },

    // --- Decision Links ---
    async addDecisionLink(decisionId: string, bookId: string, pageNumber: number, note?: string) {
        const db = await getDb();
        const newId = generateUUID();
        await db.runAsync(
            'INSERT INTO risale_decision_links (id, decision_id, book_id, page_number, note) VALUES (?, ?, ?, ?, ?)',
            [newId, decisionId, bookId, pageNumber, note || null]
        );
        // Add to outbox (missing before?)
        await addToOutbox('INSERT_DECISION_LINK', {
            id: newId, decision_id: decisionId, book_id: bookId, page_number: pageNumber, note: note || null, created_at: new Date().toISOString()
        });
    },

    async getDecisionLinks(decisionId: string): Promise<RisaleDecisionLink[]> {
        const db = await getDb();
        return await db.getAllAsync<RisaleDecisionLink>(
            'SELECT * FROM risale_decision_links WHERE decision_id = ? ORDER BY created_at DESC',
            [decisionId]
        );
    },

    // --- Meşveret Module (Contacts) ---
    // --- Meşveret Module (Contacts) ---
    async addContact(contact: any): Promise<string> {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        const newId = contact.id || generateUUID();
        await db.runAsync(
            'INSERT INTO contacts (id, name, surname, phone, address, group_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, contact.name, contact.surname, contact.phone, contact.address, contact.group_type, contact.created_at || new Date().toISOString()]
        );

        // Sync Hook
        await addToOutbox('INSERT_CONTACT', { ...contact, id: newId, created_at: contact.created_at || new Date().toISOString() });

        return newId;
    },

    // ... (createContactForUser remains generating UUID as it is for new read tracking users)

    // ...

    async addContactNote(contactId: string, text: string, explicitId?: string, explicitCreatedAt?: string): Promise<any> {
        const db = await getDb();
        const newId = explicitId || generateUUID();
        const createdAt = explicitCreatedAt || new Date().toISOString();
        await db.runAsync(
            'INSERT INTO contact_notes (id, contact_id, text, created_at) VALUES (?, ?, ?, ?)',
            [newId, contactId, text, createdAt]
        );
        return { id: newId, text, createdAt };
    },

    // ...

    // --- Assignments ---
    async addAssignment(assignment: any): Promise<string> {
        const db = await getDb();
        const newId = assignment.id || generateUUID();
        const date = assignment.created_at || new Date().toISOString();

        await db.runAsync(
            'INSERT INTO assignments (id, title, description, assigned_to_id, created_at, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
            [newId, assignment.title, assignment.description || null, assignment.assigned_to_id, date, assignment.is_completed ? 1 : 0]
        );

        return newId;
    },

    // AUTO-CREATE contact for reading tracking (no permission needed - self registration)
    async createContactForUser(params: {
        userId: string;
        name: string;
        surname: string;
        phone: string;
        groupType: string;
    }): Promise<string> {
        const db = await getDb();
        const newId = generateUUID();
        await db.runAsync(
            'INSERT INTO contacts (id, name, surname, phone, group_type, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, params.name, params.surname, params.phone, params.groupType, params.userId, new Date().toISOString()]
        );

        // Sync Hook
        await addToOutbox('INSERT_CONTACT', {
            id: newId,
            name: params.name,
            surname: params.surname,
            phone: params.phone,
            group_type: params.groupType,
            user_id: params.userId,
            created_at: new Date().toISOString()
        });

        console.log('[RisaleUserDb] Created contact for user:', params.userId, 'contactId:', newId);
        return newId;
    },

    async getContacts(group?: 'MESVERET' | 'SOHBET'): Promise<any[]> {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        if (group) {
            return await db.getAllAsync('SELECT * FROM contacts WHERE group_type = ? ORDER BY name ASC', [group]);
        }
        return await db.getAllAsync('SELECT * FROM contacts ORDER BY name ASC');
    },

    // DETERMINISTIC: Lookup contact by user_id (not name-matching)
    // Requires contacts.user_id column from SQL migration
    async getContactByUserId(userId: string): Promise<any | null> {
        const db = await getDb();
        const contact = await db.getFirstAsync('SELECT * FROM contacts WHERE user_id = ?', [userId]);
        return contact || null;
    },

    // DEPRECATED: Keep for backward compatibility but prefer getContactByUserId
    async getContactByName(name: string): Promise<any | null> {
        const db = await getDb();
        let contact = await db.getFirstAsync('SELECT * FROM contacts WHERE name = ?', [name]);
        if (!contact) {
            contact = await db.getFirstAsync('SELECT * FROM contacts WHERE name LIKE ? OR (name || " " || surname) = ?', [`%${name}%`, name]);
        }
        return contact || null;
    },

    async deleteContact(id: string) {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        await db.runAsync('DELETE FROM contacts WHERE id = ?', [id]);
        await addToOutbox('DELETE_CONTACT', { id });
    },

    async updateContact(contact: any) {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        await db.runAsync(
            'UPDATE contacts SET name = ?, surname = ?, phone = ?, address = ?, group_type = ? WHERE id = ?',
            [contact.name, contact.surname, contact.phone, contact.address, contact.group_type, contact.id]
        );
        // Add UPDATE_CONTACT to Outbox (Need to handle in syncService)
        // For now, simpler to just allow re-insertion on sync or ignore update conflict.
        // But correct way is UDPATE.
        // But correct way is UDPATE.
    },



    async getContactNotes(contactId: string): Promise<any[]> {
        const db = await getDb();
        return await db.getAllAsync('SELECT * FROM contact_notes WHERE contact_id = ? ORDER BY created_at DESC', [contactId]);
    },

    async deleteContactNote(id: string) {
        const db = await getDb();
        await db.runAsync('DELETE FROM contact_notes WHERE id = ?', [id]);
    },

    // --- Decisions (Previously separate, now using shared logic but methods kept for compatibility) ---
    // ...

    // ...

    // --- Assignments ---


    // --- Decisions (Previously separate, now using shared logic but methods kept for compatibility) ---
    // Ideally use useAddDecision hook, but if this is used directly:
    async addDecision(decision: any): Promise<string> {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        // Assuming decision param already has ID or we generate
        const newId = decision.id || generateUUID();
        await db.runAsync(
            'INSERT INTO decisions (id, title, summary, date, category, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            // Mapping 'content' to 'summary' for consistency with sqlite.ts schema
            [newId, decision.title, decision.content, new Date().toISOString(), 'Genel', 'current_user', decision.created_at]
        );

        // Sync Hook
        await addToOutbox('INSERT_DECISION', {
            id: newId,
            title: decision.title,
            summary: decision.content,
            date: new Date().toISOString(),
            category: 'Genel',
            created_by: 'current_user',
            created_at: decision.created_at
        });

        return newId;
    },

    async getDecisions(): Promise<any[]> {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        return await db.getAllAsync('SELECT * FROM decisions ORDER BY created_at DESC');
    },

    async deleteDecision(id: string) {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        await db.runAsync('DELETE FROM decisions WHERE id = ?', [id]);
        await addToOutbox('DELETE_DECISION', { id });
    },

    // --- Leaderboard & Readings ---
    async addReadingLog(log: Omit<ReadingLog, 'id'>) {
        try {
            const db = await getDb();
            const newId = generateUUID();
            const createdAt = new Date().toISOString();



            await db.runAsync(
                'INSERT INTO reading_logs (id, user_id, book_id, pages_read, duration_minutes, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [newId, log.userId, log.workId, log.pagesRead, log.durationMinutes, log.date, createdAt]
            );

            // IMPORTANT: Send snake_case keys to outbox for Supabase compatibility
            await addToOutbox('INSERT_READING_LOG', {
                id: newId,
                user_id: log.userId,
                book_id: log.workId,
                pages_read: log.pagesRead,
                duration_minutes: log.durationMinutes,
                date: log.date,
                created_at: createdAt
            });

        } catch (error) {
            console.error('CRITICAL ERROR in addReadingLog:', error);
            throw error; // Re-throw so UI can handle it
        }
    },

    async addContactReading(contactId: string, pagesRead: number) {
        const db = await getDb();
        const newId = generateUUID();
        const date = new Date().toISOString();

        await db.runAsync(
            'INSERT INTO contact_readings (id, contact_id, pages_read, date, created_at) VALUES (?, ?, ?, ?, ?)',
            [newId, contactId, pagesRead, date, date]
        );

        // Sync Hook
        await addToOutbox('INSERT_CONTACT_READING', {
            id: newId,
            contact_id: contactId,
            pages_read: pagesRead,
            date: date,
            created_at: date
        });
    },

    // Get the last reading log for a user (for correction feature)
    async getLastReadingLog(userId: string): Promise<{ readingLog: any; contactReading: any } | null> {
        const db = await getDb();

        // Get the last reading_log entry
        const readingLog = await db.getFirstAsync<any>(
            'SELECT * FROM reading_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (!readingLog) return null;

        // Try to find the corresponding contact_reading (same date, same pages)
        const contactReading = await db.getFirstAsync<any>(
            `SELECT cr.* FROM contact_readings cr
             JOIN contacts c ON cr.contact_id = c.id
             WHERE DATE(cr.date) = DATE(?) AND cr.pages_read = ?
             ORDER BY cr.created_at DESC LIMIT 1`,
            [readingLog.date, readingLog.pages_read]
        );

        return { readingLog, contactReading };
    },

    // Update the last reading log
    async updateReadingLog(logId: string, newPages: number, contactReadingId?: string) {
        const db = await getDb();

        // Update reading_logs
        await db.runAsync(
            'UPDATE reading_logs SET pages_read = ? WHERE id = ?',
            [newPages, logId]
        );

        // Update contact_readings if exists
        if (contactReadingId) {
            await db.runAsync(
                'UPDATE contact_readings SET pages_read = ? WHERE id = ?',
                [newPages, contactReadingId]
            );
        }

        // Sync Hook
        await addToOutbox('UPDATE_READING_LOG', { id: logId, pages_read: newPages });
        if (contactReadingId) {
            await addToOutbox('UPDATE_CONTACT_READING', { id: contactReadingId, pages_read: newPages });
        }
    },

    // Delete the last reading log
    async deleteReadingLog(logId: string, contactReadingId?: string) {
        const db = await getDb();

        // Delete from reading_logs
        await db.runAsync('DELETE FROM reading_logs WHERE id = ?', [logId]);

        // Delete from contact_readings if exists
        if (contactReadingId) {
            await db.runAsync('DELETE FROM contact_readings WHERE id = ?', [contactReadingId]);
        }

        // Sync Hook
        await addToOutbox('DELETE_READING_LOG', { id: logId });
        if (contactReadingId) {
            await addToOutbox('DELETE_CONTACT_READING', { id: contactReadingId });
        }
    },

    // Get all reading logs for a user (for history screen)
    async getUserReadingHistory(userId: string): Promise<Array<{
        readingLog: any;
        contactReading: any | null;
    }>> {
        const db = await getDb();

        // Get all reading_log entries for this user
        const readingLogs = await db.getAllAsync<any>(
            'SELECT * FROM reading_logs WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        // For each reading log, try to find corresponding contact_reading
        const result = [];
        for (const log of readingLogs) {
            const contactReading = await db.getFirstAsync<any>(
                `SELECT cr.* FROM contact_readings cr
                 WHERE DATE(cr.date) = DATE(?) AND cr.pages_read = ?
                 ORDER BY cr.created_at DESC LIMIT 1`,
                [log.date, log.pages_read]
            );
            result.push({ readingLog: log, contactReading: contactReading || null });
        }

        return result;
    },

    async getLeaderboard(startDate?: string): Promise<any[]> {
        try {
            const db = await getDb();

            // 1. Fetch Raw Rows (No Grouping/Limit yet for safe merge)
            // Modified query to get user_id and phone for merging
            let query = `
                SELECT 
                    c.id, 
                    c.user_id,
                    c.name, 
                    c.surname, 
                    c.phone,
                    SUM(cr.pages_read) as total_pages 
                FROM contacts c 
                JOIN contact_readings cr ON c.id = cr.contact_id 
            `;

            const params: any[] = [];

            if (startDate) {
                query += ` WHERE cr.date >= ? `;
                params.push(startDate);
            }

            // We group by ID roughly in SQL to reduce rows, but main merge is JS
            query += ` GROUP BY c.id `;

            const rawRows = await db.getAllAsync<any>(query, params);

            // 2. JS Deduplication (Normalized Name)
            const map = new Map<string, any>();
            const normalize = (s: string) => s ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '';
            const buildDisplayName = (n: string, s: string) => `${n || ''} ${s || ''}`.trim();

            for (const row of rawRows) {
                const displayName = buildDisplayName(row.name, row.surname);
                const normName = normalize(displayName);
                const key = `N:${normName}`;

                if (map.has(key)) {
                    const existing = map.get(key);
                    existing.total_pages += row.total_pages;
                    if (!existing.user_id && row.user_id) existing.user_id = row.user_id;
                    if (!existing.phone && row.phone) existing.phone = row.phone;
                    if (row.user_id) existing.id = row.id;
                } else {
                    map.set(key, { ...row });
                }
            }

            // 3. Sort and Limit
            return Array.from(map.values())
                .sort((a, b) => b.total_pages - a.total_pages)
                .slice(0, 10);

        } catch (error) {
            console.error('Leaderboard error:', error);
            return [];
        }
    },



    async getAssignments(): Promise<any[]> {
        const db = await getDb();
        return await db.getAllAsync(`
            SELECT a.*, c.name as assignee_name, c.surname as assignee_surname 
            FROM assignments a
            LEFT JOIN contacts c ON a.assigned_to_id = c.id
            ORDER BY a.is_completed ASC, a.created_at DESC
        `);
    },

    async toggleAssignmentComplete(id: string) {
        const db = await getDb();
        const item = await db.getFirstAsync<{ is_completed: number }>('SELECT is_completed FROM assignments WHERE id = ?', [id]);
        if (item) {
            await db.runAsync('UPDATE assignments SET is_completed = ? WHERE id = ?', [item.is_completed ? 0 : 1, id]);
            // Sync? Not critical for now but should Add UPDATE_ASSIGNMENT eventually.
            await addToOutbox('UPDATE_ASSIGNMENT', { id, is_completed: item.is_completed ? 0 : 1 });
        }
    },

    async deleteAssignment(id: string) {
        const db = await getDb();
        await db.runAsync('DELETE FROM assignments WHERE id = ?', [id]);
        await addToOutbox('DELETE_ASSIGNMENT', { id });
    },

    // --- Reading Tracking ---
    async getReadingStats(period: 'weekly' | 'monthly' | 'yearly'): Promise<any[]> {
        const db = await getDb();

        let days = 7;
        if (period === 'monthly') days = 30;
        if (period === 'yearly') days = 365;

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        const dateStr = dateThreshold.toISOString();

        // 1. Fetch Raw Groups (by contact_id)
        // We select user_id to help with identity, though strictly we'll group by name for visual cleanup
        const rawRows = await db.getAllAsync<any>(`
            SELECT 
                c.id,
                c.user_id, 
                c.name, 
                c.surname,
                c.phone,
                SUM(cr.pages_read) as total_pages 
            FROM contacts c 
            JOIN contact_readings cr ON c.id = cr.contact_id 
            WHERE cr.date >= ?
            GROUP BY c.id 
        `, [dateStr]);

        // 2. JS Aggregation (Deduplication)
        const map = new Map<string, any>();
        let mergeCount = 0;

        const normalize = (s: string) => s ? s.trim().toLowerCase().replace(/\s+/g, ' ') : '';
        const buildDisplayName = (n: string, s: string) => `${n || ''} ${s || ''}`.trim();

        for (const row of rawRows) {
            const displayName = buildDisplayName(row.name, row.surname);
            const normName = normalize(displayName);

            // IDENTITY STRATEGY:
            // To ensure "Adem Kaleoğlu" appears only once, we group by Normalized Name.
            // Ideally we would use user_id, but if local contacts lack user_id (offline/manual),
            // they would split from the synced user. Name-based merging bridges this gap.
            const key = `N:${normName}`;

            if (map.has(key)) {
                mergeCount++;
                const existing = map.get(key);
                existing.total_pages += row.total_pages;

                // Merge Profile Data (Prefer rows with more info)
                if (!existing.user_id && row.user_id) existing.user_id = row.user_id;
                if (!existing.phone && row.phone) existing.phone = row.phone;
                // Keep the ID of the 'primary' contact (e.g. the one with user_id)
                if (row.user_id) existing.id = row.id;
            } else {
                map.set(key, { ...row });
            }
        }

        if (mergeCount > 0) {
            console.log(`[Leaderboard] Deduplicated ${mergeCount} rows for period ${period}.`);
        }

        // 3. Return Sorted List
        return Array.from(map.values()).sort((a, b) => b.total_pages - a.total_pages);
    },

    async getInactiveUsers(daysThreshold: number = 21): Promise<any[]> {
        const db = await getDb();

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - daysThreshold);
        const dateStr = dateThreshold.toISOString();

        // Users with NO readings at all OR max reading date is older than threshold
        return await db.getAllAsync(`
            SELECT 
                c.id, 
                c.name, 
                c.surname,
                c.phone,
                MAX(cr.date) as last_reading_date
            FROM contacts c 
            LEFT JOIN contact_readings cr ON c.id = cr.contact_id 
            GROUP BY c.id 
            HAVING last_reading_date IS NULL OR last_reading_date < ?
            ORDER BY last_reading_date ASC
        `, [dateStr]);
    },

    // --- Agenda ---
    async addAgendaItem(item: any) {
        const db = await getDb();
        const newId = generateUUID();
        await db.runAsync(
            'INSERT INTO agenda_items (id, title, description, event_date, location, type, notification_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, item.title, item.description, item.event_date, item.location, item.type, JSON.stringify(item.notification_ids || [])]
        );
        return newId;
    },

    async getAgendaItems(): Promise<any[]> {
        const db = await getDb();
        return await db.getAllAsync('SELECT * FROM agenda_items ORDER BY event_date ASC');
    },

    async deleteAgendaItem(id: string) {
        const db = await getDb();
        await db.runAsync('DELETE FROM agenda_items WHERE id = ?', [id]);
    },

    // --- Hatim & Juz Tracking ---
    async createHatim(title: string, type: 'GENERAL' | 'MONTHLY' = 'GENERAL'): Promise<string> {
        const db = await getDb();
        const hatimId = generateUUID();
        await db.runAsync(
            'INSERT INTO hatims (id, title, type, status, created_at) VALUES (?, ?, ?, ?, ?)',
            [hatimId, title, type, 'ACTIVE', new Date().toISOString()]
        );

        // Create 30 parts
        for (let i = 1; i <= 30; i++) {
            const partId = generateUUID();
            await db.runAsync(
                'INSERT INTO hatim_parts (id, hatim_id, juz_number, status) VALUES (?, ?, ?, ?)',
                [partId, hatimId, i, 'AVAILABLE']
            );
        }
        return hatimId;
    },

    async getActiveHatim(): Promise<any> {
        const db = await getDb();
        let hatim = await db.getFirstAsync<{ id: string, title: string }>('SELECT * FROM hatims WHERE status = ? ORDER BY created_at DESC', ['ACTIVE']);
        return hatim || null;
    },

    async getHatimParts(hatimId: string): Promise<any[]> {
        const db = await getDb();
        return await db.getAllAsync('SELECT * FROM hatim_parts WHERE hatim_id = ? ORDER BY juz_number ASC', [hatimId]);
    },

    async assignPart(partId: string, name: string, assignedToId?: string) {
        const db = await getDb();
        await db.runAsync(
            'UPDATE hatim_parts SET status = ?, assigned_to_name = ?, assigned_to_id = ?, updated_at = ? WHERE id = ?',
            ['TAKEN', name, assignedToId || null, new Date().toISOString(), partId]
        );

        await addToOutbox('UPDATE_HATIM_PART', {
            id: partId,
            status: 'TAKEN',
            assigned_to_name: name,
            assigned_to_id: assignedToId || null,
            updated_at: new Date().toISOString()
        });
    },

    async releasePart(partId: string) {
        const db = await getDb();
        await db.runAsync(
            'UPDATE hatim_parts SET status = ?, assigned_to_name = NULL, assigned_to_id = NULL, updated_at = ? WHERE id = ?',
            ['AVAILABLE', new Date().toISOString(), partId]
        );

        await addToOutbox('UPDATE_HATIM_PART', {
            id: partId,
            status: 'AVAILABLE',
            assigned_to_name: null,
            assigned_to_id: null,
            updated_at: new Date().toISOString()
        });
    },

    async togglePartComplete(partId: string) {
        const db = await getDb();
        const part = await db.getFirstAsync<{ status: string }>('SELECT status FROM hatim_parts WHERE id = ?', [partId]);
        if (part) {
            const newStatus = part.status === 'COMPLETED' ? 'TAKEN' : 'COMPLETED';
            await db.runAsync(
                'UPDATE hatim_parts SET status = ?, updated_at = ? WHERE id = ?',
                [newStatus, new Date().toISOString(), partId]
            );

            await addToOutbox('UPDATE_HATIM_PART', {
                id: partId,
                status: newStatus,
                updated_at: new Date().toISOString()
            });
        }
    },

    // --- Announcements ---
    async addAnnouncement(title: string, content: string, priority: 'normal' | 'high', location?: string) {
        const db = await getDb();
        const newId = generateUUID();
        await db.runAsync(
            'INSERT INTO announcements (id, title, content, priority, location, date) VALUES (?, ?, ?, ?, ?, ?)',
            [newId, title, content, priority, location || null, new Date().toISOString()]
        );
    },

    async getAnnouncements(): Promise<any[]> {
        const db = await getDb();
        return await db.getAllAsync('SELECT * FROM announcements ORDER BY date DESC');
    },

    async markAnnouncementRead(id: string) {
        const db = await getDb();
        await db.runAsync('UPDATE announcements SET is_read = 1 WHERE id = ?', [id]);
    },

    async deleteAnnouncement(id: string) {
        const db = await getDb();
        await db.runAsync('DELETE FROM announcements WHERE id = ?', [id]);
    },

    // --- Cleanup ---
    async cleanupDummies() {
        // Safe to call, removes known dummy names
        const db = await getDb();
        const dummyNames = ['Ahmet', 'Mehmet', 'Ali', 'Veli', 'Hasan', 'Hüseyin'];
        // Filter by common dummy surnames if needed, but these are generic enough to risk?
        // Let's be specific with surnames from the old seeder if possible, or just delete by name if they are clearly dummies.
        // Old seeder: Yılmaz, Demir, Kaya, Çelik, Can, Ak

        // Let's use a safer approach: Delete contacts where created_at is strictly older than 'real usage' OR created by seed script? 
        // Seed script didn't set specific ID.

        // Deleting by exact name/surname pairs from the known dummy list
        await db.runAsync(`
            DELETE FROM contacts 
            WHERE (name = 'Ahmet' AND surname = 'Yılmaz')
               OR (name = 'Mehmet' AND surname = 'Demir')
               OR (name = 'Ali' AND surname = 'Kaya')
               OR (name = 'Veli' AND surname = 'Çelik')
               OR (name = 'Hasan' AND surname = 'Can')
               OR (name = 'Hüseyin' AND surname = 'Ak')
        `);
    },

    // --- History ---
    async saveHistory(bookId: string, pageNumber: number) {
        // For now, this is a placeholder or can alias to saving a "last read" marker separate from sync progress
        // Currently we rely on 'reading_logs' for analytics, this could be for 'recent books' list
        // Let's implement a simple Local Preference for "Recent Books"
        try {
            const db = await getDb();
            // Upsert recent history? Or just log?
            // For now, we'll logging to console as placeholder for analytics
            console.log(`[History] User read ${bookId} page ${pageNumber}`);
        } catch (e) {
            console.warn("Failed to save history", e);
        }
    }
};

