// Role Definitions
export type Role = 'mesveret_admin' | 'sohbet_member' | 'accountant';

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
    | 'PROFILE_SCREEN';

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
    // 1. Accounting Admin (Full Accounting Access + Mesveret Access)
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
        'PROFILE_SCREEN'
    ],

    // 2. Mesveret Admin (Full Access including Accounting now)
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
        'PROFILE_SCREEN'
    ],

    // 3. Sohbet Member (Limited)
    sohbet_member: [
        'LIBRARY_SCREEN',
        'ANNOUNCEMENTS_SCREEN',
        'JUZ_SCREEN',
        'PROFILE_SCREEN'
    ]
};

export function canAccess(role: Role, permission: PermissionKey): boolean {
    const allowed = ROLE_PERMISSIONS[role];
    return allowed?.includes(permission) ?? false;
}
