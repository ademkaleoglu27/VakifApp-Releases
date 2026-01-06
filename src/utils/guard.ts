import { useAuthStore } from '@/store/authStore';
import { PermissionKey, canAccess } from '@/config/permissions';

export function requireFeature(feature: PermissionKey): boolean {
    const user = useAuthStore.getState().user;
    const role = user?.role || 'sohbet_member'; // Default to lowest role
    return canAccess(role, feature);
}

export function assertFeature(feature: PermissionKey): void {
    if (!requireFeature(feature)) {
        throw new Error(`FORBIDDEN: Access denied to feature ${feature}`);
    }
}
