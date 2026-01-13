# KONTROL NOKTASI: V2 Ingest Altyapısı Kilitlendi
**Tarih:** 2026-01-13
**Durum:** KİLİTLENDİ / STABİL

## Genel Bakış
"Kitap Kimliği" ve "Ingest Pipeline" mimarisi kuruldu ve katı bir şekilde uygulanmaya başlandı. Tüm geçiş köprüleri ve geri dönüş yolları (fallback) kaldırıldı.

## Uygulama Kuralları (Kod Seviyesi)
1.  **Katı Navigasyon:** `RisaleVirtualPageSectionList`, `section_uid` eksikse hata fırlatır (navigasyonu durdurur).
2.  **Katı Okuyucu:** `RisaleVirtualPageReaderScreen`, `risale.` ile başlamayan `bookId` değerlerini engeller.
3.  **Sadece-Birleştirme (Merge-Only) Ingest:** Ingest çalıştırıcısı (`tools/ingest/run_ingest.ts`) SİLME (DELETE) veya TABLO BOŞALTMA (TRUNCATE) işlemlerini desteklemez.
4.  **Değişmez Kimlik:** `section_uid` deterministik olarak üretilir ve `UNIQUE(book_id, section_uid)` ile veritabanı seviyesinde korunur.

## Kritik Dosyalar
- `src/content/manifests/library_manifest.json` (Kütüphane Kaydı)
- `tools/ingest/sectionUid.ts` (Kimlik Üretim Mantığı)
- `src/services/risaleRepo.ts` (Veri Erişimi)

## Kurtarma
Daha esnek bir duruma geri dönmek gerekirse, bu kontrol noktasından önceki commit'e `git checkout` yapın.
Yeni kitap eklemek için `tools/ingest/run_ingest.ts` aracını kullanın.
