# Restore Checkpoint — golden-v116

**Tarih:** 2026-01-15
**Garanti:** Bu checkpoint'e dönüldüğünde aşağıdaki özellikler %100 stabil çalışır:

1.  **Reader Stabilite:** Tüm kitaplar sorunsuz açılır ve okunur.
2.  **Icarz Zoom Protokolü:** 
    -   Tüm kitaplarda Pinch-to-Zoom stabil çalışır.
    -   Momentum kill ve Interaction Lock devrededir.
    -   Grid görünümü aktiftir.
3.  **3-Page Hydration:** Aktif sayfa ve komşuları (±1) her zaman yüklü ve etkileşime hazırdır.
4.  **Lugat Etkileşimi:**
    -   Tek tıkla (Tap) lugat açılır.
    -   Deneysel token etkileşimleri kapalıdır (Maksimum stabilite).
5.  **Lugat Konumu:** Kartlar ekranın orta-üst bandında, daima görünür ve kelimeye göre akıllı konumlanır (Prefer-Upper Clamp).

## Restore Komutları (Geri Dönüş)

Bir sorun yaşanırsa, aşağıdaki komutlardan birini kullanarak bu noktaya güvenle dönebilirsiniz.

### A) Direkt Tag'e Dön (Hard Reset) — Önerilen Acil Dönüş
Mevcut `main` branch'inizi bu noktaya zorla eşitler.
```bash
git fetch --all --tags
git checkout main
git reset --hard golden-v116
git push origin main --force-with-lease
```

### B) Backup Branch'e Dön
Yedek branch'i baz alarak `main`i günceller.
```bash
git fetch --all
git checkout main
git reset --hard origin/backup/golden-v116
git push origin main --force-with-lease
```

### C) Sadece Lokal Test İçin Dön
Mevcut çalışmanızı bozmadan, test amaçlı geçici bir branch açar.
```bash
git fetch --all --tags
git checkout -B restore-test golden-v116
```

> **NOT:** Bu checkpoint sonrasında yapılacak her değişiklik, önce ayrı bir `feature/` branch'inde test edilmelidir. Doğrudan `main` commit önerilmez.
