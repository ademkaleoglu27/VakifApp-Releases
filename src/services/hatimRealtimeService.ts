import { getSupabaseClient } from './supabaseClient';
import { getDb } from './db/sqlite';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface HatimPartUpdatePayload {
    id: string;
    hatim_id: string;
    juz_number: number;
    status: 'AVAILABLE' | 'TAKEN' | 'COMPLETED';
    assigned_to_name?: string | null;
    assigned_to_id?: string | null;
    updated_at?: string;
}

type PartUpdateCallback = (part: HatimPartUpdatePayload) => void;

class HatimRealtimeManager {
    private channel: RealtimeChannel | null = null;
    private listeners: Set<PartUpdateCallback> = new Set();
    private activeHatimId: string | null = null;

    /**
     * Subscribe to realtime changes on hatim_parts table
     */
    public subscribe(hatimId: string, callback: PartUpdateCallback): () => void {
        this.listeners.add(callback);
        this.activeHatimId = hatimId;

        const supabase = getSupabaseClient();
        if (!supabase) {
            console.log('[HatimRealtime] Supabase not configured, operating in offline mode.');
            return () => {
                this.listeners.delete(callback);
            };
        }

        if (!this.channel) {
            console.log('[HatimRealtime] Connecting to Supabase Realtime channel...');
            this.channel = supabase
                .channel(`realtime:hatim_parts:${hatimId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'hatim_parts',
                        filter: `hatim_id=eq.${hatimId}`
                    },
                    async (payload: any) => {
                        console.log('[HatimRealtime] Realtime event received:', payload.eventType);
                        const newPart = payload.new as HatimPartUpdatePayload;
                        if (!newPart || !newPart.id) return;

                        // 1. Sync directly to local SQLite
                        await this.syncToLocalDb(newPart);

                        // 2. Notify all active UI listeners
                        this.listeners.forEach(listener => {
                            try {
                                listener(newPart);
                            } catch (e) {
                                console.warn('[HatimRealtime] Listener callback error:', e);
                            }
                        });
                    }
                )
                .subscribe((status) => {
                    console.log(`[HatimRealtime] Subscription status: ${status}`);
                });
        }

        return () => {
            this.listeners.delete(callback);
            if (this.listeners.size === 0 && this.channel) {
                console.log('[HatimRealtime] Unsubscribing channel...');
                this.channel.unsubscribe();
                this.channel = null;
            }
        };
    }

    /**
     * Directly update local SQLite when a websocket packet arrives
     */
    private async syncToLocalDb(part: HatimPartUpdatePayload) {
        try {
            const db = await getDb();
            await db.runAsync(
                `INSERT OR REPLACE INTO hatim_parts (id, hatim_id, juz_number, status, assigned_to_name, assigned_to_id, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    part.id,
                    part.hatim_id,
                    part.juz_number,
                    part.status,
                    part.assigned_to_name || null,
                    part.assigned_to_id || null,
                    part.updated_at || new Date().toISOString()
                ]
            );
        } catch (e) {
            console.warn('[HatimRealtime] Failed to sync realtime update to SQLite:', e);
        }
    }
}

export const hatimRealtimeService = new HatimRealtimeManager();
