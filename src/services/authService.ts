import { User, Role } from '@/types/auth';
import { supabase } from '@/services/supabaseClient';
import { Alert } from 'react-native';

// Removed MOCK_USER and WAIT_TIME

export const authService = {
    register: async (email: string, password: string, name: string): Promise<{ user: User; token: string }> => {
        try {
            // 1. Sign up with Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name, // Metadata
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Kullanıcı oluşturulamadı.');

            // 2. Create Profile (if trigger doesn't exist, we do it manually)
            // It's safer to upsert just in case trigger exists
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    display_name: name,
                    role: 'sohbet_member' // Default role
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Continue, as user exists in Auth
            }

            // 3. Create Contact for Leaderboard Linking
            // We need to add this user to 'contacts' table too so they can be tracked in 'Weekly Reading'
            // We'll use a server-side function ideally, but here we can try client-side if policy allows.
            // If fail, we just log.
            try {
                // Check if contact exists? Unlikely for new user.
                const { error: contactError } = await supabase
                    .from('contacts')
                    .insert({
                        // using user id as contact id if possible, otherwise UUID
                        // BUT contact IDs are usually UUIDs. 
                        // Ideally we link contact -> user_id, but schema might not have it.
                        // For now, insert Name/Surname.
                        name: name,
                        surname: '', // Or split name
                        phone: '',
                        group_type: 'SOHBET'
                    });

                if (contactError) console.warn('Contact auto-create failed:', contactError);
            } catch (e) {
                console.warn('Contact create exception', e);
            }

            const user: User = {
                id: authData.user.id,
                email: authData.user.email || email,
                name: name,
                role: 'sohbet_member',
                group: 'SOHBET HEYETİ',
                avatarUrl: 'https://i.pravatar.cc/150?u=' + authData.user.id,
            };

            return {
                user,
                token: authData.session?.access_token || '',
            };

        } catch (error: any) {
            console.error('Registration failed', error);
            throw error;
        }
    },

    login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
        try {
            // 1. Sign in with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No user data returned');

            // 2. Fetch User Profile for Role
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) {
                console.warn('Profile fetch error (using default member)', profileError);
            }

            // Map Supabase User to App User
            const role: Role = (profileData?.role as Role) || 'sohbet_member';
            const group = role === 'mesveret_admin' || role === 'accountant' ? 'MEŞVERET HEYETİ' : 'SOHBET HEYETİ';

            const user: User = {
                id: authData.user.id,
                email: authData.user.email || email,
                name: profileData?.display_name || authData.user.email?.split('@')[0] || 'Üye',
                role,
                group,
                avatarUrl: 'https://i.pravatar.cc/150?u=' + authData.user.id,
            };

            return {
                user,
                token: authData.session?.access_token || '',
            };
        } catch (error: any) {
            console.error('Login failed', error);
            // Fallback for offline/demo if needed, but strict mode requested
            throw error;
        }
    },

    logout: async (): Promise<void> => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    getUser: async (): Promise<User | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        // Fetch profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        const role: Role = (profile?.role as Role) || 'sohbet_member';
        const group = role === 'mesveret_admin' || role === 'accountant' ? 'MEŞVERET HEYETİ' : 'SOHBET HEYETİ';

        return {
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.display_name || 'Üye',
            role,
            group,
            avatarUrl: 'https://i.pravatar.cc/150?u=' + session.user.id,
        };
    },
};
