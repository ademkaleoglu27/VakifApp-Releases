import { useAuthStore } from '@/store/authStore';
import { PermissionKey, canAccess, PERMISSION_TO_FEATURE_KEY } from '@/config/permissions';
import { featureFlagService } from '@/services/featureFlagService';
import type { FeatureKey } from '@/services/featureFlagService';

export function requireFeature(feature: PermissionKey): boolean {
    const user = useAuthStore.getState().user;
    const role = user?.role || 'sohbet_member'; // Default to lowest role

    // 1. Rol bazlı kontrol (mevcut davranış)
    const roleAllowed = canAccess(role, feature);
    if (!roleAllowed) return false;

    // 2. Vakıf bazlı feature flag kontrolü
    const featureKey = PERMISSION_TO_FEATURE_KEY[feature];
    if (featureKey) {
        // Bu permission'ın bir vakıf flag karşılığı var — kontrol et
        return featureFlagService.isFeatureEnabled(featureKey as FeatureKey);
    }

    // Mapping'i olmayan permission key'ler (MANAGE_ACCOUNTING, VIEW_ACCOUNTING_DETAILS, etc.)
    // Sadece rol bazlı kontrole tabi
    return true;
}

export function assertFeature(feature: PermissionKey): void {
    if (!requireFeature(feature)) {
        throw new Error(`FORBIDDEN: Access denied to feature ${feature}`);
    }
}
