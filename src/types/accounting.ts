export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string; // TRY, USD
    category: string; // Aidat, Kira, Market
    date: string; // ISO Date
    description?: string;
    // Normalized to DB columns for easier sync
    created_by: string | null; // was createdBy
    created_at: string;
    payment_method: PaymentMethod; // was paymentMethod
    contact_id?: string;
}

export interface MonthlyAccountingSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
}
