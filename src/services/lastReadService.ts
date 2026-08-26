import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LastReadItem {
    id: string;
    type: 'quran_page' | 'quran_text' | 'risale' | 'cevsen' | 'tesbihat' | 'elifba';
    title: string;
    subtitle: string;
    screenName: string;
    params: Record<string, any>;
    timestamp: number;
    icon?: string;
    progressPercent?: number;
}

const LAST_READ_STORAGE_KEY = '@last_read_active_item_v1';
const RECENT_READS_STORAGE_KEY = '@recent_reads_history_v1';

type LastReadListener = (item: LastReadItem | null) => void;

class LastReadService {
    private currentLastRead: LastReadItem | null = null;
    private listeners: Set<LastReadListener> = new Set();

    constructor() {
        this.loadInitial();
    }

    private async loadInitial() {
        try {
            const saved = await AsyncStorage.getItem(LAST_READ_STORAGE_KEY);
            if (saved) {
                this.currentLastRead = JSON.parse(saved);
                this.notifyListeners();
            }
        } catch { }
    }

    /**
     * Record a new reading position
     */
    public async recordLastRead(item: Omit<LastReadItem, 'timestamp'>): Promise<void> {
        const fullItem: LastReadItem = {
            ...item,
            timestamp: Date.now(),
        };

        this.currentLastRead = fullItem;
        this.notifyListeners();

        try {
            // 1. Save active item
            await AsyncStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(fullItem));

            // 2. Save to history (keep top 5 distinct types)
            const savedHistory = await AsyncStorage.getItem(RECENT_READS_STORAGE_KEY);
            let history: LastReadItem[] = savedHistory ? JSON.parse(savedHistory) : [];

            history = [fullItem, ...history.filter(h => h.id !== fullItem.id)].slice(0, 8);
            await AsyncStorage.setItem(RECENT_READS_STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.warn('[LastReadService] Save error:', e);
        }
    }

    /**
     * Get currently active last read item
     */
    public async getLastRead(): Promise<LastReadItem | null> {
        if (this.currentLastRead) return this.currentLastRead;
        try {
            const saved = await AsyncStorage.getItem(LAST_READ_STORAGE_KEY);
            if (saved) {
                this.currentLastRead = JSON.parse(saved);
                return this.currentLastRead;
            }
        } catch { }
        return null;
    }

    /**
     * Get recent reading history
     */
    public async getRecentHistory(): Promise<LastReadItem[]> {
        try {
            const saved = await AsyncStorage.getItem(RECENT_READS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    /**
     * Subscribe to live last read updates
     */
    public subscribe(listener: LastReadListener): () => void {
        this.listeners.add(listener);
        listener(this.currentLastRead);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => {
            try {
                l(this.currentLastRead);
            } catch { }
        });
    }
}

export const lastReadService = new LastReadService();
