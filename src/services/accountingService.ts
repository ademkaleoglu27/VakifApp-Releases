import { Transaction, MonthlyAccountingSummary } from '@/types/accounting';
import { assertFeature } from '@/utils/guard';
import { generateUUID } from '@/utils/uuid';
import { getDb } from '@/services/db/sqlite';
import { addToOutbox } from '@/services/syncService';

export const accountingService = {
    getTransactions: async (): Promise<Transaction[]> => {
        assertFeature('ACCOUNTING_SCREEN');
        const db = await getDb();
        // Read from local mirror
        // Note: SQLite columns must match the type properties.
        // We might need to map snake_case (DB) to camelCase (Type) if we kept them different, 
        // but for simplicity in this "Offline First" approach, keeping them consistent or mapping here is needed.
        // The current types/accounting.ts was just updated to use snake_case for creation fields, 
        // but 'payment_method' was also updated. 
        // Let's assume the DB columns in sqlite.ts match these new type names.
        // sqlite.ts has: payment_method, created_by, created_at. 
        const result = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC');
        return result;
    },

    addTransaction: async (transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<void> => {
        assertFeature('ACCOUNTING_SCREEN');
        const db = await getDb();
        const newId = generateUUID();
        const createdAt = new Date().toISOString();

        const newTx: Transaction = {
            ...transaction,
            id: newId,
            created_at: createdAt,
            created_by: 'current_user',
        };

        // 1. Write to Local Mirror
        await db.runAsync(
            `INSERT INTO transactions (id, type, amount, currency, category, date, description, payment_method, contact_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newTx.id, newTx.type, newTx.amount, newTx.currency, newTx.category, newTx.date, newTx.description || null, newTx.payment_method, newTx.contact_id || null, newTx.created_by, newTx.created_at]
        );

        // 2. Add to Outbox
        await addToOutbox('INSERT_TRANSACTION', newTx);
    },

    getMonthlySummary: async (): Promise<MonthlyAccountingSummary> => {
        assertFeature('ACCOUNTING_SCREEN');
        const db = await getDb();
        // A simple aggregation in SQL
        const result = await db.getFirstAsync<{ totalIncome: number, totalExpense: number }>(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpense
            FROM transactions
        `);

        const totalIncome = result?.totalIncome || 0;
        const totalExpense = result?.totalExpense || 0;

        return {
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense
        };
    },

    deleteTransaction: async (id: string): Promise<void> => {
        assertFeature('MANAGE_ACCOUNTING');
        const db = await getDb();

        // 1. Delete from Local Mirror
        await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

        // 2. Add delete operation to Outbox for sync
        await addToOutbox('DELETE_TRANSACTION', { id });
    }
};

