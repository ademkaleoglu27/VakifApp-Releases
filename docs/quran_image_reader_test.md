# Quran Image Reader (WebP) Test Checklist

Bu doküman, Kur'an Resim Okuyucusu (WebP) modülünün doğru çalıştığını ve mevcut sisteme zarar vermediğini (zero regression) doğrulamak için hazırlanmıştır.

## 1. Hazırlık
- [ ] `src/config/featureFlags.ts` içindeki `QURAN_IMAGE_READER_ENABLED` bayrağını `true` yapın.
- [ ] `npx expo start --dev-client` ile uygulamayı başlatın.

## 2. Erişim ve Görünürlük
- [ ] **Developer Tools** menüsünü açın.
- [ ] "Quran Image Reader (WebP)" butonunun göründüğünü doğrulayın.
- [ ] Butona basınca `QuranImageReaderScreen` ekranının açıldığını doğrulayın.

## 3. Bağlantı ve Manifest (Supabase)
- [ ] Uygulama açılırken "Yükleniyor..." göstergesi ve ardından manifest'in başarılı çekildiğini (toplam 616 sayfa) doğrulayın.
- [ ] **Hata Durumu:** İnterneti kapatıp okuyucuyu açın. "Manifest indirilemedi. İnternet bağlantısını kontrol edin." mesajı ve "Geri Dön" butonunu görün.

## 4. Görsel Yükleme ve Paging
- [ ] İlk sayfaların (0001, 0002) başarıyla yüklendiğini doğrulayın.
- [ ] Dikey kaydırma (vertical scroll) işleminin akıcı (smooth GPU acceleration) olduğunu kontrol edin.
- [ ] Sayfaların altında "Sayfa X" etiketinin doğru numarayla göründüğünü doğrulayın.
- [ ] **Hata Durumu:** Görsel yüklenemediğinde "Yeniden Dene" butonunun çıktığını ve basınca görseli tekrar çekmeye çalıştığını doğrulayın.

## 5. Sıfır Regresyon (Kritik)
- [ ] **Risale Okuyucu:** Kütüphaneden herhangi bir Risale kitabını açın ve metin okuyucunun (html_pilot) sorunsuz çalıştığını teyit edin.
- [ ] **Library:** Ana kütüphane listesinin ve kategorizasyonun (Büyük/Küçük kitap) değişmediğini doğrulayın.
- [ ] **Packs:** İçerik paketleri (content packs) akışında bozulma olmadığını (İndirme ekranı vb.) teyit edin.

## 6. Temizlik
- [ ] Test bittikten sonra `QURAN_IMAGE_READER_ENABLED` bayrağını tekrar `false` konumuna getirin.
