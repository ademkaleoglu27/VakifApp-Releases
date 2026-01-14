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

## EAS PRODUCTION ENVIRONMENT VARIABLES (CRITICAL)

EAS Dashboard üzerinde (Project -> Environment Variables -> Production) aşağıdaki değişkenlerin tanımlı olması **ZORUNLUDUR**:

| Variable Name | Type | Value (Örnek/Referans) |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Plain Text | `https://xyz.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Sensitive | `eyJhb...` |

**Not:** Bu değişkenler eksikse build **crash etmez** (safe-mode aktiftir), ancak uygulama açılışta "Configuration Error" ekranı gösterir ve çalışmaz.

### Safe Build & Runtime Garantisi
- `src/config/env.ts` ile runtime kontrolü yapılır.
- Build sırasında (bundling) env eksik olsa bile dummy değerler ile bundle başarılı olur.
- App açılışta `Env.isValid` kontrolü yapar. Başarısız ise kullanıcıya net hata gösterilir.
