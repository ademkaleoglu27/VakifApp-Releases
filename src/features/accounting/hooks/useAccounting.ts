import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingService } from '@/services/accountingService';
import { Transaction } from '@/types/accounting';

export const useTransactions = () => {
    return useQuery({
        queryKey: ['transactions'],
        queryFn: accountingService.getTransactions,
    });
};

export const useAccountingSummary = () => {
    return useQuery({
        queryKey: ['accountingSummary'],
        queryFn: accountingService.getMonthlySummary,
    });
};

export const useAddTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: accountingService.addTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['accountingSummary'] });
        },
    });
};
