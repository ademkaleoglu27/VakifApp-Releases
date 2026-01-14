import { Announcement } from '@/types/announcement';
import { getSupabaseClient } from '@/services/supabaseClient';

export const announcementService = {
    getAnnouncements: async (userRole: string = 'sohbet_member'): Promise<Announcement[]> => {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        let query = supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        // If not admin, filter by role
        // Admins see everything (all, sohbet, accountant, mesveret)
        if (userRole !== 'mesveret_admin') {
            // Show if target is 'all' OR target matches the user's role
            // Syntax for .or() with checking equality on the same column for different values:
            // Actually simpler: target_role.in.("all", userRole)
            // But .or() syntax is: column.operator.value,column.operator.value
            query = query.or(`target_role.eq.all,target_role.eq.${userRole}`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching announcements:', error);
            return [];
        }

        return data.map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            date: row.created_at,
            priority: row.priority,
            location: row.location,
            isRead: false // Supabase doesn't track read status per user yet efficiently, defaulting to false or handling locally
        }));
    },

    addAnnouncement: async (title: string, content: string, priority: 'normal' | 'high', location?: string, targetRole: string = 'all') => {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase unavailable');

        // 1. Insert into Database
        const { error } = await supabase.from('announcements').insert({
            title,
            content,
            priority,
            location, // Now supported again
            target_role: targetRole
        });

        if (error) throw error;

        // 2. Trigger Broadcast Notification (Edge Function)
        // We wrap this in a try/catch to ensure the user sees 'Success' even if push notifications fail.
        try {
            const { error: funcError } = await supabase.functions.invoke('broadcast_notification', {
                body: {
                    title: priority === 'high' ? `📢 ACİL: ${title}` : `📢 ${title}`,
                    body: content,
                    target_role: targetRole,
                    data: { screen: 'Duyurular' }
                }
            });

            if (funcError) {
                console.warn('Broadcast function returned error (handled):', funcError);
            }
        } catch (broadcastError) {
            // Function invocation failed (network, 500, etc.)
            // We log it but do NOT throw, so the UI treats the Announcement add as successful.
            console.warn('Broadcast failed silently:', broadcastError);
        }
    },

    markAsRead: async (id: string): Promise<void> => {
        // Implementation for marking read in Supabase would require a separate table (user_announcements_read)
        // For now, doing nothing or we could use local storage/SQLite for "read" state cache.
        // Skipping server-side sync for read status to keep it simple for now.
    },

    deleteAnnouncement: async (id: string): Promise<void> => {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase unavailable');

        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw error;
    },
};

