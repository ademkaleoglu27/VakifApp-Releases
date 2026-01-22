-- =====================================================
-- FIX TRIGGER COLUMNS (Database Saving Error Fix)
-- Date: 2026-01-21
-- Description: 
-- The previous trigger used 'full_name' and 'avatar_url'. 
-- The profiles table has 'display_name'.
-- This script corrects the column mapping to prevent "Database saving error" during signup.
-- =====================================================

BEGIN;

DO $$
DECLARE
    target_vakif_id UUID;
BEGIN
    -- 1. GET 'Kuzey Şehir' VAKIF ID (Reliable lookup)
    SELECT id INTO target_vakif_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LIMIT 1;
    
    -- Fallback/Safety Check
    IF target_vakif_id IS NULL THEN
        RAISE EXCEPTION 'Kuzey Şehir Vakif ID not found! Please run the previous setup script first.';
    END IF;

    -- 2. RE-DEFINE THE TRIGGER FUNCTION WITH CORRECT COLUMNS
    -- We use 'display_name' instead of 'full_name'.
    -- We check if 'avatar_url' exists to be safe, but for now we will omit it if unsure, 
    -- OR assume it is creating an error if the column is missing.
    -- Based on schema.sql, 'avatar_url' is NOT in the standard definition. 
    -- We will COMMENT IT OUT to be safe unless we are sure.
    -- If you want avatar, ensure the column exists: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

    -- Let's safely add the column just in case, it's good practice for an app app.
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text';

    EXECUTE format('
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $func$
        BEGIN
          -- 1. Insert Profile (Corrected Columns: display_name)
          INSERT INTO public.profiles (
            id, 
            display_name, 
            avatar_url, 
            vakif_id, 
            role
          )
          VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>''full_name'', NEW.raw_user_meta_data->>''name'', NEW.email),
            NEW.raw_user_meta_data->>''avatar_url'',
            %L, -- Injected Target ID
            ''member''
          );

          -- 2. Insert Membership
          INSERT INTO public.vakif_memberships (user_id, vakif_id, role, status)
          VALUES (
            NEW.id, 
            %L, 
            ''member'', 
            ''active''
          );

          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', target_vakif_id, target_vakif_id);

END $$;

COMMIT;
