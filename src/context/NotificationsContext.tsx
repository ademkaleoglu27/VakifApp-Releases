import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '@/services/notificationService';
import { supabase } from '@/services/supabaseClient';
import { Subscription } from 'expo-notifications';
import { useAuthStore } from '@/store/authStore';

// Define type
type NotificationContextType = {
    expoPushToken: string | undefined;
    notifications: any[];
    unreadCount: number;
    refreshNotifications: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Handler behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notifications, setNotifications] = useState<any[]>([]);
    const { user } = useAuthStore();

    const notificationListener = useRef<Subscription>();
    const responseListener = useRef<Subscription>();

    const refreshNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            if (data) setNotifications(data);
        } catch (e) {
            // console.error(e);
        }
    };

    const markRead = async (id: string) => {
        await notificationService.markAsRead(id);
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        // 1. Register Token
        notificationService.registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

        // 2. Fetch Initial History via Supabase
        refreshNotifications();

        // 3. Listeners
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            // Incoming notification (foreground)

            refreshNotifications();
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            // User tapped notification

            // Handle deep link logic here
        });

        // 4. Realtime Subscription
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    refreshNotifications();
                }
            )
            .subscribe();

        return () => {
            if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
            if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <NotificationContext.Provider value={{ expoPushToken, notifications, unreadCount, refreshNotifications, markRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};
