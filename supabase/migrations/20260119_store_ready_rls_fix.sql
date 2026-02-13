-- =====================================================
-- STORE-READY FIX: RLS Tenant Isolation
-- Date: 2026-01-19
-- Purpose: Close security hole where NULL vakif_id rows are visible to all
-- =====================================================

-- STEP 1: Ensure all existing data has vakif_id set
-- (Already done in 001_multi_tenant.sql migration, but ensuring)
UPDATE public.transactions SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.decisions SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.contacts SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.contact_readings SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.assignments SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.announcements SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.notifications SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.rotation_pools SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.rotation_pool_members SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.duty_types SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.duty_assignments SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
UPDATE public.risale_decision_links SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;

-- STEP 2: Make vakif_id NOT NULL
ALTER TABLE public.transactions ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.decisions ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.contact_readings ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.announcements ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.rotation_pools ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.rotation_pool_members ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.duty_types ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.duty_assignments ALTER COLUMN vakif_id SET NOT NULL;
ALTER TABLE public.risale_decision_links ALTER COLUMN vakif_id SET NOT NULL;

-- STEP 3: Drop old policies and create strict ones (no OR vakif_id IS NULL)

-- Transactions
DROP POLICY IF EXISTS "Transactions tenant isolation" ON public.transactions;
CREATE POLICY "Transactions tenant isolation" ON public.transactions
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Decisions
DROP POLICY IF EXISTS "Decisions tenant isolation" ON public.decisions;
CREATE POLICY "Decisions tenant isolation" ON public.decisions
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Contacts
DROP POLICY IF EXISTS "Contacts tenant isolation" ON public.contacts;
CREATE POLICY "Contacts tenant isolation" ON public.contacts
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Contact Readings
DROP POLICY IF EXISTS "Contact readings tenant isolation" ON public.contact_readings;
CREATE POLICY "Contact readings tenant isolation" ON public.contact_readings
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Assignments
DROP POLICY IF EXISTS "Assignments tenant isolation" ON public.assignments;
CREATE POLICY "Assignments tenant isolation" ON public.assignments
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Announcements
DROP POLICY IF EXISTS "Announcements tenant isolation" ON public.announcements;
CREATE POLICY "Announcements tenant isolation" ON public.announcements
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Notifications
DROP POLICY IF EXISTS "Notifications tenant isolation" ON public.notifications;
CREATE POLICY "Notifications tenant isolation" ON public.notifications
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Rotation Pools
DROP POLICY IF EXISTS "Rotation pools tenant isolation" ON public.rotation_pools;
CREATE POLICY "Rotation pools tenant isolation" ON public.rotation_pools
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Rotation Pool Members
DROP POLICY IF EXISTS "Rotation pool members tenant isolation" ON public.rotation_pool_members;
CREATE POLICY "Rotation pool members tenant isolation" ON public.rotation_pool_members
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Duty Types
DROP POLICY IF EXISTS "Duty types tenant isolation" ON public.duty_types;
CREATE POLICY "Duty types tenant isolation" ON public.duty_types
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Duty Assignments
DROP POLICY IF EXISTS "Duty assignments tenant isolation" ON public.duty_assignments;
CREATE POLICY "Duty assignments tenant isolation" ON public.duty_assignments
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- Risale Decision Links
DROP POLICY IF EXISTS "Risale decision links tenant isolation" ON public.risale_decision_links;
CREATE POLICY "Risale decision links tenant isolation" ON public.risale_decision_links
  FOR ALL
  USING (vakif_id = public.get_my_vakif_id())
  WITH CHECK (vakif_id = public.get_my_vakif_id());

-- =====================================================
-- DONE: Tenant isolation is now strict
-- =====================================================
