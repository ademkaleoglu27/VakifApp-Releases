import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { juzService } from '@/services/juzService';
import { JuzAssignment } from '@/types/juz';

export const useMyAssignments = () => {
    return useQuery({
        queryKey: ['myAssignments'],
        queryFn: juzService.getMyAssignments,
    });
};

export const useCompleteJuz = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: juzService.completeJuz,
        onSuccess: () => {
            // Listeyi güncellemek için cache'i invalidate et
            queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
        },
    });
};
