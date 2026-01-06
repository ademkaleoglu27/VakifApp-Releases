import { useQuery } from '@tanstack/react-query';
import { decisionService } from '@/services/decisionService';

export const useDecisions = () => {
    return useQuery({
        queryKey: ['decisions'],
        queryFn: decisionService.getDecisions,
    });
};
