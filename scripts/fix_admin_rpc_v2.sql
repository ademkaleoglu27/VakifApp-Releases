-- =====================================================
-- ADMIN PANEL FEATURES (Platform Admin Tools) - v2 (Robust Email Handling)
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

    -- Clean Input
    v_clean_email := LOWER(TRIM(p_email));

    -- 2. Find User (Try exact match, then check if Auth table has it differently)
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE LOWER(email) = v_clean_email OR email = v_clean_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Kullanıcı bulunamadı. Lütfen tam e-posta adresini doğru girdiğinizden ve kullanıcının kayıtlı olduğundan emin olun.');
    END IF;

    -- 3. Update Vakif Membership
    INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
    VALUES (v_user_id, p_vakif_id, 'mesveret_admin')
    ON CONFLICT (user_id, vakif_id) DO UPDATE SET role = 'mesveret_admin';

    -- 4. Update Profile
    UPDATE public.profiles 
    SET vakif_id = p_vakif_id, role = 'mesveret_admin'
    WHERE id = v_user_id;

    -- 5. Sync Contact Email on Vakif Table (Store the one that worked, or the clean one)
    UPDATE public.vakiflar
    SET contact_email = v_clean_email
    WHERE id = p_vakif_id;

    RETURN jsonb_build_object('success', true, 'message', 'Yönetici başarıyla atandı.');
END;
$function$;
