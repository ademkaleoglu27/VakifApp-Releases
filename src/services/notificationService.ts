import { supabase } from './supabaseClient';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const notificationService = {

    registerForPushNotificationsAsync: async (): Promise<string | undefined> => {
        let token;

        // GRACEFUL DEGRADE: If Firebase is not initialized (e.g. dev client without google-services.json),
        // capturing the token might fail with "Default FirebaseApp is not initialized".
        // Prod Setup Note: Ensure google-services.json is present and EAS build includes it.
        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    console.log('Failed to get push token for push notification!');
                    return undefined;
                }

                // Try to get Device Push Token (FCM)
                // This will fail if Firebase is not correctly configured in native code
                try {
                    const tokenData = await Notifications.getDevicePushTokenAsync();
                    token = tokenData.data;
                } catch (e) {
                    console.warn("[Notification] FCM token fetch failed (Dev mode?):", e);
                    // attempt fallback or just proceed without token
                    // const expoToken = await Notifications.getExpoPushTokenAsync();
                    // token = expoToken.data;
                    return undefined;
                }
            } else {
                console.log('Must use physical device for Push Notifications');
                return undefined;
            }

            if (token) {
                await notificationService.syncToken(token);
                return token;
            }

        } catch (error) {
            console.warn('[Notification] Push setup failed gracefully:', error);
            return undefined;
        }
        return undefined;
    },

    syncToken: async (token: string) => {
        const { data, error } = await supabase.functions.invoke('register_push_token', {
            body: {
                token: token,
                device_type: Platform.OS
            }
        });

        if (error) {
            console.error('Token sync error:', error);
        }
    },

    getNotifications: async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    markAsRead: async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
    },

    scheduleDailyReminder: async (name: string) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Günlük Hatırlatma",
                body: `Selam ${name}, bugün Risale okumanı yaptın mı?`,
            },
            trigger: {
                hour: 21,
                minute: 0,
                repeats: true,
            } as any, // Temporary casting to fix strict typing issue locally
        });
    },

    scheduleAgendaNotification: async (title: string, date: Date, type: 'ONE_DAY_BEFORE' | 'SAME_DAY'): Promise<string> => {
        const triggerDate = new Date(date);
        let body = '';

        if (type === 'ONE_DAY_BEFORE') {
            triggerDate.setDate(triggerDate.getDate() - 1);
            triggerDate.setHours(9, 0, 0, 0); // 9 AM day before
            body = `Yarınki etkinlik: ${title}`;
        } else {
            // Same day, 1 hour before
            triggerDate.setHours(triggerDate.getHours() - 1);
            body = `Yaklaşan etkinlik: ${title}`;
        }

        if (triggerDate < new Date()) return ''; // Don't schedule past

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Ajanda Hatırlatması",
                body: body,
                data: { screen: 'Agenda' }
            },
            trigger: { date: triggerDate } as any, // Explicit object or cast
        });
        return id;
    },

    cancelNotification: async (id: string) => {
        await Notifications.cancelScheduledNotificationAsync(id);
    }
};

export const NotificationService = notificationService;
