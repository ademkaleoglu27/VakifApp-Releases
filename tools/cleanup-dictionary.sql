-- =================================================================================
-- LÜGAT (DICTIONARY) TEMİZLİĞİ VE OPTİMİZASYON BETİĞİ
-- =================================================================================
-- HATA NOTU 1: "VACUUM cannot run inside a transaction block" -> Yeni tabda tek çalıştırın.
-- HATA NOTU 2: "Upstream timeout" -> Aşağıdaki timeout komutunu kullanın.
-- =================================================================================

-- 1. ADIM: Mükerrer Kayıtları Temizleme (Deduplication)
-- Bu işlem güvenlidir ve işlem bloğu içinde çalışabilir.
DELETE FROM public.risale_dictionary a
USING public.risale_dictionary b
WHERE a.id > b.id 
  AND a.word = b.word;

-- 2. ADIM: Geleceği Koruma (Unique Constraint)
-- Aynı kelimenin tekrar kaydedilmesini engeller.
ALTER TABLE public.risale_dictionary 
ADD CONSTRAINT unique_risale_word UNIQUE (word);

-- ---------------------------------------------------------------------------------
-- [KRİTİK ÇÖZÜM 2] UPSTREAM TIMEOUT (ZAMAN AŞIMI) DURUMUNDA
-- ---------------------------------------------------------------------------------

-- NOT 1: "Upstream Timeout" hatası almanız, işlemin durduğu anlamına gelmez.
-- Genellikle sayfa zaman aşımına uğrar ama veritabanı arkada çalışmaya devam eder.

-- A. İşlem Arkada Çalışıyor mu? (Kontrol Sorgusu)
-- Bu sorguyu çalıştırarak VACUUM'un ilerleyişini görebilirsiniz:
SELECT phase, heap_blks_total, heap_blks_scanned, 
       (100 * heap_blks_scanned / GREATEST(heap_blks_total, 1)) as percent_complete
FROM pg_stat_progress_vacuum 
WHERE relid = 'public.risale_dictionary'::regclass;

-- B. Alternatif Yöntem: Tabloyu Yeniden İnşa Etme (Daha Hızlı Olabilir)
-- Eğer VACUUM FULL hiçbir şekilde bitmiyorsa, tabloyu kopyalayıp yer değiştirebiliriz.
-- Bu yöntem genellikle VACUUM FULL'den çok daha hızlıdır.

/* ESKİ TABLOYU YENİSİYLE DEĞİŞTİRME (OPSİYONEL - SADECE VACUUM BİTMİYORSA):
-- 1. Temiz veriyi yeni bir tabloya aktar
CREATE TABLE risale_dictionary_new AS 
SELECT id, word, definition, embedding FROM risale_dictionary;

-- 2. Eski tabloyu sil (Disk alanı burada boşalır)
DROP TABLE risale_dictionary;

-- 3. Yeni tablonun adını değiştir
ALTER TABLE risale_dictionary_new RENAME TO risale_dictionary;

-- 4. Kısıtlamayı tekrar ekle
ALTER TABLE risale_dictionary ADD COLUMN id BIGSERIAL PRIMARY KEY; -- Eğer ID seri ise
ALTER TABLE risale_dictionary ADD CONSTRAINT unique_risale_word UNIQUE (word);
*/
