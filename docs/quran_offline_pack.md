# Quran Offline Image Pack (GitHub ZIP)

Bu doküman, Kur'an-ı Kerim sayfalarının GitHub üzerinden tek bir ZIP paketi olarak indirilmesi ve çevrimdışı kullanım sürecini açıklar.

## Dağıtım (GitHub Releases)

ZIP paketi GitHub Releases üzerinden asset olarak sunulur.
- **URL**: `https://github.com/ademkaleoglu27/VakifApp-Releases/releases/latest/download/quran_image_pack_v1.zip`

### ZIP İç Yapısı

Paketin düzgün çalışması için ZIP içeriği şu şekilde olmalıdır:

```text
quran_image_pack_v1.zip/
├── manifest.json
└── pages/
    ├── 0001.webp
    ├── 0002.webp
    └── ...
```

## Yapılandırma ve Feature Flag

Sistem `src/config/featureFlags.ts` üzerinden kontrol edilir:
- `QURAN_OFFLINE_PACK_ENABLED`: `true` olduğunda yeni ZIP tabanlı sistemi aktif eder. (Varsayılan: `false`)

## Depolama Yolları (Expo FileSystem)

- **Kök Dizin**: `quran_pages/v1/`
- **Geçici Dizin**: `quran_pages/__stage_v1/`
- **Metal Dosyası**: `quran_pages/v1/install_meta.json`

## Kurulum Süreci (QuranPackService)

`src/services/quran/QuranPackService.ts` aşağıdaki adımları yönetir:
1. **İndirme**: GitHub'dan ZIP dosyasını indirir.
2. **Doğrulama**: Boyut kontrolü yapar (>10MB).
3. **Çıkartma**: ZIP'i geçici (`__stage_v1`) klasöre çıkartır.
4. **Taşıma**: İçeriği doğruladıktan sonra atomik olarak ana klasöre (`v1`) taşır.
5. **Kayıt**: `install_meta.json` dosyasını oluşturur.

## Kullanıcı Deneyimi

- **Reader**: Eğer paket kurulu değilse ve flag aktifse, kullanıcıya "İndir ve Başlat" butonu içeren bir ekran gösterilir.
- **DevTools**: Geliştiriciler için "Kur", "Doğrula" ve "Sil" butonları sunulur.

## Test Checklist

1. **Flag Aktif Et**: `QURAN_OFFLINE_PACK_ENABLED` değerini `true` yap.
2. **Kurulum**: DevTools veya Reader üzerinden paketi kur.
3. **Çevrimdışı Test**: Uçak modunu aç ve Kur'an sayfalarının yüklendiğini teyit et.
4. **Silme**: DevTools üzerinden paketi sil ve Reader'ın tekrar indirme ekranına döndüğünü gör.
