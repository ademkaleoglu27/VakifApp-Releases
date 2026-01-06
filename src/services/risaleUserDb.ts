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
    async addContact(contact: any): Promise<string> {
        assertFeature('MESVERET_SCREEN');
        const db = await getDb();
        const newId = generateUUID();
        await db.runAsync(
            'INSERT INTO contacts (id, name, surname, phone, address, group_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [newId, contact.name, contact.surname, contact.phone, contact.address, contact.group_type, new Date().toISOString()]
        );

        // Sync Hook
        await addToOutbox('INSERT_CONTACT', { ...contact, id: newId, created_at: new Date().toISOString() });

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

    // New: Safe lookup for linking readings without full permission
    async getContactByName(name: string): Promise<any | null> {
        // No assertFeature needed here as it's a specific lookup for self
        const db = await getDb();
        // Try exact match first
        let contact = await db.getFirstAsync('SELECT * FROM contacts WHERE name = ?', [name]);

        if (!contact) {
            // Try fuzzy match or name+surname
            // Since we store name and surname separately, and user.name might be combined
            // We just try to see if any contact with name match exists
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
    },

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

            let query = `
                SELECT 
                    c.id, 
                    c.name, 
                    c.surname, 
                    SUM(cr.pages_read) as total_pages 
                FROM contacts c 
                JOIN contact_readings cr ON c.id = cr.contact_id 
            `;

            const params: any[] = [];

            if (startDate) {
                query += ` WHERE cr.date >= ? `;
                params.push(startDate);
            }

            query += `
                GROUP BY c.id 
                ORDER BY total_pages DESC
                LIMIT 10
            `;

            const result = await db.getAllAsync(query, params);

            return result;
        } catch (error) {
            console.error('Leaderboard error:', error);
            return [];
        }
    },

    // --- Assignments ---
    async addAssignment(assignment: any) {
        const db = await getDb();
        const newId = generateUUID();
        const date = new Date().toISOString();

        await db.runAsync(
            'INSERT INTO assignments (id, title, description, assigned_to_id, created_at, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
            [newId, assignment.title, assignment.description || null, assignment.assigned_to_id, date, 0]
        );

        await addToOutbox('INSERT_ASSIGNMENT', { ...assignment, id: newId, created_at: date });
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

        return await db.getAllAsync(`
            SELECT 
                c.id, 
                c.name, 
                c.surname,
                c.phone,
                SUM(cr.pages_read) as total_pages 
            FROM contacts c 
            JOIN contact_readings cr ON c.id = cr.contact_id 
            WHERE cr.date >= ?
            GROUP BY c.id 
            ORDER BY total_pages DESC
        `, [dateStr]);
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
    }
};

