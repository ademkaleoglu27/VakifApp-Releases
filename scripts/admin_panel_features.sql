-- =====================================================
-- ADMIN PANEL FEATURES (Platform Admin Tools)
-- =====================================================

-- 1. ASSIGN ADMIN MANUALLY (RPC)
CREATE OR REPLACE FUNCTION public.assign_admin_rpc(
    p_vakif_id UUID,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_user_id UUID;
    v_clean_email TEXT;
BEGIN
    -- 1. Check Auth (Platform Admin Only)
    IF NOT EXISTS (
        SELECT 1 FROM public.vakif_memberships 
        WHERE user_id = auth.uid() AND role = 'platform_admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    v_clean_email := LOWER(TRIM(p_email));

    -- 2. Find User
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found');
    END IF;

    -- 3. Update Roles
    INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
    VALUES (v_user_id, p_vakif_id, 'mesveret_admin')
    ON CONFLICT (user_id, vakif_id) DO UPDATE SET role = 'mesveret_admin';

    UPDATE public.profiles 
    SET vakif_id = p_vakif_id, role = 'mesveret_admin'
    WHERE id = v_user_id;

    -- 4. Sync Contact Email on Vakif Table
    UPDATE public.vakiflar
    SET contact_email = v_clean_email
    WHERE id = p_vakif_id;

    RETURN jsonb_build_object('success', true, 'message', 'Admin assigned successfully');
END;
$function$;


-- 2. GET VAKIF MEMBERS (RPC)
CREATE OR REPLACE FUNCTION public.get_vakif_members_rpc(
    p_vakif_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_result JSONB;
BEGIN
    -- 1. Check Auth
    IF NOT EXISTS (
        SELECT 1 FROM public.vakif_memberships 
        WHERE user_id = auth.uid() AND role = 'platform_admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- 2. Fetch Members
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'name', p.display_name,
            'role', p.role,
            'email', (SELECT email FROM auth.users WHERE id = p.id) -- Lookup email
        )
    ) INTO v_result
    FROM public.profiles p
    WHERE p.vakif_id = p_vakif_id;

    RETURN jsonb_build_object('success', true, 'data', COALESCE(v_result, '[]'::jsonb));
END;
$function$;


-- 3. GET MISAFIR STATS (RPC)
CREATE OR REPLACE FUNCTION public.get_misafir_stats_rpc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_misafir_id UUID;
    v_count INT;
    v_users JSONB;
BEGIN
    -- 1. Check Auth
    IF NOT EXISTS (
        SELECT 1 FROM public.vakif_memberships 
        WHERE user_id = auth.uid() AND role = 'platform_admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- 2. Get Misafir ID
    SELECT id INTO v_misafir_id FROM public.vakiflar WHERE UPPER(TRIM(code)) = 'MISAFIR';
    
    IF v_misafir_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Misafir tenant not found');
    END IF;

    -- 3. Count
    SELECT count(*) INTO v_count FROM public.profiles WHERE vakif_id = v_misafir_id;

    -- 4. Get List (Limit 100 for safety)
    SELECT jsonb_agg(
        jsonb_build_object(
            'email', (SELECT email FROM auth.users WHERE id = p.id),
            'name', p.display_name,
            'joined_at', (SELECT created_at FROM auth.users WHERE id = p.id)
        ) ORDER BY (SELECT created_at FROM auth.users WHERE id = p.id) DESC
    ) INTO v_users
    FROM public.profiles p
    WHERE p.vakif_id = v_misafir_id
    LIMIT 100;

    RETURN jsonb_build_object(
        'success', true, 
        'count', v_count, 
        'users', COALESCE(v_users, '[]'::jsonb)
    );
END;
$function$;
