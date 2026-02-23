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

        // Get current user and their vakif_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('vakif_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.vakif_id) {
            console.error('Vakif ID fetch error:', profileError);
            throw new Error('Vakıf bilgisi bulunamadı.');
        }

        // 1. Insert into Database
        const { error } = await supabase.from('announcements').insert({
            title,
            content,
            priority,
            location, // Now supported again
            target_role: targetRole,
            vakif_id: profile.vakif_id
        });

        if (error) throw error;

        // 2. Trigger Broadcast Notification (Edge Function)
        // We wrap this in a try/catch to ensure the user sees 'Success' even if push notifications fail.
        try {
            // Explicitly get session token to ensure auth header is sent
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                console.warn('Broadcast skipped: No active session');
                return;
            }

            const { error: funcError, data: funcData } = await supabase.functions.invoke('broadcast_notification', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
                body: {
                    title: priority === 'high' ? `📢 ACİL: ${title}` : `📢 ${title}`,
                    body: content,
                    target_role: targetRole,
                    data: { screen: 'Duyurular' }
                }
            });

            console.log('Broadcast result:', funcData);

            if (funcError) {
                console.warn('Broadcast function returned error (handled):', funcError);
            }
        } catch (broadcastError: any) {
            // Function invocation failed (network, 500, etc.)
            // We log it but do NOT throw, so the UI treats the Announcement add as successful.
            console.warn('Broadcast failed silently:', broadcastError);
            // Optionally, we could show a conditional alert here, but since it's a silent fail in the original intent:
            // Alert.alert('Uyarı', 'Duyuru kaydedildi ancak bildirim gönderilemedi: ' + broadcastError.message);
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

