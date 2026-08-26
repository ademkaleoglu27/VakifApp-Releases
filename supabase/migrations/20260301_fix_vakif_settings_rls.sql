-- =====================================================
-- RLS FIX: vakif_settings_manage → Ayrı INSERT/UPDATE/DELETE politikaları
-- 
-- SORUN: FOR ALL politikası SELECT ile çakışıyor.
-- Normal kullanıcılar kendi vakfının flag'lerini okuyamıyordu.
--
-- Zaten migration çalıştırdıysanız bu scripti de çalıştırın.
-- =====================================================

-- Eski politikayı kaldır
DROP POLICY IF EXISTS "vakif_settings_manage" ON public.vakif_settings;

-- Yeni ayrı politikalar
DROP POLICY IF EXISTS "vakif_settings_insert" ON public.vakif_settings;
CREATE POLICY "vakif_settings_insert" ON public.vakif_settings
    FOR INSERT WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "vakif_settings_update" ON public.vakif_settings;
CREATE POLICY "vakif_settings_update" ON public.vakif_settings
    FOR UPDATE USING (public.is_platform_admin());

DROP POLICY IF EXISTS "vakif_settings_delete" ON public.vakif_settings;
CREATE POLICY "vakif_settings_delete" ON public.vakif_settings
    FOR DELETE USING (public.is_platform_admin());

-- Doğrulama: Politikaları listele
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'vakif_settings';
