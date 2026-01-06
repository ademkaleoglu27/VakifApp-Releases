import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CevsenState {
    lastPage: number;
    setLastPage: (page: number) => void;
}

export const useCevsenStore = create<CevsenState>()(
    persist(
        (set) => ({
            lastPage: 1,
            setLastPage: (page) => set({ lastPage: page }),
        }),
        {
            name: 'cevsen-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
