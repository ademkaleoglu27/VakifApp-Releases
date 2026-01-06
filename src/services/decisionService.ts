import { Decision } from '@/types/decision';
import { getDb } from '@/services/db/sqlite';
import { addToOutbox, syncService } from '@/services/syncService';

import { generateUUID } from '@/utils/uuid';

export const decisionService = {
    getDecisions: async (): Promise<Decision[]> => {
        const db = await getDb();
        // Read from local mirror
        const result = await db.getAllAsync<Decision>('SELECT * FROM decisions ORDER BY date DESC');
        return result;
    },

    addDecision: async (decision: Omit<Decision, 'id' | 'created_at'>): Promise<void> => {
        const db = await getDb();
        const newId = generateUUID();
        const createdAt = new Date().toISOString();

        const newDecision: Decision = {
            ...decision,
            id: newId,
            created_at: createdAt,
            created_by: 'current_user', // TODO: Get actual user ID
        };

        // 1. Write to Local Mirror
        await db.runAsync(
            `INSERT INTO decisions (id, title, summary, date, category, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newDecision.id, newDecision.title, newDecision.summary, newDecision.date, newDecision.category, newDecision.created_by, newDecision.created_at]
        );

        // 2. Add to Outbox for Sync
        await addToOutbox('INSERT_DECISION', newDecision);
    }
};

