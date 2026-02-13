# 📚 Kütüphane Koruma Kontratı (Library Protection Contract)

> **Versiyon:** 1.1  
> **Tarih:** 2026-01-19  
> **Durum:** 🔒 AKTİF - Bu kontrat geçerlidir ve teknik olarak enforce edilmektedir

---

## 🎯 Amaç

Bu kontrat, **VakifApp** uygulamasındaki kütüphane modülünün (Büyük Kitaplar, Küçük Kitaplar, Kur'an-ı Kerim) stabilitesini ve izolasyonunu **teknik olarak** garanti altına almak için oluşturulmuştur.

---

## � Canonical Book ID Standardı

### Kur'an-ı Kerim
```
Canonical Book ID: quran.pdf@vakifapp
```

Bu ID, `booksRegistry.ts`, navigasyon ve tüm referanslarda **tek ve tutarlı** olarak kullanılmalıdır.

### Risale-i Nur Kitapları
Format: `risale.[kitap]@diyanet.tr`
- `risale.sozler@diyanet.tr`
- `risale.mektubat@diyanet.tr`
- vb.

---

## 📄 Sayfa Kuralları (604/616)

| Kavram | Değer | Açıklama |
|--------|-------|----------|
| `corePages` | **604** | Mushaf navigasyonu (Cüz/Sure mapping) için sabit sayfa sayısı |
| `actualPages` | Değişken (örn. 616) | PDF'in gerçek toplam sayfa sayısı |
| `allowExtraPages` | `true` | Ek sayfalar (hatim duası, bilgilendirme) izinlidir |

### Kurallar
1. ✅ Cüz/Sure mapping **yalnızca** `corePages` (604) için sabittir ve **değiştirilemez**
2. ✅ PDF'in extra sayfaları (`actualPages > 604`) kesilmez, viewer son sayfaya kadar gösterir
3. ⚠️ `actualPages < 604` durumunda Cüz/Sure jump **devre dışı bırakılabilir** (degraded mode)

---

## � FROZEN Modüller

Aşağıdaki path'ler **FROZEN** (dondurulmuş) olarak işaretlenmiştir ve `CONTRACT_EXCEPTION_TOKEN` olmadan değiştirilemez:

### Tam FROZEN Path'ler
```
src/features/quran-pdf/           → Kur'an PDF okuyucu tüm dosyaları
src/features/reader/html_pilot/   → Risale HTML okuyucu tüm dosyaları
assets/content/                   → Tüm HTML içerik dosyaları
src/features/library/screens/LibraryHomeScreen.tsx
src/config/quranMaps.ts
```

### FROZEN_BLOCK İçeren Dosyalar
```
src/config/booksRegistry.ts
```

Bu dosyada:
- `// FROZEN_BLOCK_START` ile `// FROZEN_BLOCK_END` arasındaki kayıtlar **değiştirilemez**
- Blok dışına **yeni kitap eklenebilir**

---

## 📁 Metadata Dosyaları

| Dosya | Rol | Durum |
|-------|-----|-------|
| `src/features/quran-pdf/data/quran_metadata.json` | Cüz/Sure → sayfa mapping (core navigation) | 🔒 FROZEN |
| `src/config/quranMaps.ts` | Q_JUZ_MAP, Q_SURAH_MAP exportları | 🔒 FROZEN |
| `assets/content/content.meta.json` | Risale HTML içerik manifesti | 🔒 FROZEN |

---

## ✅ İzin Verilen İşlemler

### Yeni Kitap Ekleme
```typescript
// ✅ DOĞRU: FROZEN_BLOCK_END sonrasına yeni kitap
// FROZEN_BLOCK_END

BOOKS_REGISTRY.push({
    id: 'cevsen',
    title: 'Cevşen',
    icon: 'moon-outline',
    enabled: true,
    bookId: 'dua.cevsen@vakifapp'
});
```

### Yeni Özellik Ekleme
- ✅ `src/features/yeni-ozellik/` klasörü oluşturma
- ✅ Navigasyona yeni route ekleme
- ✅ `assets/yeni-ozellik/` klasörü oluşturma
- ✅ Dokümantasyon güncelleme (`docs/`, `README.md`)

---

## ❌ Yasaklar

> [!CAUTION]
> Aşağıdaki işlemler `CONTRACT_EXCEPTION_TOKEN` olmadan **KESİNLİKLE YASAKTIR**:

1. **FROZEN path içindeki herhangi bir dosyayı değiştirmek**
2. **FROZEN_BLOCK içindeki kitap kayıtlarını değiştirmek**
3. **`quran_metadata.json` içindeki Cüz/Sure sayfa numaralarını değiştirmek**
4. **`content.meta.json` dosyasını silmek veya bozmak**
5. **`PAGE_OFFSET` sabitini değiştirmek** (Kapak sayfası dengelemesi = 1)

---

## 🔄 PDF URL Değişiklik Prosedürü

PDF indirme URL'si **test edilmeden değiştirilemez**. Değişiklik için:

1. ✅ PDF indirilebiliyor olmalı
2. ✅ `actualPages >= 604` doğrulanmalı
3. ✅ Cüz/Sure mapping core sayfalarda (1-604) doğru çalışmalı
4. ✅ Test sonuçları commit mesajında belgelenmeli

---

## 🛡️ Teknik Enforcement

### Guard Script
```bash
npm run contract:check
```

Script (`scripts/library_contract_guard.js`):
- Git diff'teki FROZEN path değişikliklerini tespit eder
- FROZEN_BLOCK içi modifikasyonları algılar
- Violation varsa build'i **fail** eder

### Exception Token
FROZEN dosyalarda değişiklik yapmak için commit mesajına token ekleyin:
```bash
git commit -m "fix: critical update CONTRACT_EXCEPTION_TOKEN"
```

Veya environment variable kullanın:
```bash
set CONTRACT_EXCEPTION_TOKEN=true
git commit -m "fix: critical update"
```

---

## � Book ID Rezervasyonları

| Book ID | Kitap | Durum |
|---------|-------|-------|
| `quran.pdf@vakifapp` | Kur'an-ı Kerim | ✅ Aktif |
| `risale.sozler@diyanet.tr` | Sözler | ✅ Aktif |
| `risale.mektubat@diyanet.tr` | Mektubat | ✅ Aktif |
| `risale.lemalar@diyanet.tr` | Lem'alar | ✅ Aktif |
| `risale.sualar@diyanet.tr` | Şuâlar | ✅ Aktif |
| `dua.cevsen@vakifapp` | Cevşen | 🔜 Planlandı |
| `evrad.tesbihat@vakifapp` | Tesbihat | 🔜 Planlandı |

---

## 🏗️ İzolasyon Mimarisi

```
┌─────────────────────────────────────────────────────────────────┐
│                        VakifApp                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │   Kur'an PDF   │  │  Risale HTML   │  │  Cevşen/Dua    │    │
│  │    Modülü      │  │   Okuyucu      │  │  (Gelecek)     │    │
│  │    🔒 FROZEN   │  │   🔒 FROZEN    │  │   🟢 OPEN      │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              booksRegistry.ts                           │   │
│  │   ┌─────────────────────┐  ┌─────────────────────┐     │   │
│  │   │  FROZEN_BLOCK       │  │  OPEN BLOCK         │     │   │
│  │   │  (Mevcut kitaplar)  │  │  (Yeni kitaplar)    │     │   │
│  │   │  🔒 Değiştirilemez  │  │  🟢 Eklenebilir     │     │   │
│  │   └─────────────────────┘  └─────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Paylaşılan Servisler (🟢 Değiştirilebilir)      │   │
│  │         Navigation, Theme, Auth, Sync                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## � Runtime Fingerprint (Opsiyonel)

> [!NOTE]
> Bu özellik opsiyoneldir ve gelecekte eklenebilir.

`quran_metadata.json` ve `content.meta.json` için SHA-256 fingerprint mekanizması:
- Uygulama açılışında fingerprint karşılaştırması
- Uyumsuzluk varsa:
  - "ContractViolation" log/uyarısı
  - Safe mode: Temel kütüphane akışı korunur, crash olmaz

---

## 📝 Kontrat Geçmişi

| Versiyon | Tarih | Değişiklikler |
|----------|-------|---------------|
| 1.0 | 2026-01-19 | İlk sürüm |
| 1.1 | 2026-01-19 | Canonical Book ID standardı, 604/616 sayfa kuralları, Guard Script, FROZEN_BLOCK markers |

---

**Bu kontrat VakifApp geliştirme sürecinde geçerlidir ve ancak kullanıcı onayı ile değiştirilebilir.**
