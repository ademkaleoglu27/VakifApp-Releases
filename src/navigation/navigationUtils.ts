import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
    if (navigationRef.current?.isReady()) {
        navigationRef.current?.navigate(name as any, params as any);
    } else {
        console.warn('[NavigationUtils] Navigation ref not ready');
    }
}
