-- =====================================================
-- FIX ROLES MIGRATION (Legacy -> New System)
-- Date: 2026-01-21
-- Description: 
-- The App expects: 'sohbet_member', 'mesveret_admin'
-- The DB contains: 'member', 'council_admin'
-- This script migrates all users to the correct new roles.
-- =====================================================

BEGIN;

-- 1. UPDATE PROFILES (Migrate Values)
UPDATE public.profiles
SET role = 'sohbet_member'
WHERE role = 'member';

UPDATE public.profiles
SET role = 'mesveret_admin'
WHERE role = 'council_admin';

-- 2. UPDATE MEMBERSHIPS (Migrate Values)
UPDATE public.vakif_memberships
SET role = 'sohbet_member'
WHERE role = 'member';

UPDATE public.vakif_memberships
SET role = 'mesveret_admin'
WHERE role = 'council_admin';

-- 3. UPDATE CONSTRAINT (Enforce New Roles)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('sohbet_member', 'mesveret_admin', 'accountant', 'platform_admin', 'guest'));

-- 4. UPDATE TRIGGER (Use New Default)
DO $$
DECLARE
    target_vakif_id UUID;
BEGIN
    SELECT id INTO target_vakif_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LIMIT 1;
    
    EXECUTE format('
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $func$
        BEGIN
            INSERT INTO public.profiles (id, display_name, vakif_id, role)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>''full_name'', NEW.email),
                %L,
                ''sohbet_member'' -- NEW DEFAULT
            );
            
            INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
            VALUES (
                NEW.id,
                %L,
                ''sohbet_member'' -- NEW DEFAULT
            );

            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', target_vakif_id, target_vakif_id);

END $$;

COMMIT;
