-- =================================================================================
-- LÜGAT (DICTIONARY) VEKTÖR OPTİMİZASYONU (HALFVEC - 16 BIT)
-- =================================================================================
-- KRİTİK UYARI: Bu işlem 45.000+ satırı baştan yazacağı için Supabase web arayüzünde
-- KESİNLİKLE 'Upstream Timeout' hatası verecektir. Bu hata çıksa bile işlem arka 
-- planda çalışmaya devam eder, lütfen iptal etmeyin ve işlemin bitmesi için 
-- 5-10 dakika bekleyin.
-- =================================================================================

-- 1. ADIM: Eklenti Sürüm Kontrolü
-- Halfvec desteği pgvector 0.7.0 ve üzerinde mevcuttur.
-- Eğer eklenti eski ise önce update edilmelidir.
-- SQL Çıktısında 'vector' versiyonunun 0.7.0+ olduğunu teyit edin.
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Eğer gerekliyse eklentiyi güncellemek için (Yorumu kaldırıp çalıştırabilirsiniz):
-- ALTER EXTENSION vector UPDATE;

-- 2. ADIM: Veri Tipi Dönüşümü (Compression)
-- float32 (32-bit) vektörleri float16 (16-bit) halfvec formatına dönüştürür.
-- Bu işlem disk kullanımını yaklaşık %50 oranında azaltacaktır.

-- Önce varsa zaman aşımını artıralım
SET statement_timeout = '30min';

-- Dönüşümü başlatalım
ALTER TABLE public.risale_dictionary 
ALTER COLUMN embedding TYPE halfvec(768) USING embedding::halfvec(768);

-- 3. ADIM: İndeksleri Yenileme (Eğer varsa)
-- Eğer ivfflat veya hnsw indeksi kullanıyorsanız, bunlar halfvec ile uyumlu 
-- şekilde yeniden oluşturulmalıdır. Eğer varsayılan RAG sorguları yavaşlarsa 
-- indeksleri kontrol edin.

-- 4. ADIM: Final Temizlik (Opsiyonel ama Önerilir)
-- Dönüşüm sonrası eski veri bloklarını temizlemek için:
-- VACUUM FULL public.risale_dictionary;

-- İŞLEM TAKİP SORGUSU:
-- Eğer timeout alırsanız arkada çalışıp çalışmadığını şu sorguyla görebilirsiniz:
-- SELECT query, state, duration FROM pg_stat_activity WHERE query LIKE '%halfvec%';
