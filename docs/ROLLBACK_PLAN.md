# Rollback Plan v1.0

Native Reader Engine sorun çıkarırsa geri dönüş prosedürü.

## Instant Rollback (Runtime)

### Kullanıcı Seviyesi
1. Developer Tools ekranına git
2. "Native Reader (Sözler)" toggle'ını kapat
3. Anında eski reader aktif

### Kod Seviyesi
```typescript
// src/features/reader/flags/readerFlags.ts
export const ReaderFlags = {
  useNativeReader: false,  // ← false yap
  // ...
};
```

---

## Full Rollback (Build)

Native modül sorunluysa:

### 1. Android Package Kaldır
```kotlin
// MainApplication.kt
override fun getPackages(): List<ReactPackage> {
  val packages = PackageList(this).packages
  // packages.add(NativeReaderPackage())  // ← Yorum satırı yap
  return packages
}
```

### 2. RN Entry Bypass
```typescript
// AppNavigator.tsx
// RisaleReaderEntry yerine doğrudan RisaleVirtualPageReaderScreen kullan
<Stack.Screen
  name="RisaleVirtualPageReader"
  component={RisaleVirtualPageReaderScreen}  // ← Eski reader
/>
```

---

## Veri Uyumu

### Anchor Format
- Native ve Legacy aynı anchor formatını kullanır
- Geçiş sırasında progress kaybı yok

### AsyncStorage Keys
- `@reader_flags` - Native Reader ayarları
- Rollback'te silinmesine gerek yok

---

## Verification After Rollback

1. [ ] Sözler kitabı eski reader'da açılıyor
2. [ ] Diğer kitaplar çalışıyor
3. [ ] Lugat fonksiyonu çalışıyor
4. [ ] Zoom fonksiyonu çalışıyor
5. [ ] Progress restore çalışıyor

---

## Emergency Contact

Kritik sorunlarda:
- Console.error loglarını kaydet
- Cihaz/Android versiyon bilgisi
- Repro adımları
