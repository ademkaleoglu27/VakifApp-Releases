# RELEASE CHECKLIST & RULES

## KİLİT KURALLAR

1.  **KURAL 1:** `content.meta.json` içindeki `version` alanı, **SADECE** yeni bir kitap ingest edildiğinde veya içerik köklü değişikliğe uğradığında artırılır.
2.  **KURAL 2:** UI düzeltmeleri, bugfix'ler veya performans iyileştirmeleri için yapılan commit'lerde `content.meta.json` version **ASLA** artırılmaz.
3.  **KURAL 3:** `Force Reinstall` (Kırmızı Buton) özelliği, yalnızca `__DEV__` ortamında çalışır. Production veya Preview build'lerinde bu buton görünmez veya işlevsizdir.
4.  **KURAL 4:** Her yeni release öncesi `golden` tag ve `backup` branch oluşturulmalıdır.

## GOLDEN RELEASE ADIMLARI

- [ ] `git status` temiz.
- [ ] `content.meta.json` versiyonu doğru.
- [ ] Ingest scriptleri çalıştırılmış ve DB güncel.
- [ ] `git tag -a golden-vXXX -m "..."` oluşturulmuş.
- [ ] `backup/golden-vXXX` branch'i oluşturulmuş.
- [ ] Remote push yapılmış.
