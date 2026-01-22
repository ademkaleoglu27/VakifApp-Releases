# Kur'an PDF-WebP Araçları

Bu dizin, GPU hızlandırmalı resim okuyucu için bir Kur'an Mushaf PDF'ini optimize edilmiş WebP resimlerine dönüştüren araçları içerir.

## Ön Gereksinimler

- Python 3.8+
- [PyMuPDF](https://pymupdf.readthedocs.io/) (fitz)
- [Pillow](https://python-pillow.org/)

Bağımlılıkları yükleyin:
```bash
pip install pymupdf pillow
```

## Kullanım

1. Kur'an PDF'inizi (örn. `kuran_v2_lite.pdf`) proje kök dizinine yerleştirin.
2. Dönüştürme scriptini çalıştırın:
```bash
python tools/quran/pdf_to_webp.py --input kuran_v2_lite.pdf --output ./assets/quran_pages/v1
```

### Parametreler

- `--width`: Hedef genişlik (piksel) (varsayılan: 2200).
- `--quality`: WebP kalitesi (varsayılan: 82).
- `--output`: Resimlerin ve `manifest.json` dosyasının kaydedileceği klasör.

## Varlık (Asset) Dağıtım Politikası

> [!WARNING]
> Oluşturulan 604 WebP dosyasını doğrudan Git reposuna **EKLEMEYİN**. Bu, repo boyutunu aşırı büyütecektir.

Önerilen dağıtım yöntemleri:
1. **GitHub Releases:** Oluşturulan dosyaları bir release varlığı olarak yükleyin.
2. **Uzak Sunucu:** Supabase Storage, S3 veya R2 gibi bir servise yükleyip `src/config/quranImageConfig.ts` içindeki URL'yi güncelleyin.

## Doğrulama

Tüm sayfaların mevcut ve okunabilir olduğunu kontrol etmek için:
```bash
# Gelecekte eklenecek kontrol scripti için yer tutucu
```
