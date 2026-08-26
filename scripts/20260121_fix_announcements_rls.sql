-- Enable RLS on announcements table
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies to start fresh (avoids conflicts)
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
DROP POLICY IF EXISTS "Announcements are insertable by admins" ON announcements;
DROP POLICY IF EXISTS "Announcements are deletable by admins" ON announcements;

-- 2. Create READ policy (Public Read-Only)
-- Everyone can read, filtering is done via application logic or basic target_role check if needed.
-- For simplicity, let authenticated users read all, or respect target_role.
-- App logic handles filtering, but let's be permissive on read for now to avoid "blank screen" issues.
CREATE POLICY "Announcements are viewable by everyone"
ON announcements FOR SELECT
TO authenticated
USING (true);

-- 3. Create INSERT policy (Authorized Roles Only)
-- Allowed roles: platform_admin, mesveret_admin, accountant (maybe?), sohbet_member (for lesson creation?)
-- Based on app usage:
-- Users check: canAccess(role, 'MESVERET_SCREEN') -> canManage
-- accountant -> MESVERET_SCREEN: true
-- mesveret_admin -> MESVERET_SCREEN: true
-- sohbet_member -> MESVERET_SCREEN: true (Wait, let's check permissions.ts)
-- permissions.ts: sohbet_member: ['LIBRARY_SCREEN', 'ANNOUNCEMENTS_SCREEN', 'JUZ_SCREEN', 'PROFILE_SCREEN']
-- sohbet_member DOES NOT HAVE 'MESVERET_SCREEN'.
-- BUT, in AnnouncementsScreen.tsx:
-- const canManage = canAccess(user?.role || 'sohbet_member', 'MESVERET_SCREEN');
-- If user is 'sohbet_member', canManage is FALSE.
-- So only 'accountant', 'mesveret_admin', 'platform_admin' can see the "Bildirim Gönder" / "Ders Duyuru" buttons.
-- WAIT. "Duyuru / Ders" button is also inside canManage block?
-- Yes: {canManage && ( ... buttons ... )}
-- So standard 'sohbet_member' CANNOT send announcements. Only admins/accountants.
-- So the policy should allow: platform_admin, mesveret_admin, accountant.

CREATE POLICY "Announcements are insertable by admins"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role' OR -- Allow service role always
  (
    SELECT role FROM profiles
    WHERE id = auth.uid()
  ) IN ('platform_admin', 'mesveret_admin', 'accountant')
);

-- 4. Create DELETE policy (Admins Only)
CREATE POLICY "Announcements are deletable by admins"
ON announcements FOR DELETE
TO authenticated
USING (
  (
    SELECT role FROM profiles
    WHERE id = auth.uid()
  ) IN ('platform_admin', 'mesveret_admin')
);

-- 5. Broadcast Log: Ensure we can insert logs if used
-- (Optional, if broadcast uses a table)
