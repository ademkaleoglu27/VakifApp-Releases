# Acceptance Tests v1.0 (P0-P5 Updated)

Native Reader Engine kabul testleri. Tüm testler geçmeden kapsam genişlemeyecek.

## Test Matrix

| # | Test | Criteria | Status |
|---|------|----------|--------|
| 1 | Diacritics Display | İşârâtü'l-İ'caz'da hareke kesilmesi = 0 | ⬜ |
| 2 | Min Zoom Word Tap (P2) | XS zoom (13px), 20 kelime tap, %95 doğru | ⬜ |
| 3 | Max Zoom Word Tap (P2) | XL zoom (24px), 20 kelime tap, %95 doğru | ⬜ |
| 4 | Pinch Zoom Fluidity (P5) | Gesture sırasında 60fps, commit <300ms | ⬜ |
| 5 | Text Selection | 10 seçimde doğru metin, share çalışır | ⬜ |
| 6 | Progress Restore (P4) | 10 kapan-aç, checksum doğrulamalı aynı anchor | ⬜ |
| 7 | Marker Links | Ayet/dipnot tık → event doğru gelir | ⬜ |
| 8 | Long Scroll (P3) | Chunk bazlı uzun bölüm, jank/crash yok | ⬜ |
| 9 | Memory Stability | 10 kitap arası geçiş, leak/crash yok | ⬜ |
| 10 | Rollback (P6) | Flag OFF → eski reader sorunsuz | ⬜ |
| 11 | Overlay Scale Hit-Test (P2) | Pinch sırasında tap → inverse-scale koordinat doğru | ⬜ |
| 12 | Typography Presets (P0) | Her 5 preset görsel olarak doğru | ⬜ |

---

## Detailed Test Procedures

### Test 1: Diacritics Display (P1)
1. Native Reader'ı Sözler'de aç
2. Arapça ayet içeren bölüme git
3. Ayetlerin üst/alt harekelerini incele
4. **P1 kontrol**: `includeFontPadding=false` + extra padding uygulandı mı?
5. ✅ Tüm diacritics görünür, üst/alt kesilme yok

### Test 2-3: Word Tap Accuracy (P2 + PATCH#2)
1. Belirtilen zoom preset'e ayarla
2. Rastgele 20 kelimeye dokun
3. Console log'daki `wordRaw` ve `startOffset/endOffset` değerlerini kontrol et
4. **P2 kontrol**: TR özel karakterleri (âîûçğışöü) doğru boundary'de mi?
5. **PATCH#2 kontrol**: Boşlukta tap yapıldığında komşu kelime algılanıyor mu?
6. **PATCH#2 kontrol**: Regex yerine Char classifier kullanılıyor (daha hızlı)
7. ≥19/20 doğru = PASS

### Test 4: Pinch Zoom Fluidity (P5 + PATCH#2)
1. Ekrana iki parmakla pinch yap
2. **P5 kontrol**: Gesture sırasında overlay transform, reflow yok
3. Parmakları bırak
4. **PATCH#2**: `commitDurationMs` artık `onCommitApplied()` anında ölçülüyor (layout+measure+anchor restore sonrası)
5. Debug log'da `COMMIT APPLIED in Xms` mesajı kontrol et (target: <300ms)
6. Yeni preset'e snap + anchor restore

### Test 5: Text Selection
1. Parmağını basılı tut, metin seç  
2. Seçilen metin highlight olmalı
3. Share butonuna bas → doğru metin
4. 10 farklı seçimde tekrarla

### Test 6: Progress Restore (P4)
1. Native Reader'da rastgele pozisyona scroll
2. Uygulamayı kapat (force close)
3. Tekrar aç, aynı kitaba git
4. **P4 kontrol**: contextChecksum eşleşmesi log'da görünür mü?
5. Önceki pozisyona dönmeli (±1 paragraf tolerans)
6. 10 kez tekrarla

### Test 7: Marker Links
1. Ayet veya dipnot marker'ı olan metne git
2. Marker'a dokun
3. Console'da `onMarkerTap` event görünmeli
4. Event payload'da `type`, `id`, `attributes` doğru

### Test 8: Long Scroll (P3)
1. En uzun bölümü (örn: On Sekizinci Söz) aç
2. **P3 kontrol**: Console'da chunk sayısı log'lanıyor mu?
3. Hızlıca aşağı-yukarı scroll
4. 30 saniye boyunca devam et
5. Crash veya ANR yok

### Test 9: Memory Stability
1. Native Reader'da Sözler'i aç
2. Legacy Reader'da başka kitap aç
3. Geri gel, Native Reader'a
4. 10 kez tekrarla
5. Android Profiler'da heap growth kontrol

### Test 10: Rollback (P6)
1. Developer Tools > Native Reader = OFF
2. Sözler'i aç
3. **P6 kontrol**: Dev toast "Native Reader only enabled for Sözler" yok
4. Legacy reader açılmalı
5. Tüm fonksiyonlar çalışmalı

### Test 11: Overlay Scale Hit-Test (P2)
1. Native Reader'da pinch başlat ama bırakma
2. Zoom aktifken bir kelimeye dokun
3. **P2 kontrol**: `x/overlayScale`, `y/overlayScale` log'da görünür mü?
4. Doğru kelime tespit edilmeli

### Test 12: Typography Presets (P0)
1. Developer Tools veya preset değiştirme UI'dan her preset'i seç
2. **P0 kontrol**: fontSize değerleri doğru mu? (13/15/17/20/24)
3. **P0 kontrol**: lineSpacingMultiplier değerleri doğru mu? (1.15-1.25)
4. Görsel olarak "kitap gibi" görünüm

---

## Debug Override

Test sırasında logları açmak için:
```kotlin
// NativeReaderView.kt
Log.d(TAG, "DEBUG: chunk=$chunkIndex, offset=$globalOffset, scale=$overlayScale")
```
