import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Vakif {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
}

interface VakifState {
    currentVakif: Vakif | null;
    setVakif: (vakif: Vakif | null) => void;
    clear: () => void;
}

export const useVakifStore = create<VakifState>()(
    persist(
        (set) => ({
            currentVakif: null,
            setVakif: (vakif) => set({ currentVakif: vakif }),
            clear: () => set({ currentVakif: null }),
        }),
        {
            name: '@vakifapp/vakif-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

// Helper to get current vakif_id for service calls
export const getCurrentVakifId = (): string | null => {
    return useVakifStore.getState().currentVakif?.id || null;
};
