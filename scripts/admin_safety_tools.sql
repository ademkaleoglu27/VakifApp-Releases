-- =====================================================
-- ADMIN SAFETY TOOLS (Delete & Reset RPCs) - v4 (Resilient)
-- =====================================================

-- 1. DELETE TENANT RPC (Cascading Delete)
CREATE OR REPLACE FUNCTION public.delete_tenant_rpc(
    p_vakif_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_role TEXT;
BEGIN
    -- Auth Check
    SELECT role INTO v_role FROM public.vakif_memberships 
    WHERE user_id = auth.uid() AND role = 'platform_admin';

    IF v_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Safety Check
    IF EXISTS (SELECT 1 FROM public.vakiflar WHERE id = p_vakif_id AND (code = 'MISAFIR' OR code = 'KUZEY')) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sistem vakıfları silinemez!');
    END IF;

    -- CASCADING DELETE LOGIC (Best Effort w/ Error Suppression)
    
    -- A. Transactions & Contacts (Known Structure)
    BEGIN
        DELETE FROM public.transactions 
        WHERE contact_id IN (SELECT id FROM public.contacts WHERE vakif_id = p_vakif_id);
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        DELETE FROM public.contact_readings 
        WHERE contact_id IN (SELECT id FROM public.contacts WHERE vakif_id = p_vakif_id);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DELETE FROM public.contacts WHERE vakif_id = p_vakif_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- B. Modules (Try via vakif_id first, catch others)
    -- Many tables might not have vakif_id, so we try created_by.
    -- If created_by doesn't exist, we skip.
    
    BEGIN
        DELETE FROM public.decisions WHERE vakif_id = p_vakif_id;
    EXCEPTION WHEN OTHERS THEN 
        -- Try created_by
        BEGIN
            DELETE FROM public.decisions 
            WHERE created_by IN (SELECT user_id FROM public.vakif_memberships WHERE vakif_id = p_vakif_id);
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END;

    BEGIN
        DELETE FROM public.assignments WHERE vakif_id = p_vakif_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        DELETE FROM public.announcements WHERE vakif_id = p_vakif_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    BEGIN
        DELETE FROM public.hatims WHERE vakif_id = p_vakif_id;
    EXCEPTION WHEN OTHERS THEN 
        BEGIN
             DELETE FROM public.hatims 
             WHERE created_by IN (SELECT user_id FROM public.vakif_memberships WHERE vakif_id = p_vakif_id);
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END;

    -- C. Reading Logs (Strict)
    BEGIN
        DELETE FROM public.reading_logs WHERE vakif_id = p_vakif_id;
    EXCEPTION WHEN OTHERS THEN
        DELETE FROM public.reading_logs 
        WHERE user_id IN (SELECT user_id FROM public.vakif_memberships WHERE vakif_id = p_vakif_id);
    END;

    -- D. Memberships & Profiles
    DELETE FROM public.vakif_memberships WHERE vakif_id = p_vakif_id;

    UPDATE public.profiles 
    SET vakif_id = NULL, role = 'guest'
    WHERE vakif_id = p_vakif_id;

    -- E. The Vakif
    DELETE FROM public.vakiflar WHERE id = p_vakif_id;

    RETURN jsonb_build_object('success', true, 'message', 'Vakıf silindi (Hatalar yutuldu, temizlik yapıldı).');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;


-- 2. REMOVE MEMBER RPC (Individual)
CREATE OR REPLACE FUNCTION public.remove_vakif_member_rpc(
    p_vakif_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_role TEXT;
BEGIN
    -- Auth: Platform Admin OR The Vakif Admin (Mesveret Admin)
    IF NOT EXISTS (
        SELECT 1 FROM public.vakif_memberships 
        WHERE user_id = auth.uid() 
        AND (role = 'platform_admin' OR (role = 'mesveret_admin' AND vakif_id = p_vakif_id))
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Delete Membership
    DELETE FROM public.vakif_memberships WHERE vakif_id = p_vakif_id AND user_id = p_user_id;

    -- Reset Profile
    UPDATE public.profiles 
    SET vakif_id = NULL, role = 'guest'
    WHERE id = p_user_id AND vakif_id = p_vakif_id;

    RETURN jsonb_build_object('success', true, 'message', 'Üye vakıftan çıkarıldı.');
END;
$function$;


-- 3. RESET RPC (Standard)
CREATE OR REPLACE FUNCTION public.reset_platform_stats_rpc(
    p_confirm TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.vakif_memberships WHERE user_id = auth.uid() AND role = 'platform_admin';
    IF v_role IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Unauthorized'); END IF;
    IF p_confirm <> 'SIFIRLA' THEN RETURN jsonb_build_object('success', false, 'message', 'Onay kodu hatalı.'); END IF;

    TRUNCATE TABLE public.reading_logs CASCADE;
    TRUNCATE TABLE public.hatim_parts CASCADE;
    TRUNCATE TABLE public.hatims CASCADE;

    RETURN jsonb_build_object('success', true, 'message', 'Tüm veriler sıfırlandı.');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
