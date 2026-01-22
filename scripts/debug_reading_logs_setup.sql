-- =====================================================
-- DEBUG READING LOGS CONFIGURATION
-- List policies and table info to find the blocker
-- =====================================================

-- 1. Check Policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'reading_logs';

-- 2. Check Table Constraints (Not Nulls etc)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'reading_logs';

-- 3. Check Triggers
SELECT 
    event_object_table as table_name, 
    trigger_name, 
    event_manipulation as event, 
    action_statement as definition
FROM information_schema.triggers 
WHERE event_object_table = 'reading_logs';
