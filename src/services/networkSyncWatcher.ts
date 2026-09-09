import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncService } from './syncService';
import { getDb } from './db/sqlite';

type NetworkStatusListener = (status: {
    isConnected: boolean;
    isInternetReachable: boolean;
    pendingOutboxCount: number;
    isSyncing: boolean;
}) => void;

class NetworkSyncWatcher {
    private isWatching: boolean = false;
    private wasOffline: boolean = false;
    private isSyncing: boolean = false;
    private unsubscribeNetInfo: (() => void) | null = null;
    private listeners: Set<NetworkStatusListener> = new Set();
    private currentStatus = {
        isConnected: true,
        isInternetReachable: true,
        pendingOutboxCount: 0,
        isSyncing: false,
    };

    /**
     * Start watching network state changes globally
     */
    public startWatching() {
        if (this.isWatching) return;
        this.isWatching = true;

        console.log('[NetworkWatcher] Initializing Zero-Network offline watcher...');

        this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
            const isOnline = !!(state.isConnected && (state.isInternetReachable ?? true));

            this.currentStatus.isConnected = !!state.isConnected;
            this.currentStatus.isInternetReachable = isOnline;

            this.refreshPendingCount();

            // Detect transition: Offline -> Online (Internet regained)
            if (isOnline && this.wasOffline) {
                console.log('[NetworkWatcher] ⚡ Internet connection regained! Triggering instant auto-sync...');
                this.triggerInstantSync();
            }

            this.wasOffline = !isOnline;
            this.notifyListeners();
        });

        // Initial check
        this.refreshPendingCount();
    }

    /**
     * Stop watching
     */
    public stopWatching() {
        if (this.unsubscribeNetInfo) {
            this.unsubscribeNetInfo();
            this.unsubscribeNetInfo = null;
        }
        this.isWatching = false;
    }

    /**
     * Trigger immediate background synchronization
     */
    public async triggerInstantSync(): Promise<void> {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.currentStatus.isSyncing = true;
        this.notifyListeners();

        try {
            console.log('[NetworkWatcher] Running outbox push + cloud pull...');
            // 1. Push all pending offline actions from SQLite Outbox
            await (syncService as any).pushChanges();
            // 2. Pull any changes from Supabase
            await syncService.pullChanges();
            console.log('[NetworkWatcher] ✅ Instant auto-sync finished successfully.');
        } catch (e) {
            console.warn('[NetworkWatcher] Auto-sync encountered an issue (will retry on next event):', e);
        } finally {
            this.isSyncing = false;
            this.currentStatus.isSyncing = false;
            await this.refreshPendingCount();
            this.notifyListeners();
        }
    }

    /**
     * Query pending outbox items count from SQLite
     */
    public async refreshPendingCount(): Promise<number> {
        try {
            const db = await getDb();
            const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM outbox');
            const count = result?.count || 0;
            this.currentStatus.pendingOutboxCount = count;
            this.notifyListeners();
            return count;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Subscribe UI components to network & outbox status
     */
    public subscribe(listener: NetworkStatusListener): () => void {
        this.listeners.add(listener);
        listener(this.currentStatus);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => {
            try {
                l({ ...this.currentStatus });
            } catch (e) {
                console.warn('[NetworkWatcher] Listener error:', e);
            }
        });
    }

    public getStatus() {
        return { ...this.currentStatus };
    }
}

export const networkSyncWatcher = new NetworkSyncWatcher();
