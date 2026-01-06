import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RisaleUserDb } from '@/services/risaleUserDb';
import { risaleService } from '@/services/risaleService';
import { ReadingLog } from '@/types/risale';

export const useRisaleWorks = () => {
    return useQuery({
        queryKey: ['risaleWorks'],
        queryFn: risaleService.getWorks,
    });
};

export const useReadingLogs = () => {
    return useQuery({
        queryKey: ['readingLogs'],
        queryFn: risaleService.getLogs,
    });
};

export const useAddReadingLog = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: RisaleUserDb.addReadingLog.bind(RisaleUserDb),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['readingLogs'] });
            queryClient.invalidateQueries({ queryKey: ['readingStats'] });
        },
    });
};

export const useReadingStats = () => {
    return useQuery({
        queryKey: ['readingStats'],
        queryFn: risaleService.getWeeklyStats,
    });
};
