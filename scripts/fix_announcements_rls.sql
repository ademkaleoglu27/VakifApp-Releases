-- =====================================================
-- FIX ANNOUNCEMENTS RLS (Multi-Tenant & Role Based)
-- =====================================================

-- 1. DROP ALL UNSAFE POLICIES
DROP POLICY IF EXISTS "Anyone can read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON public.announcements;
DROP POLICY IF EXISTS "Announcements tenant isolation" ON public.announcements; -- Replacing with stricter version
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Announcements are deletable by admins" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Announcements are insertable by admins" ON public.announcements;


-- 2. CREATE STRICT POLICIES

-- A) VIEW (SELECT): Only see announcements from MY VAKIF(s)
--    (Guests in 'Misafir' will see Misafir announcements, if any)
CREATE POLICY "Users can view announcements of their vakif" ON public.announcements
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.vakif_memberships vm
    WHERE vm.user_id = auth.uid()
    AND vm.vakif_id = announcements.vakif_id
  )
);

-- B) INSERT: Only Admins (Mesveret/Platform) OR Sohbet (if allowed by business rule)
--    User Request: "Sohbet heyeti okuyup konum varsa onu yapabilir" implies read/interact.
--    "Kuzey1453 ile yapılan duyuru sadece kayıtlı olan... gorebilir" -> Isolation ensured above.
--    "Duyuruyu silme sadece meşveret heyeti" -> INSERT usually implies admin too.
--    Let's allow Mesveret & Platform & Accountant to INSERT.
CREATE POLICY "Admins can insert announcements" ON public.announcements
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vakif_memberships vm
    WHERE vm.user_id = auth.uid()
    AND vm.vakif_id = announcements.vakif_id
    AND vm.role IN ('mesveret_admin', 'platform_admin', 'accountant') 
  )
);

-- C) DELETE: Only Mesveret Admin & Platform Admin
CREATE POLICY "Admins can delete announcements" ON public.announcements
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.vakif_memberships vm
    WHERE vm.user_id = auth.uid()
    AND vm.vakif_id = announcements.vakif_id
    AND vm.role IN ('mesveret_admin', 'platform_admin') -- Sohbet cannot delete
  )
);
