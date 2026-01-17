# Native Reader Baseline - Golden Standard Lock v1

> **Bu build "Altın Standart" olarak kilitlenmiştir.**  
> Tag: `golden-native-reader-lock-v1`  
> Backup Branch: `backup/golden-native-reader-lock-v1`  
> Tarih: 2026-01-17

---

## 🔒 Kilitli Dosyalar (LOCKED FILES)

Bu dosyalara dokunulmadan önce **mutlaka yorum satırıyla "WHY" açıklaması** eklenmelidir:

### Android (Kotlin)
- `android/.../nativereader/NativeReaderView.kt`
- `android/.../nativereader/NativeReaderManager.kt`
- `android/.../nativereader/ReaderTypes.kt` (ZoomPresets dahil)
- `android/.../nativereader/ZoomController.kt`
- `android/.../nativereader/TextEngine.kt`
- `android/.../nativereader/HitTest.kt`
- `android/.../nativereader/AnchorController.kt`

### React Native
- `src/features/reader/screens/NativeReaderScreen.tsx`
- `src/features/reader/engine/NativeReaderView.tsx`
- `src/features/reader/engine/NativeAvailability.ts`
- `src/features/reader/debug/ReaderDebugStore.ts`
- `src/features/reader/debug/NativeReaderDebugHUD.tsx`
- `src/features/reader/debug/SelectedWordOverlay.tsx`

---

## ✅ Kabul Kriterleri (Acceptance Criteria)

### Zoom & Scroll
- [ ] Tek parmak scroll sırasında `overlayScale` **değişmez**
- [ ] 2. parmak dokunur dokunmaz `gestureMode = PINCH_READY`
- [ ] Pinch zoom akıcı (60fps hedefi)
- [ ] Commit süresi ortalama 200-300ms
- [ ] Preset geçişleri: XXS → XS → SM → MD → LG → XL → XXL → XXXL

### Word Tap & Lugat
- [ ] Kelimeye tap → doğru kelime seçilir (sapma yok)
- [ ] Ardışık 10 tap → satır başına kayma yok
- [ ] XXS modunda lugat/word-tap **devre dışı**
- [ ] Diğer presetlerde lugat normal çalışır
- [ ] Crash yok (onWordTap, onZoomCommit, onGestureState)

### Debug HUD
- [ ] HUD görünür (sağ üst köşe)
- [ ] GestureMode, PointerCount, OverlayScale değerleri görünür
- [ ] LastWordTap bilgileri güncel
- [ ] SelectedWordOverlay rect highlight görünür

---

## 🧪 Test Adımları

### 1. APK Kurulumu
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### 2. Baseline Test Senaryosu
1. Uygulamayı aç → Sözler → TOC → Birinci Söz
2. Debug HUD'un görünür olduğunu doğrula
3. **Tek parmak scroll testi:**
   - Hızlıca yukarı/aşağı scroll
   - HUD'da `overlayScale = 1.0` sabit kalmalı
   - `gestureMode = SCROLL_1P` olmalı
4. **Pinch zoom testi:**
   - 2 parmakla sıkıştır/genişlet
   - `gestureMode = PINCH_READY → PINCH_ACTIVE → COMMITTING` geçişleri
   - Commit sonrası preset değişmeli
5. **Word tap testi:**
   - Satır sonundaki kelimeye 10 kez tap
   - Her seferinde aynı kelime seçilmeli
   - SelectedWordOverlay rect highlight görünmeli
6. **XXS lugat gate testi:**
   - Zoom out yaparak XXS'e geç
   - Kelimeye tap → seçim olmamalı

### 3. Kanıt Toplama (Lokal)
- [ ] MD preset HUD screenshot
- [ ] XXL preset HUD screenshot
- [ ] XXXL preset HUD screenshot
- [ ] 10 saniyelik video: pinch zoom + commit + word tap

---

## ⚠️ Regression Shield Policy

Herhangi bir kilitli dosyayı değiştirmeden önce:

1. Bu baseline testleri çalıştır
2. Değişikliğin nedenini `// WHY: ...` yorumuyla ekle
3. Değişiklikten sonra tüm testleri tekrar çalıştır
4. Regression varsa değişikliği geri al

---

## 📊 Zoom Presets (Referans)

| Preset | FontSize | LineHeight | ParagraphGap | LineSpacing |
|--------|----------|------------|--------------|-------------|
| XXS    | 11f      | 13f        | 1f           | 1.12f       |
| XS     | 13f      | 15f        | 2f           | 1.15f       |
| SM     | 15f      | 18f        | 3f           | 1.18f       |
| **MD** | 17f      | 20f        | 4f           | 1.20f (default) |
| LG     | 20f      | 24f        | 5f           | 1.22f       |
| XL     | 24f      | 30f        | 6f           | 1.25f       |
| XXL    | 28f      | 35f        | 7f           | 1.28f       |
| XXXL   | 32f      | 40f        | 8f           | 1.30f       |

---

## 🔄 Geri Alma (Rollback)

Herhangi bir sorun durumunda bu checkpoint'e dön:

```bash
git checkout golden-native-reader-lock-v1
# veya
git checkout backup/golden-native-reader-lock-v1
```
