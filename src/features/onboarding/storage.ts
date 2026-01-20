import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_ENABLED = true;

const KEYS = {
    ONBOARDING_V1_COMPLETED: '@onboarding_v1_completed',
    MENU_INTRO_V1_COMPLETED: '@menu_intro_v1_completed',
};

export const OnboardingStorage = {
    isOnboardingCompleted: async (): Promise<boolean> => {
        try {
            const value = await AsyncStorage.getItem(KEYS.ONBOARDING_V1_COMPLETED);
            return value === 'true';
        } catch (e) {
            return false;
        }
    },

    setOnboardingCompleted: async () => {
        try {
            await AsyncStorage.setItem(KEYS.ONBOARDING_V1_COMPLETED, 'true');
        } catch (e) {
            console.error('Failed to save onboarding status', e);
        }
    },

    isMenuIntroCompleted: async (): Promise<boolean> => {
        try {
            const value = await AsyncStorage.getItem(KEYS.MENU_INTRO_V1_COMPLETED);
            return value === 'true';
        } catch (e) {
            return false;
        }
    },

    setMenuIntroCompleted: async () => {
        try {
            await AsyncStorage.setItem(KEYS.MENU_INTRO_V1_COMPLETED, 'true');
        } catch (e) {
            console.error('Failed to save menu intro status', e);
        }
    },

    resetAll: async () => {
        try {
            await AsyncStorage.multiRemove([
                KEYS.ONBOARDING_V1_COMPLETED,
                KEYS.MENU_INTRO_V1_COMPLETED
            ]);
        } catch (e) {
            console.error('Failed to reset onboarding status', e);
        }
    }
};
