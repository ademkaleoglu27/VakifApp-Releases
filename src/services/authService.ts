import { User, Role } from '@/types/auth';
import { getSupabaseClient } from '@/services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_USER_KEY = '@vakifapp_offline_user_profile';

export const authService = {
    register: async (email: string, password: string, name: string, vakifCode?: string): Promise<{ user: User; token: string }> => {
        try {
            const supabase = getSupabaseClient();
            if (supabase) {
                try {
                    // 1. Sign up with Supabase
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                name: name,
                                vakif_code: vakifCode
                            }
                        }
                    });

                    if (!authError && authData?.user) {
                        await new Promise(r => setTimeout(r, 1000));
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', authData.user.id)
                            .single();

                        const role: Role = (profileData?.role as Role) || 'mesveret_admin';
                        const group = 'MEŞVERET HEYETİ';

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

                        await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));

                        return {
                            user,
                            token: authData.session?.access_token || 'online_token_' + Date.now(),
                        };
                    }
                } catch (supErr) {
                    console.warn('[AuthService] Supabase register skipped/failed, using local mode:', supErr);
                }
            }

            // --- Offline / Local Registration Fallback ---
            const localUser: User = {
                id: 'local_usr_' + Date.now(),
                email: email,
                name: name || email.split('@')[0] || 'Kullanıcı',
                role: 'mesveret_admin', // Tam yetki
                group: 'MEŞVERET HEYETİ',
                avatarUrl: 'https://i.pravatar.cc/150?u=' + email,
            };

            await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(localUser));

            // Set Vakif Store Context
            require('@/store/vakifStore').useVakifStore.getState().setVakif({
                id: 'local_vakif_1',
                name: 'Nur Mektebi Vakfı',
                slug: 'nur-mektebi'
            });

            return {
                user: localUser,
                token: 'offline_token_' + Date.now(),
            };
        } catch (error: any) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
        try {
            const supabase = getSupabaseClient();
            if (supabase) {
                try {
                    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });

                    if (!authError && authData?.user) {
                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', authData.user.id)
                            .single();

                        const role: Role = (profileData?.role as Role) || 'mesveret_admin';
                        const group = 'MEŞVERET HEYETİ';

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
                            name: profileData?.display_name || authData.user.email?.split('@')[0] || 'Üye',
                            role,
                            group,
                            avatarUrl: 'https://i.pravatar.cc/150?u=' + authData.user.id,
                        };

                        await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(user));

                        return {
                            user,
                            token: authData.session?.access_token || 'online_token_' + Date.now(),
                        };
                    }
                } catch (supErr) {
                    console.warn('[AuthService] Supabase login skipped/failed, using local offline mode:', supErr);
                }
            }

            // --- Offline / Local Login Fallback ---
            let localUser: User;
            const savedProfile = await AsyncStorage.getItem(OFFLINE_USER_KEY);
            if (savedProfile) {
                try {
                    const parsed = JSON.parse(savedProfile);
                    localUser = {
                        ...parsed,
                        email: email,
                        name: parsed.name || email.split('@')[0] || 'Kullanıcı',
                        role: 'mesveret_admin',
                        group: 'MEŞVERET HEYETİ',
                    };
                } catch {
                    localUser = {
                        id: 'local_usr_' + Date.now(),
                        email: email,
                        name: email.split('@')[0] || 'Kullanıcı',
                        role: 'mesveret_admin',
                        group: 'MEŞVERET HEYETİ',
                        avatarUrl: 'https://i.pravatar.cc/150?u=' + email,
                    };
                }
            } else {
                localUser = {
                    id: 'local_usr_' + Date.now(),
                    email: email,
                    name: email.split('@')[0] || 'Kullanıcı',
                    role: 'mesveret_admin',
                    group: 'MEŞVERET HEYETİ',
                    avatarUrl: 'https://i.pravatar.cc/150?u=' + email,
                };
            }

            await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(localUser));

            // Set Vakif Context
            require('@/store/vakifStore').useVakifStore.getState().setVakif({
                id: 'local_vakif_1',
                name: 'Nur Mektebi Vakfı',
                slug: 'nur-mektebi'
            });

            return {
                user: localUser,
                token: 'offline_token_' + Date.now(),
            };
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        }
    },

    logout: async (): Promise<void> => {
        try {
            require('@/store/vakifStore').useVakifStore.getState().clear();
            const { featureFlagService } = require('@/services/featureFlagService');
            featureFlagService.stopAppStateListener();
            featureFlagService.clearFlags();

            const supabase = getSupabaseClient();
            if (supabase) {
                await supabase.auth.signOut().catch(() => {});
            }
        } catch (e) {
            console.warn('Logout warning:', e);
        }
    },

    getUser: async (): Promise<User | null> => {
        try {
            const supabase = getSupabaseClient();
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    const role: Role = (profile?.role as Role) || 'mesveret_admin';
                    const group = 'MEŞVERET HEYETİ';

                    return {
                        id: session.user.id,
                        email: session.user.email || '',
                        name: profile?.display_name || 'Üye',
                        role,
                        group,
                        avatarUrl: 'https://i.pravatar.cc/150?u=' + session.user.id,
                    };
                }
            }

            const saved = await AsyncStorage.getItem(OFFLINE_USER_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
            return null;
        } catch {
            return null;
        }
    },
};
