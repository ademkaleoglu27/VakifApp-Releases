// DevGate.ts - Developer Tools access control utility
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@app/devtools_enabled';
const DEV_PIN = '1453';

/**
 * Check if Developer Tools access is enabled
 */
export async function getDevtoolsEnabled(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEY);
        return value === 'true';
    } catch (error) {
        console.error('[DevGate] Error reading devtools state:', error);
        return false;
    }
}

/**
 * Set Developer Tools access state
 */
export async function setDevtoolsEnabled(enabled: boolean): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
        console.log(`[DevGate] DevTools ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('[DevGate] Error setting devtools state:', error);
        throw error;
    }
}

/**
 * Verify PIN for Developer Tools access
 */
export function verifyDevPin(pin: string): boolean {
    return pin === DEV_PIN;
}

/**
 * Hook for using DevGate state in components
 */
export const DevGate = {
    getEnabled: getDevtoolsEnabled,
    setEnabled: setDevtoolsEnabled,
    verifyPin: verifyDevPin,
    STORAGE_KEY
};
