-- =====================================================
-- VakifApp Multi-Tenant Architecture Migration (REVISED)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create vakiflar (foundations) table
CREATE TABLE IF NOT EXISTS public.vakiflar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create vakif join requests table
CREATE TABLE IF NOT EXISTS public.vakif_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vakif_id UUID NOT NULL REFERENCES public.vakiflar(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT,
    requested_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, vakif_id)
);

-- 3. Create platform_settings table for kill-switches
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT 'true'::jsonb,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value, description) VALUES
    ('notifications_enabled', 'true', 'Master switch for push notifications'),
    ('announcements_enabled', 'true', 'Master switch for announcements'),
    ('transactions_write_enabled', 'true', 'Allow financial transaction writes'),
    ('maintenance_mode', 'false', 'App-wide maintenance mode flag')
ON CONFLICT (key) DO NOTHING;

-- 4. Extend profiles table with vakif_id
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

-- 5. Add user_id to contacts for DETERMINISTIC LINKAGE (KEY FIX)
-- This enables proper leaderboard tracking without name-matching
ALTER TABLE public.contacts 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 6. Add vakif_id to tenant-scoped tables
ALTER TABLE public.transactions 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.decisions 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.contacts 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.contact_readings 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.assignments 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.announcements 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.notifications 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.rotation_pools 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.rotation_pool_members 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.duty_types 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.duty_assignments 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

ALTER TABLE public.risale_decision_links 
    ADD COLUMN IF NOT EXISTS vakif_id UUID REFERENCES public.vakiflar(id);

-- =====================================================
-- DEFAULT VAKIF + DATA MIGRATION
-- =====================================================

-- Create default vakif for existing data
INSERT INTO public.vakiflar (id, name, code, description, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Varsayılan Vakıf',
    'DEFAULT',
    'Mevcut verilerin taşındığı varsayılan vakıf'
    , true
) ON CONFLICT (id) DO NOTHING;

-- Migrate existing data to default vakif
UPDATE public.profiles SET vakif_id = '00000000-0000-0000-0000-000000000001' WHERE vakif_id IS NULL;
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

-- =====================================================
-- RLS POLICIES FOR TENANT ISOLATION
-- =====================================================

-- Enable RLS on all tenant tables
ALTER TABLE public.vakiflar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vakif_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's vakif_id
CREATE OR REPLACE FUNCTION public.get_my_vakif_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT vakif_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper function: Check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'platform_admin'
  )
$$;

-- Helper function: Check if user is mesveret admin or higher
CREATE OR REPLACE FUNCTION public.is_vakif_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('mesveret_admin', 'platform_admin')
  )
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Users can view their own vakif" ON public.vakiflar;
DROP POLICY IF EXISTS "Platform admins can manage vakiflar" ON public.vakiflar;
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Only platform admin can update settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Transactions tenant isolation" ON public.transactions;
DROP POLICY IF EXISTS "Decisions tenant isolation" ON public.decisions;
DROP POLICY IF EXISTS "Contacts tenant isolation" ON public.contacts;
DROP POLICY IF EXISTS "Contact readings tenant isolation" ON public.contact_readings;
DROP POLICY IF EXISTS "Assignments tenant isolation" ON public.assignments;
DROP POLICY IF EXISTS "Announcements tenant isolation" ON public.announcements;
DROP POLICY IF EXISTS "Notifications tenant isolation" ON public.notifications;
DROP POLICY IF EXISTS "Rotation pools tenant isolation" ON public.rotation_pools;
DROP POLICY IF EXISTS "Rotation pool members tenant isolation" ON public.rotation_pool_members;
DROP POLICY IF EXISTS "Duty types tenant isolation" ON public.duty_types;
DROP POLICY IF EXISTS "Duty assignments tenant isolation" ON public.duty_assignments;

-- Vakiflar policies
CREATE POLICY "Users can view their own vakif" ON public.vakiflar
    FOR SELECT USING (id = public.get_my_vakif_id() OR public.is_platform_admin());

CREATE POLICY "Platform admins can manage vakiflar" ON public.vakiflar
    FOR ALL USING (public.is_platform_admin());

-- Platform settings (read-only for all, write for platform admin only)
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
    FOR SELECT USING (true);

CREATE POLICY "Only platform admin can update settings" ON public.platform_settings
    FOR UPDATE USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Only platform admin can insert settings" ON public.platform_settings;
CREATE POLICY "Only platform admin can insert settings" ON public.platform_settings
    FOR INSERT WITH CHECK (public.is_platform_admin());

-- Transactions: Full tenant isolation
CREATE POLICY "Transactions tenant isolation" ON public.transactions
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

-- Other tenant tables: Same pattern
CREATE POLICY "Decisions tenant isolation" ON public.decisions
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Contacts tenant isolation" ON public.contacts
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Contact readings tenant isolation" ON public.contact_readings
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Assignments tenant isolation" ON public.assignments
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Announcements tenant isolation" ON public.announcements
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Notifications tenant isolation" ON public.notifications
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Rotation pools tenant isolation" ON public.rotation_pools
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Rotation pool members tenant isolation" ON public.rotation_pool_members
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Duty types tenant isolation" ON public.duty_types
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

CREATE POLICY "Duty assignments tenant isolation" ON public.duty_assignments
    FOR ALL USING (vakif_id = public.get_my_vakif_id() OR vakif_id IS NULL);

-- Join requests policies
DROP POLICY IF EXISTS "Users see own requests" ON public.vakif_join_requests;
DROP POLICY IF EXISTS "Mesveret admins see vakif requests" ON public.vakif_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON public.vakif_join_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.vakif_join_requests;

CREATE POLICY "Users see own requests" ON public.vakif_join_requests
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Mesveret admins see vakif requests" ON public.vakif_join_requests
    FOR SELECT USING (
        vakif_id = public.get_my_vakif_id() AND public.is_vakif_admin()
    );

CREATE POLICY "Users can create join requests" ON public.vakif_join_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update requests" ON public.vakif_join_requests
    FOR UPDATE USING (
        vakif_id = public.get_my_vakif_id() AND public.is_vakif_admin()
    );

-- =====================================================
-- DONE
-- After running:
-- 1. All existing data under DEFAULT vakif
-- 2. contacts.user_id ready for deterministic linkage
-- 3. RLS isolates by vakif_id
-- 4. platform_settings ready for kill-switches
-- =====================================================
