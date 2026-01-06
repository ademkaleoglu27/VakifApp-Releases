import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDb } from '@/services/db/sqlite';
import { syncService, addToOutbox } from '@/services/syncService';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { PaymentMethod } from '@/types/accounting';
import { generateUUID } from '@/utils/uuid';

// Types
export interface Decision {
    id: string;
    title: string;
    summary: string | null;
    date: string;
    created_by: string | null;
    created_at: string;
    attachment_url?: string | null;
}

export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    currency: string;
    category: string;
    date: string;
    description?: string;
    payment_method: PaymentMethod;
    contact_id?: string;
    created_by: string | null;
    created_at: string;
}

// Hook: Read Decisions from SQLite
export const useDecisions = () => {
    return useQuery({
        queryKey: ['decisions'],
        queryFn: async () => {
            const db = await getDb();
            const result = await db.getAllAsync<Decision>('SELECT * FROM decisions ORDER BY date DESC');
            return result;
        }
    });
};

// Hook: Read Transactions from SQLite
export const useTransactions = () => {
    return useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const db = await getDb();
            const result = await db.getAllAsync<Transaction>('SELECT * FROM transactions ORDER BY date DESC');
            return result;
        }
    });
};

// Hook: Trigger Sync
export const useSync = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: syncService.sync,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decisions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        }
    });
};

// Hook: Add Transaction
export const useAddTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (transaction: any) => {
            const db = await getDb();

            // Ensure ID and timestamps
            const newId = transaction.id || generateUUID();
            const createdAt = transaction.created_at || new Date().toISOString();

            const newTx = {
                ...transaction,
                id: newId,
                created_at: createdAt
            };

            // Insert Local
            await db.runAsync(
                `INSERT INTO transactions (id, type, amount, currency, category, date, description, payment_method, contact_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [newTx.id, newTx.type, newTx.amount, newTx.currency, newTx.category, newTx.date, newTx.description, newTx.payment_method, newTx.contact_id, newTx.created_by, newTx.created_at]
            );

            // Add to Outbox
            await addToOutbox('INSERT_TRANSACTION', newTx);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            syncService.sync();
        }
    });
};

// Hook: Delete Transaction
export const useDeleteTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const db = await getDb();
            // 1. Delete Local
            if (!id) {
                // Cleanup: If ID is null/empty (from previous bug), delete all such invalid records
                console.warn('Deleting transactions with NULL ID');
                await db.runAsync('DELETE FROM transactions WHERE id IS NULL OR id = ""');
                return; // Do not sync this as it's a local cleanup
            }

            await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);

            // 2. Add to Outbox
            await addToOutbox('DELETE_TRANSACTION', { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            syncService.sync();
        }
    });
};

// Hook: Add Decision
export const useAddDecision = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (decision: any) => {
            const db = await getDb();

            // Auto-generate ID and created_at if not provided
            const newId = decision.id || generateUUID();
            const createdAt = decision.created_at || new Date().toISOString();

            const fullDecision = {
                ...decision,
                id: newId,
                created_at: createdAt,
            };

            // Insert Local
            await db.runAsync(
                `INSERT INTO decisions (id, title, summary, date, created_by, created_at, attachment_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [fullDecision.id, fullDecision.title, fullDecision.summary, fullDecision.date, fullDecision.created_by, fullDecision.created_at, fullDecision.attachment_url]
            );
            // Add to Outbox
            await addToOutbox('INSERT_DECISION', fullDecision);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decisions'] });
            syncService.sync();
        }
    });
};

// Hook: Delete Decision
export const useDeleteDecision = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const db = await getDb();
            // 1. Delete Local
            await db.runAsync('DELETE FROM decisions WHERE id = ?', [id]);

            // 2. Add to Outbox
            await addToOutbox('DELETE_DECISION', { id });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['decisions'] });
            syncService.sync();
        }
    });
};

// Hook: Get Contacts
export const useContacts = (group?: 'MESVERET' | 'SOHBET') => {
    return useQuery({
        queryKey: ['contacts', group],
        queryFn: async () => {
            return await RisaleUserDb.getContacts(group);
        }
    });
};

// Hook: Add Contact
export const useAddContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (contact: any) => {
            return await RisaleUserDb.addContact(contact);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            syncService.sync();
        }
    });
};

// Hook: Delete Contact
export const useDeleteContact = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            return await RisaleUserDb.deleteContact(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
            syncService.sync(); // Optional: Trigger sync if deletions should sync immediately (Need logic for deletion sync, typically soft delete. For now local delete is OK or handle separately)
        }
    });
};
