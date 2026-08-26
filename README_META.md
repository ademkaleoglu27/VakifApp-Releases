# Meta JSON Schema Infrastructure

Bu belge, Risale Reader meta veri yapısını ve doğrulama altyapısını açıklar.

## Klasör Yapısı

```
/meta
├── manifest.json          # Külliyat ana manifest dosyası
├── books/
│   └── <bookId>/
│       ├── book.json      # Kitap meta verisi
│       ├── sections.json  # Bölümler/İçindekiler
│       └── pages/
│           ├── 0001.json  # Sayfa içerikleri
│           └── ...
└── lugat/
    └── lugat.json         # Sözlük

/schema
├── manifest.schema.json   # Manifest şeması
├── book.schema.json       # Kitap şeması
├── sections.schema.json   # Bölümler şeması
├── page.schema.json       # Sayfa şeması
└── lugat.schema.json      # Sözlük şeması
```

## Schema Versioning Kuralı

Tüm meta JSON dosyalarında `schemaVersion` alanı zorunludur (semver formatı: `MAJOR.MINOR.PATCH`).

| Değişiklik Tipi | Version Artışı |
|-----------------|----------------|
| Breaking change (alan silme, tip değişikliği) | MAJOR |
| Yeni opsiyonel alan ekleme | MINOR |
| Typo düzeltme, açıklama güncelleme | PATCH |

**Önemli:** Reader, yalnızca `EXPECTED_META_MAJOR` ile eşleşen major versiyonları kabul eder. Farklı major = fail-fast.

## Segment Tipleri (type enum)

| Tip | Açıklama |
|-----|----------|
| `heading` | Ana başlık |
| `subheading` | Alt başlık |
| `paragraph` | Normal paragraf |
| `arabicBlock` | Arapça metin bloğu |
| `quote` | Alıntı |
| `listItem` | Liste öğesi |
| `divider` | Ayırıcı |
| `footnote` | Dipnot |
| `hashiye` | Haşiye |
| `label` | Etiket (Sual:, Elcevap: vb.) |
| `note` | Not/Açıklama |

## Yeni Kitap Ekleme

1. `meta/manifest.json`'a kitabı ekle:
   ```json
   {
     "bookId": "mektubat",
     "title": "Mektubat",
     "order": 2,
     "path": "books/mektubat"
   }
   ```

2. `meta/books/mektubat/` klasörü oluştur
3. `book.json`, `sections.json` oluştur
4. `pages/` klasörüne sayfa dosyalarını ekle
5. Doğrulama çalıştır: `npm run meta:ci`

## Doğrulama Komutları

```bash
# Şema validasyonu
npm run meta:validate

# Referans bütünlüğü kontrolü
npm run meta:check

# Tümü (CI için)
npm run meta:ci
```

## CI Entegrasyonu

GitHub Actions, `meta/` veya `schema/` klasörlerinde değişiklik olduğunda otomatik çalışır.
Validasyon geçmezse PR merge edilemez.

## segmentId Kuralları

- Her segment için benzersiz, kalıcı ID
- Format: `{bookId}-{pageIndex}-{segmentOrder}` (örn: `sozler-0001-005`)
- **Önemli:** Repagination yapılsa bile segmentId değişmez
- Zoom, lugat, arama özellikleri bu ID'lere bağlı olacak
