import { supabase } from './supabaseClient';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const notificationService = {

    registerForPushNotificationsAsync: async (): Promise<string | undefined> => {
        let token;

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
                alert('Failed to get push token for push notification!');
                return;
            }

            try {
                const tokenData = await Notifications.getDevicePushTokenAsync();
                token = tokenData.data;
            } catch (e) {
                console.warn("Error getting Device Push Token", e);
                const expoToken = await Notifications.getExpoPushTokenAsync();
                token = expoToken.data;

            }
        } else {

        }

        if (token) {
            await notificationService.syncToken(token);
        }

        return token;
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
