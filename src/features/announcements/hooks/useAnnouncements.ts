import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementService } from '@/services/announcementService';
import { useAuthStore } from '@/store/authStore';

export const useAnnouncements = () => {
    const { user } = useAuthStore();
    const role = user?.role || 'sohbet_member';

    return useQuery({
        queryKey: ['announcements', role],
        queryFn: () => announcementService.getAnnouncements(role),
    });
};

export const useMarkAssignmentAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: announcementService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
    });
};

export const useDeleteAnnouncement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: announcementService.deleteAnnouncement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['announcements'] });
        },
    });
};
