-- =====================================================
-- Vakıf Bazlı Feature Toggle (Modül Yönetimi) Migration
-- Tarih: 2026-03-01
-- =====================================================

-- 1. vakif_settings tablosu
CREATE TABLE IF NOT EXISTS public.vakif_settings (
    vakif_id UUID NOT NULL REFERENCES public.vakiflar(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (vakif_id, feature_key)
);

-- 2. RLS aktifleştir
ALTER TABLE public.vakif_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Politikaları
-- Okuma: Kullanıcı kendi vakfının flag'lerini görebilir VEYA platform admin tüm flag'leri görebilir
DROP POLICY IF EXISTS "vakif_settings_select" ON public.vakif_settings;
CREATE POLICY "vakif_settings_select" ON public.vakif_settings
    FOR SELECT USING (
        vakif_id = public.get_my_vakif_id() 
        OR public.is_platform_admin()
    );

-- Yazma (INSERT/UPDATE/DELETE): Sadece platform admin
DROP POLICY IF EXISTS "vakif_settings_manage" ON public.vakif_settings;

DROP POLICY IF EXISTS "vakif_settings_insert" ON public.vakif_settings;
CREATE POLICY "vakif_settings_insert" ON public.vakif_settings
    FOR INSERT WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "vakif_settings_update" ON public.vakif_settings;
CREATE POLICY "vakif_settings_update" ON public.vakif_settings
    FOR UPDATE USING (public.is_platform_admin());

DROP POLICY IF EXISTS "vakif_settings_delete" ON public.vakif_settings;
CREATE POLICY "vakif_settings_delete" ON public.vakif_settings
    FOR DELETE USING (public.is_platform_admin());

-- 4. Varsayılan feature key'leri tanımla
-- Mevcut tüm vakıflar için tüm modüller varsayılan AÇIK olarak oluşturulur
INSERT INTO public.vakif_settings (vakif_id, feature_key, enabled)
SELECT v.id, f.key, true
FROM public.vakiflar v
CROSS JOIN (
    VALUES 
        ('ai_assistant'),
        ('mesveret'),
        ('muhasebe'),
        ('education'),
        ('okuma_takibi'),
        ('duyurular'),
        ('nobet_yonetimi'),
        ('gorevlendirmeler'),
        ('kutüphane')
) AS f(key)
ON CONFLICT (vakif_id, feature_key) DO NOTHING;

-- 5. RPC: Bir vakfın tüm feature flag'lerini getir
CREATE OR REPLACE FUNCTION public.get_vakif_features_rpc(p_vakif_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(feature_key, enabled)
    INTO result
    FROM public.vakif_settings
    WHERE vakif_id = p_vakif_id;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 6. RPC: Tek bir feature flag'i toggle et (upsert)
CREATE OR REPLACE FUNCTION public.upsert_vakif_feature_rpc(
    p_vakif_id UUID,
    p_feature_key TEXT,
    p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Yetki kontrolü: Sadece platform admin
    IF NOT public.is_platform_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Yetkiniz yok.');
    END IF;

    INSERT INTO public.vakif_settings (vakif_id, feature_key, enabled, updated_at)
    VALUES (p_vakif_id, p_feature_key, p_enabled, now())
    ON CONFLICT (vakif_id, feature_key) 
    DO UPDATE SET enabled = p_enabled, updated_at = now();

    RETURN jsonb_build_object(
        'success', true, 
        'message', format('Feature %s → %s', p_feature_key, CASE WHEN p_enabled THEN 'AÇIK' ELSE 'KAPALI' END)
    );
END;
$$;

-- 7. Trigger: Yeni vakıf oluşturulduğunda otomatik varsayılan flag'ler ekle
CREATE OR REPLACE FUNCTION public.handle_new_vakif_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.vakif_settings (vakif_id, feature_key, enabled)
    VALUES
        (NEW.id, 'ai_assistant', true),
        (NEW.id, 'mesveret', true),
        (NEW.id, 'muhasebe', true),
        (NEW.id, 'education', true),
        (NEW.id, 'okuma_takibi', true),
        (NEW.id, 'duyurular', true),
        (NEW.id, 'nobet_yonetimi', true),
        (NEW.id, 'gorevlendirmeler', true),
        (NEW.id, 'kutüphane', true)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_vakif_created_settings ON public.vakiflar;
CREATE TRIGGER on_vakif_created_settings
    AFTER INSERT ON public.vakiflar
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_vakif_settings();

-- =====================================================
-- DONE
-- After running:
-- 1. vakif_settings tablosu oluşturuldu
-- 2. Mevcut vakıflar için varsayılan flag'ler eklendi
-- 3. RLS ile tenant izolasyonu sağlandı
-- 4. Yeni vakıf oluşturulduğunda otomatik flag'ler eklenir
-- =====================================================
