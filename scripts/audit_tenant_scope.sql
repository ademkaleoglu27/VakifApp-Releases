-- =====================================================
-- MULTI-TENANT AUDIT SCRIPT
-- Purpose: Map current schema to identify Tenant-Scope gaps.
-- =====================================================

-- 1. Identify "Tenant" and "Membership" Tables (Current State)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('vakiflar', 'vakif_memberships', 'profiles')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Identify Potential Tenant-Scope Tables
-- Find all tables that ALREADY have a 'vakif_id'
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'vakif_id' 
AND table_schema = 'public';

-- 3. Identify UNSCOPED Tables (Risk Analysis)
-- Find tables that look like user data but lack 'vakif_id'
SELECT table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name NOT IN (
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'vakif_id'
)
AND table_name NOT LIKE 'pg_%'
AND table_name NOT LIKE 'sql_%';

-- 4. Check Constraints & Indexes on Membership
-- We need to ensure (user_id, vakif_id) is unique.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.vakif_memberships'::regclass;

-- 5. Check Current RLS Policies on Critical Tables
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('reading_logs', 'contacts', 'profiles', 'vakif_memberships');
