# Multi-Tenant (Çoklu Vakıf) Yönetim Rehberi

## 1. Yeni Vakıf Nasıl Eklenir?
Şu an için yönetim paneli olmadığı için veritabanı üzerinden eklenir.

**Adımlar:**
1.  `scripts/create_new_tenant.sql` dosyasını açın.
2.  `YENI_VAKIF_ADI` ve `YENI_KOD` kısımlarını düzenleyin.
    *   Örnek İsim: `Bursa Medresesi`
    *   Örnek Kod: `BURSA16`
3.  Scripti **Supabase SQL Editor**'de çalıştırın.

Bu işlemden sonra vakıf aktif olur.

## 2. Kullanıcılar Nasıl Katılır?
Yeni üyeler kayıt olurken **Vakıf Kodu** alanına sizin belirlediğiniz kodu (Örn: `BURSA16`) yazmalıdır.
*   **Doğru Kod:** Kullanıcı otomatik olarak `Bursa Medresesi`ne dahil olur.
*   **Yanlış/Boş Kod:** Kullanıcı otomatik olarak `Misafir` moduna düşer (Kirliliği önlemek için).
*   **Sonradan Katılma:** Uygulama içinde "Ayarlar -> Vakıf Değiştir" (veya Kod ile Katıl) ekranından da kod girilerek geçiş yapılabilir.

## 3. Güvenlik (RLS) Nasıl Çalışır?
Sisteme eklediğimiz güvenlik kuralları (`fix_announcements_rls.sql` vb.) sayesinde:
*   Bursa Medresesi üyeleri, **sadece** Bursa'ya ait duyuruları görür.
*   Kuzey Şehir üyeleri, Bursa'yı asla görmez.
*   Her vakıf kendi içinde izole bir "sanal uygulama" gibi çalışır.
*   Yeni vakıf eklediğinizde **ekstra kod yazmanıza gerek yoktur**; kurallar otomatik işler.

## 4. Yönetici Atama
Bir vakfın yöneticisi olmak için, veritabanında o kullanıcının rolünü `mesveret_admin` yapmanız ve `vakif_id`sini ilgili vakfa eşitlemeniz yeterlidir. `create_new_tenant.sql` içinde bunun için hazır bir blok vardır.
