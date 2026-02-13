import { User, Role } from '@/types/auth';
import { getSupabaseClient } from '@/services/supabaseClient';
import { Alert } from 'react-native';

// Removed MOCK_USER and WAIT_TIME

export const authService = {
    register: async (email: string, password: string, name: string, vakifCode?: string): Promise<{ user: User; token: string }> => {
        try {
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase client not initialized (Env invalid).');

            // 1. Sign up with Supabase
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name, // Metadata
                        vakif_code: vakifCode // Multi-Tenant Code
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Kullanıcı oluşturulamadı.');

            // 2. Create Profile (Handled by DB Trigger)
            // We do NOT manually insert/upsert here to avoid RLS conflicts.
            // The trigger 'handle_new_user' guarantees profile creation.

            // 3. Wait for Trigger & Fetch Profile
            // The DB trigger 'handle_new_user' assigns the role/vakif. We need to fetch it.
            await new Promise(r => setTimeout(r, 1000)); // 1s delay for trigger propagation

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) {
                console.warn('Register-time profile fetch failed, defaulting to guest', profileError);
                // Fallback if fetch fails
                return {
                    user: {
                        id: authData.user.id,
                        email: authData.user.email || email,
                        name: name,
                        role: 'guest',
                        group: 'MİSAFİR',
                        avatarUrl: 'https://i.pravatar.cc/150?u=' + authData.user.id,
                    },
                    token: authData.session?.access_token || '',
                };
            }

            // Map DB Profile to App User
            const role: Role = (profileData?.role as Role) || 'sohbet_member';
            const group = (role === 'mesveret_admin' || role === 'accountant' || role === 'platform_admin')
                ? 'MEŞVERET HEYETİ'
                : 'SOHBET HEYETİ';

            // Set Context
            if (profileData?.vakif_id) {
                require('@/store/vakifStore').useVakifStore.getState().setVakif({
                    id: profileData.vakif_id,
                    name: 'Vakfım',
                    slug: 'current-vakif'
                });
            }

            const user: User = {
                id: authData.user.id,
                email: authData.user.email || email,
                name: profileData?.display_name || name,
                role,
                group,
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
            const supabase = getSupabaseClient();
            if (!supabase) throw new Error('Supabase client not initialized.');

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
            const group = (role === 'mesveret_admin' || role === 'accountant' || role === 'platform_admin')
                ? 'MEŞVERET HEYETİ'
                : 'SOHBET HEYETİ';

            // MULTI-TENANT: Set Global Vakif Context
            if (profileData?.vakif_id) {
                // We'd ideally fetch vakif name too, but for now ID is enough for logic
                require('@/store/vakifStore').useVakifStore.getState().setVakif({
                    id: profileData.vakif_id,
                    name: 'Vakfım',
                    slug: 'current-vakif'
                });
            }

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
        // Clear Vakif Context
        require('@/store/vakifStore').useVakifStore.getState().clear();

        const supabase = getSupabaseClient();
        if (!supabase) return; // already out effectively

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    getUser: async (): Promise<User | null> => {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

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

        // MULTI-TENANT: Restore Vakif Context
        if (profile?.vakif_id) {
            require('@/store/vakifStore').useVakifStore.getState().setVakif({
                id: profile.vakif_id,
                name: 'Vakfım', // Ideally fetch from DB, but this suffices for logic
                slug: 'current-vakif'
            });
        }

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
