# 📚 Kütüphane Koruma Kontratı (Library Protection Contract)

> **Versiyon:** 1.0  
> **Tarih:** 2026-01-19  
> **Durum:** 🔒 AKTİF - Bu kontrat geçerlidir

---

## 🎯 Amaç

Bu kontrat, **VakifApp** uygulamasındaki kütüphane modülünün (Büyük Kitaplar, Küçük Kitaplar, Kur'an-ı Kerim) stabilitesini ve izolasyonunu garanti altına almak için oluşturulmuştur.

---

## 🔐 Korunan Modüller

Aşağıdaki modüller **değiştirilemez (FROZEN)** olarak işaretlenmiştir:

### 1. Kur'an-ı Kerim PDF Modülü
| Dosya | Durum |
|-------|-------|
| `src/features/quran-pdf/screens/QuranReaderScreen.tsx` | 🔒 FROZEN |
| `src/features/quran-pdf/screens/QuranMenuScreen.tsx` | 🔒 FROZEN |
| `src/features/quran-pdf/screens/QuranDownloaderScreen.tsx` | 🔒 FROZEN |
| `src/features/quran-pdf/data/quran_metadata.json` | 🔒 FROZEN |
| `src/config/quranMaps.ts` | 🔒 FROZEN |

### 2. Risale-i Nur HTML Okuyucu
| Dosya | Durum |
|-------|-------|
| `src/features/reader/html_pilot/RisaleHtmlReaderScreen.tsx` | 🔒 FROZEN |
| `src/features/reader/html_pilot/RisaleHtmlReaderHomeScreen.tsx` | 🔒 FROZEN |
| `assets/content/` (tüm .html dosyaları) | 🔒 FROZEN |
| `assets/content/content.meta.json` | 🔒 FROZEN |

### 3. Kütüphane Ana Ekranları
| Dosya | Durum |
|-------|-------|
| `src/features/library/screens/LibraryHomeScreen.tsx` | 🔒 FROZEN |
| `src/config/booksRegistry.ts` | 🔒 FROZEN (mevcut kayıtlar) |

---

## ✅ İzin Verilen İşlemler

### Yeni Kitap Ekleme (Cevşen, Tesbihat, vb.)
```typescript
// ✅ DOĞRU: Yeni book ID ile kayıt
{
  id: 'cevsen',      // Benzersiz ID
  title: 'Cevşen',
  category: 'dua',   // Farklı kategori
  // ...
}

// ❌ YANLIŞ: Mevcut ID'yi değiştirme
{
  id: 'sozler',  // ASLA DEĞİŞTİRİLEMEZ
  // ...
}
```

### Yeni Özellik Ekleme
- ✅ Yeni ekran dosyaları oluşturma (`src/features/yeni-ozellik/`)
- ✅ Navigasyona yeni route ekleme
- ✅ Yeni asset klasörü oluşturma (`assets/yeni-ozellik/`)

---

## ❌ Yasaklanan İşlemler

> [!CAUTION]
> Aşağıdaki işlemler **KESİNLİKLE YASAKTIR**:

1. **Mevcut kitap ID'lerini değiştirmek**
   - `sozler`, `mektubat`, `lemalar`, vb.

2. **`quran_metadata.json` içindeki sayfa numaralarını değiştirmek**
   - Sure ve Cüz başlangıç sayfaları sabittir

3. **`content.meta.json` dosyasını silmek veya bozmak**

4. **PDF indirme URL'sini değiştirmek** (test edilmeden)

5. **`PAGE_OFFSET` sabitini değiştirmek** (Kapak sayfası dengelemesi)

---

## 🔄 Değişiklik Prosedürü

Korunan dosyalarda değişiklik gerektiğinde:

1. **Yedek Al**
   ```bash
   git checkout -b backup/pre-library-change
   git push origin backup/pre-library-change
   ```

2. **Onay Al**
   - Kullanıcıdan yazılı onay al
   - Değişikliğin amacını belgele

3. **Test Et**
   - Tüm kitapların açıldığını doğrula
   - Sayfa navigasyonunu test et
   - PDF indirme/yükleme test et

4. **Commit Et**
   ```bash
   git commit -m "LIBRARY_CONTRACT: [Değişiklik açıklaması]"
   ```

---

## 📋 Kitap ID Reservasyonları

| ID | Kitap | Durum |
|----|-------|-------|
| `sozler` | Sözler | ✅ Aktif |
| `mektubat` | Mektubat | ✅ Aktif |
| `lemalar` | Lem'alar | 🔜 Planlandı |
| `sualar` | Şuâlar | 🔜 Planlandı |
| `quran.pdf` | Kur'an-ı Kerim | ✅ Aktif |
| `cevsen` | Cevşen | 🔜 Planlandı |
| `tesbihat` | Tesbihat | 🔜 Planlandı |

---

## 🛡️ İzolasyon Garantileri

```
┌─────────────────────────────────────────────────────────┐
│                    VakifApp                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Kur'an    │  │   Risale    │  │  Cevşen/    │     │
│  │    PDF      │  │   HTML      │  │  Tesbihat   │     │
│  │  Modülü     │  │  Okuyucu    │  │  (Gelecek)  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│        ▲                ▲                ▲             │
│        │                │                │             │
│   [FROZEN]         [FROZEN]         [OPEN]            │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │              Paylaşılan Servisler                │  │
│  │    (Navigation, Theme, Auth - değiştirilebilir)  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 İmza

Bu kontrat **VakifApp geliştirme sürecinde** geçerlidir ve ancak kullanıcı onayı ile değiştirilebilir.

- **Oluşturulma:** 2026-01-19
- **Son Güncelleme:** 2026-01-19
- **Durum:** Aktif
