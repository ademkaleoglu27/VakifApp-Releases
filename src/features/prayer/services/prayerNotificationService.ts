import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { prayerTimesService, PrayerTimes } from './prayerTimesService';
import { PRAYER_QUOTES } from '../data/prayerQuotesData';
import { Platform } from 'react-native';

export interface PrayerNotificationSettings {
    enabled: boolean;
    earlyWarningEnabled: boolean;
    earlyWarningMinutes: number; // default: 45
    soundEnabled: boolean;
    prayers: {
        imsak: boolean;
        gunes: boolean;
        ogle: boolean;
        ikindi: boolean;
        aksam: boolean;
        yatsi: boolean;
    };
}

const DEFAULT_SETTINGS: PrayerNotificationSettings = {
    enabled: true,
    earlyWarningEnabled: true,
    earlyWarningMinutes: 45,
    soundEnabled: true,
    prayers: {
        imsak: true,
        gunes: false,
        ogle: true,
        ikindi: true,
        aksam: true,
        yatsi: true,
    },
};

const SETTINGS_STORAGE_KEY = '@prayer_notification_settings_v1';

class PrayerNotificationService {
    private settings: PrayerNotificationSettings = DEFAULT_SETTINGS;

    constructor() {
        this.loadSettings();
    }

    public async loadSettings(): Promise<PrayerNotificationSettings> {
        try {
            const saved = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
            if (saved) {
                this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch { }
        return this.settings;
    }

    public async saveSettings(newSettings: PrayerNotificationSettings): Promise<void> {
        this.settings = newSettings;
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        await this.rescheduleAll();
    }

    public getSettings(): PrayerNotificationSettings {
        return this.settings;
    }

    /**
     * Reschedule all local prayer and 45-minute early warning notifications for upcoming days
     */
    public async rescheduleAll(): Promise<void> {
        try {
            // Cancel previously scheduled prayer notifications
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            for (const notif of scheduled) {
                if (notif.identifier.startsWith('prayer_')) {
                    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
                }
            }

            if (!this.settings.enabled) return;

            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                const { status: reqStatus } = await Notifications.requestPermissionsAsync();
                if (reqStatus !== 'granted') return;
            }

            const now = new Date();

            // Schedule for today and next 6 days (7 days of 100% offline coverage)
            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
                const times = await prayerTimesService.getTimesForDate(targetDate);
                await this.scheduleDayNotifications(times, targetDate, now);
            }

            console.log('[PrayerNotifications] 7-day offline prayer notifications scheduled successfully.');
        } catch (e) {
            console.warn('[PrayerNotifications] Schedule error:', e);
        }
    }

    private async scheduleDayNotifications(times: PrayerTimes, targetDate: Date, now: Date): Promise<void> {
        const prayerList: { key: keyof PrayerNotificationSettings['prayers']; name: string; time: string; nextTimeKey?: keyof PrayerTimes }[] = [
            { key: 'imsak', name: 'Sabah Namazı', time: times.imsak, nextTimeKey: 'gunes' },
            { key: 'gunes', name: 'Güneş Doğuşu', time: times.gunes, nextTimeKey: 'ogle' },
            { key: 'ogle', name: 'Öğle Namazı', time: times.ogle, nextTimeKey: 'ikindi' },
            { key: 'ikindi', name: 'İkindi Namazı', time: times.ikindi, nextTimeKey: 'aksam' },
            { key: 'aksam', name: 'Akşam Namazı', time: times.aksam, nextTimeKey: 'yatsi' },
            { key: 'yatsi', name: 'Yatsı Namazı', time: times.yatsi, nextTimeKey: 'imsak' },
        ];

        for (const prayer of prayerList) {
            if (!this.settings.prayers[prayer.key]) continue;

            const [h, m] = prayer.time.split(':').map(Number);
            const prayerDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), h, m, 0);

            // 1. Exact Prayer Time Notification
            if (prayerDate.getTime() > now.getTime()) {
                const quote = PRAYER_QUOTES[prayer.key];
                const vecizeSnippet = quote?.risale?.text ? `\n"${quote.risale.text.slice(0, 90)}..."` : '';

                await Notifications.scheduleNotificationAsync({
                    identifier: `prayer_exact_${prayer.key}_${prayerDate.getTime()}`,
                    content: {
                        title: `🕌 Ezan Vakti • ${prayer.name}`,
                        body: `${prayer.name} vakti girdi.${vecizeSnippet}`,
                        sound: this.settings.soundEnabled ? 'default' : undefined,
                        data: { prayerKey: prayer.key, type: 'EXACT_PRAYER' },
                    },
                    trigger: {
                        date: prayerDate,
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                    },
                });
            }

            // 2. 45-Minute (or configured minutes) Early Warning Notification Before Prayer Exits
            if (this.settings.earlyWarningEnabled && prayer.nextTimeKey) {
                const nextTimeStr = times[prayer.nextTimeKey];
                const [nextH, nextM] = nextTimeStr.split(':').map(Number);
                let nextPrayerDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), nextH, nextM, 0);

                if (prayer.key === 'yatsi') {
                    // Next imsak is on following day
                    nextPrayerDate = new Date(nextPrayerDate.getTime() + 24 * 60 * 60 * 1000);
                }

                const warningDate = new Date(nextPrayerDate.getTime() - this.settings.earlyWarningMinutes * 60 * 1000);

                if (warningDate.getTime() > now.getTime()) {
                    await Notifications.scheduleNotificationAsync({
                        identifier: `prayer_warn_${prayer.key}_${warningDate.getTime()}`,
                        content: {
                            title: `⏳ Namaz Hatırlatması • ${prayer.name}`,
                            body: `${prayer.name} vaktinin çıkmasına ${this.settings.earlyWarningMinutes} dakika kaldı. Namazınızı eda etmeyi unutmayın.`,
                            sound: this.settings.soundEnabled ? 'default' : undefined,
                            data: { prayerKey: prayer.key, type: 'EARLY_WARNING' },
                        },
                        trigger: {
                            date: warningDate,
                            type: Notifications.SchedulableTriggerInputTypes.DATE,
                        },
                    });
                }
            }
        }
    }
}

export const prayerNotificationService = new PrayerNotificationService();
