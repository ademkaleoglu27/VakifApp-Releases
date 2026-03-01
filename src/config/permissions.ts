// Role Definitions - must match types/auth.ts
export type Role = 'guest' | 'sohbet_member' | 'accountant' | 'mesveret_admin' | 'platform_admin';

// Feature/Permission Keys
export type PermissionKey =
    | 'MESVERET_SCREEN'
    | 'VIEW_COUNCIL_DECISIONS' // Allow viewing contacts/decisions
    | 'ACCOUNTING_SCREEN'
    | 'MANAGE_ACCOUNTING'       // Add/Edit/Delete Transactions
    | 'VIEW_ACCOUNTING_DETAILS' // See names (Who paid what)
    | 'MANAGE_AGENDA'           // Add/Delete Agenda Events
    | 'LIBRARY_SCREEN'
    | 'ANNOUNCEMENTS_SCREEN'
    | 'JUZ_SCREEN'
    | 'PROFILE_SCREEN'
    | 'DEVELOPER_TOOLS'         // Developer Tools access
    | 'AI_ASSISTANT'            // Gemini AI chat
    | 'EDUCATION_MODULE'        // Elif-Ba / Eğitim
    | 'NOBET_YONETIMI'          // Nöbet yönetimi
    | 'GOREVLENDIRMELER';       // Görevlendirmeler

// Mapping: PermissionKey → vakif_settings.feature_key
// Bu mapping guard.ts tarafından vakıf flag kontrolü için kullanılır
export const PERMISSION_TO_FEATURE_KEY: Partial<Record<PermissionKey, string>> = {
    AI_ASSISTANT: 'ai_assistant',
    MESVERET_SCREEN: 'mesveret',
    ACCOUNTING_SCREEN: 'muhasebe',
    EDUCATION_MODULE: 'education',
    JUZ_SCREEN: 'okuma_takibi',
    ANNOUNCEMENTS_SCREEN: 'duyurular',
    NOBET_YONETIMI: 'nobet_yonetimi',
    GOREVLENDIRMELER: 'gorevlendirmeler',
    LIBRARY_SCREEN: 'kutüphane',
};

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
    // Guest (Unauthenticated / No vakif)
    guest: [
        'LIBRARY_SCREEN'
    ],

    // Sohbet Member (Limited)
    sohbet_member: [
        'LIBRARY_SCREEN',
        'ANNOUNCEMENTS_SCREEN',
        'JUZ_SCREEN',
        'PROFILE_SCREEN',
        'AI_ASSISTANT',
        'EDUCATION_MODULE',
        'GOREVLENDIRMELER'
    ],

    // Accounting Admin (Full Accounting Access + Mesveret Access)
    accountant: [
        'MESVERET_SCREEN',
        'VIEW_COUNCIL_DECISIONS',
        'ACCOUNTING_SCREEN',
        'MANAGE_ACCOUNTING',
        'VIEW_ACCOUNTING_DETAILS',
        'MANAGE_AGENDA',
        'LIBRARY_SCREEN',
        'ANNOUNCEMENTS_SCREEN',
        'JUZ_SCREEN',
        'PROFILE_SCREEN',
        'AI_ASSISTANT',
        'EDUCATION_MODULE',
        'NOBET_YONETIMI',
        'GOREVLENDIRMELER'
    ],

    // Mesveret Admin (Full Access including Accounting now)
    mesveret_admin: [
        'MESVERET_SCREEN',
        'VIEW_COUNCIL_DECISIONS',
        'ACCOUNTING_SCREEN',
        // No MANAGE_ACCOUNTING -> Only view summary
        // No VIEW_ACCOUNTING_DETAILS -> Privacy Mode
        'MANAGE_AGENDA',           // Added
        'LIBRARY_SCREEN',
        'ANNOUNCEMENTS_SCREEN',
        'JUZ_SCREEN',
        'PROFILE_SCREEN',
        'AI_ASSISTANT',
        'EDUCATION_MODULE',
        'NOBET_YONETIMI',
        'GOREVLENDIRMELER'
    ],

    // Platform Admin (Superuser - Access Everything)
    platform_admin: [
        'MESVERET_SCREEN',
        'VIEW_COUNCIL_DECISIONS',
        'ACCOUNTING_SCREEN',
        'MANAGE_ACCOUNTING',
        'VIEW_ACCOUNTING_DETAILS',
        'MANAGE_AGENDA',
        'LIBRARY_SCREEN',
        'ANNOUNCEMENTS_SCREEN',
        'JUZ_SCREEN',
        'PROFILE_SCREEN',
        'DEVELOPER_TOOLS', // Exclusive to this role
        'AI_ASSISTANT',
        'EDUCATION_MODULE',
        'NOBET_YONETIMI',
        'GOREVLENDIRMELER'
    ]
};

export function canAccess(role: Role, permission: PermissionKey): boolean {
    const allowed = ROLE_PERMISSIONS[role];
    return allowed?.includes(permission) ?? false;
}
