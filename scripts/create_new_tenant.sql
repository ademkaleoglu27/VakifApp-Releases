-- =====================================================
-- TEMPLATE: CREATE NEW TENANT (VAKIF)
-- =====================================================
-- Kullanım:
-- 1. 'YENI_VAKIF_ADI' yazan yeri vakıf ismiyle değiştirin.
-- 2. 'YENI_KOD' yazan yeri benzersiz bir kodla değiştirin (Örn: 'ANKARA2024').
-- 3. (İsteğe Bağlı) İlk yöneticiyi atamak için alttaki bloğu kullanın.
-- =====================================================

-- 1. Vakıf Oluştur
INSERT INTO public.vakiflar (id, name, code, created_at)
VALUES (
  gen_random_uuid(),       -- Otomatik ID üretir
  'YENI_VAKIF_ADI',        -- Örn: 'Ankara Medresesi'
  'YENI_KOD',              -- Örn: 'ANKARA06'
  NOW()
);

-- =====================================================
-- (OPSİYONEL) MEVCUT BİR KULLANICIYI BU VAKFA YÖNETİCİ YAPMA
-- Hali hazırda kayıtlı olan bir kullanıcının emailini yazın.
-- =====================================================
/*
DO $$
DECLARE
  v_new_vakif_id UUID;
  v_user_email TEXT := 'yonetici@ornek.com'; -- Burayı değiştirin
BEGIN
  -- Yeni oluşturulan vakfın ID'sini bul
  SELECT id INTO v_new_vakif_id FROM public.vakiflar WHERE code = 'YENI_KOD';
  
  IF v_new_vakif_id IS NOT NULL THEN
      -- Kullanıcının profilini güncelle
      UPDATE public.profiles 
      SET vakif_id = v_new_vakif_id, role = 'mesveret_admin'
      WHERE id = (SELECT id FROM auth.users WHERE email = v_user_email);

      -- Üyelik kaydını güncelle veya ekle
      INSERT INTO public.vakif_memberships (user_id, vakif_id, role)
      VALUES ((SELECT id FROM auth.users WHERE email = v_user_email), v_new_vakif_id, 'mesveret_admin')
      ON CONFLICT (user_id, vakif_id) 
      DO UPDATE SET role = 'mesveret_admin';
  END IF;
END $$;
*/
