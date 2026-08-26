-- =====================================================
-- FIX REGISTRATION FINAL V2 (Constraint Update)
-- Date: 2026-01-21
-- Description: 
-- 1. Updates 'profiles_role_check' to ALLOW 'member'.
-- 2. Repairs the user you just created.
-- 3. Restores the automation trigger safely.
-- =====================================================

BEGIN;

-- 1. UPDATE CONSTRAINT TO ALLOW 'member' and others
-- We drop the old check and add a new inclusive one.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('member', 'council_admin', 'accountant', 'platform_admin', 'guest', 'sohbet_member'));


DO $$
DECLARE
    target_vakif_id UUID;
BEGIN
    -- 2. GET VAKIF ID
    SELECT id INTO target_vakif_id FROM public.vakiflar WHERE name ILIKE '%Kuzey%' LIMIT 1;
    
    -- 3. REPAIR MISSING PROFILES (For your current user)
    INSERT INTO public.profiles (id, display_name, vakif_id, role)
    SELECT 
        au.id, 
        COALESCE(au.raw_user_meta_data->>'full_name', au.email),
        target_vakif_id,
        'member'
    FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);

    -- 4. REPAIR MISSING MEMBERSHIPS
    INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
    SELECT 
        p.id, 
        target_vakif_id, 
        'member'
    FROM public.profiles p
    WHERE p.vakif_id = target_vakif_id
      AND NOT EXISTS (SELECT 1 FROM public.vakif_memberships vm WHERE vm.user_id = p.id);

    -- 5. RESTORE TRIGGER
    EXECUTE format('
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $func$
        BEGIN
            INSERT INTO public.profiles (id, display_name, vakif_id, role)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>''full_name'', NEW.email),
                %L,
                ''member''
            );
            
            INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
            VALUES (
                NEW.id,
                %L,
                ''member''
            );

            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ', target_vakif_id, target_vakif_id);
    
    -- Re-bind trigger
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

END $$;

COMMIT;
