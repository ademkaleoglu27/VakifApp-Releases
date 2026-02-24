-- 20260224_add_vakif_id_constraint.sql
-- Konu: Mevcut Okuma Verilerinin Korunması ve Vakıf ID Sabitlemesi
-- Amaç: Uygulamadaki geçersiz 0000...0000 ID'li kayıtları silmek yerine
-- resmi varsayılan vakıf olan 00000000-0000-0000-0000-000000000001 ID'sine taşıyıp,
-- sadece 0000...0000 girişlerini kesin olarak bloke etmek.

BEGIN;

DO $$
DECLARE
    v_default_vakif UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    v_zero_vakif UUID := '00000000-0000-0000-0000-000000000000'::uuid;
BEGIN
    -- 1. Varsayılan Vakıf Kaydını Güvence Altına Al
    -- Eğer vakıflar tablosunda bu ID yoksa öncelikle oluşturalım (Tablo adı vakiflar olarak varsayıldı)
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'vakiflar'
    ) THEN
        INSERT INTO public.vakiflar (id, name, created_at, api_key)
        VALUES (v_default_vakif, 'Varsayılan Temel Vakıf', now(), 'default-key')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- 2. Mevcut Olan Tüm Sıfır (0000...) Kayıtları Gerçek Varsayılan Vakfa (0000...0001) Taşı
    
    -- Okuma Kayıtları (reading_logs) Batch Update
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reading_logs') THEN
        UPDATE public.reading_logs 
        SET vakif_id = v_default_vakif 
        WHERE vakif_id IS NULL OR vakif_id = v_zero_vakif;
    END IF;

    -- Heyet Kararları (decisions) Batch Update
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decisions') THEN
        UPDATE public.decisions 
        SET vakif_id = v_default_vakif 
        WHERE vakif_id IS NULL OR vakif_id = v_zero_vakif;
    END IF;

    -- Kişiler (contacts) Batch Update
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
        UPDATE public.contacts 
        SET vakif_id = v_default_vakif 
        WHERE vakif_id IS NULL OR vakif_id = v_zero_vakif;
    END IF;

    -- Karar Maddeleri (decision_items) Batch Update
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'decision_items') THEN
        UPDATE public.decision_items 
        SET vakif_id = v_default_vakif 
        WHERE vakif_id IS NULL OR vakif_id = v_zero_vakif;
    END IF;

END $$;

-- 3. Geleceği Kilitle (Sadece tam sıfır olanları engelliyoruz, 0001 geçerli bir ID kalıyor)
ALTER TABLE public.reading_logs DROP CONSTRAINT IF EXISTS check_reading_logs_vakif_id;
ALTER TABLE public.reading_logs ADD CONSTRAINT check_reading_logs_vakif_id CHECK (vakif_id IS NOT NULL AND vakif_id != '00000000-0000-0000-0000-000000000000'::uuid);

COMMIT;
