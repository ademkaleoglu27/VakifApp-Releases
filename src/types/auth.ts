// export type Role = 'council_admin' | 'member'; // Deprecated
export type Role = 'guest' | 'sohbet_member' | 'accountant' | 'mesveret_admin' | 'platform_admin';

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: Role;
    teamId?: string;
    group?: string;
    avatarUrl?: string;
}

// export const ROLES: Record<string, Role> = {
//     COUNCIL_ADMIN: 'council_admin',
//     MEMBER: 'member',
// };

export const ROLES = {
    GUEST: 'guest' as Role,
    SOHBET_MEMBER: 'sohbet_member' as Role,
    ACCOUNTANT: 'accountant' as Role,
    MESVERET_ADMIN: 'mesveret_admin' as Role,
    PLATFORM_ADMIN: 'platform_admin' as Role,
};
