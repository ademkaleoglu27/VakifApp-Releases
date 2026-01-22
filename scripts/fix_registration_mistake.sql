-- =====================================================
-- FIX REGISTRATION MISTAKE (Emergency Move)
-- =====================================================
-- Bu script:
-- 1. En son oluşturulan VAKFI bulur.
-- 2. En son kayıt olan KULLANICIYI bulur.
-- 3. O kullanıcıyı O vakfa taşır ve Yönetici yapar.

DO $$
DECLARE
    v_target_vakif_id UUID;
    v_target_vakif_name TEXT;
    v_last_user_id UUID;
    v_last_user_email TEXT;
BEGIN
    -- 1. Get Last Vakif
    SELECT id, name INTO v_target_vakif_id, v_target_vakif_name
    FROM public.vakiflar
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. Get Last User
    SELECT id, email INTO v_last_user_id, v_last_user_email
    FROM auth.users
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_target_vakif_id IS NULL OR v_last_user_id IS NULL THEN
        RAISE NOTICE 'Vakıf veya Kullanıcı bulunamadı!';
        RETURN;
    END IF;

    RAISE NOTICE 'Tasiniyor: % -> %', v_last_user_email, v_target_vakif_name;

    -- 3. Update Profile
    UPDATE public.profiles
    SET vakif_id = v_target_vakif_id,
        role = 'mesveret_admin'
    WHERE id = v_last_user_id;

    -- 4. Update Membership
    DELETE FROM public.vakif_memberships WHERE user_id = v_last_user_id;
    
    INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
    VALUES (v_last_user_id, v_target_vakif_id, 'mesveret_admin');

    RAISE NOTICE 'Islem Basarili! Lutfen uygulamayi yenileyin.';
END $$;
