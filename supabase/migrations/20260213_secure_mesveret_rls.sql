-- =====================================================
-- Meşveret Security Hardening (RLS)
-- Restricts access to Decisions only to Council Roles
-- =====================================================

-- 1. Helper function: Check if user is Council Member
-- Includes: mesveret_admin, platform_admin, accountant (as they have MESVERET_SCREEN permission)
CREATE OR REPLACE FUNCTION public.is_council_member()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('mesveret_admin', 'platform_admin', 'accountant')
  )
$$;

-- 2. Drop existing weak policies (that only checked Vakif ID)
DROP POLICY IF EXISTS "Decisions tenant isolation" ON public.decisions;
DROP POLICY IF EXISTS "Decision Items tenant isolation" ON public.decision_items;
DROP POLICY IF EXISTS "Risale decision links tenant isolation" ON public.risale_decision_links;

-- 3. Apply NEW Strong Policies
-- Condition: (Same Vakif OR Global) AND (Is Council Member)

-- A. Decisions Table
CREATE POLICY "Decisions tenant isolation" ON public.decisions
    FOR ALL USING (
        (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL)
        AND public.is_council_member()
    );

-- B. Decision Items Table
CREATE POLICY "Decision Items tenant isolation" ON public.decision_items
    FOR ALL USING (
        (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL)
        AND public.is_council_member()
    );

-- C. Decision Links Table
CREATE POLICY "Risale decision links tenant isolation" ON public.risale_decision_links
    FOR ALL USING (
        (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL)
        AND public.is_council_member()
    );

-- 4. Storage Security (Optional but recommended)
-- Ensure only council members can read/write decision attachments
-- Note: Requires deleting previous generic policies if they clash, 
-- but tighter rules usually override or act as AND/OR depending on DB setup. 
-- For now, table RLS is the strongest gatekeeper.
