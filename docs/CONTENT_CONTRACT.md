# Content Contract v1.0

Native Reader Engine için içerik normalize ve marker standardı.

## Normalize Kuralları

### Unicode Normalization
- Tüm metin **NFKC** normalize edilir
- Invisible karakterler temizlenir (ZWNJ, ZWJ hariç - Arapça için gerekli)

### Türkçe
- Standart Türkçe karakterler korunur: ç, ğ, ı, ö, ş, ü, Ç, Ğ, İ, Ö, Ş, Ü
- Eski harfler normalize: â→a, î→i, û→u (lugat aramasında)

### Arapça
- Hareke/diacritics korunur (fatha, kasra, damma, sukun, shadda, tanwin)
- Elif varyantları korunur (elif-maksura, elif-hemze)
- Te marbuta korunur

---

## Paragraph Delimiter

```
\n\n
```

**KİLİTLİ**: Tüm paragraflar çift newline ile ayrılır. Tek newline paragraf içi satır sonu.

---

## Marker Format

### Ayet
```
[AYET ref="bakara:255"]بِسْمِ اللَّهِ[/AYET]
```

### Dipnot
```
[FN id="fn-1"]Dipnot referansı[/FN]
```

### Haşiye
```
[HASHIYE id="hashiye-1"]Haşiye metni[/HASHIYE]
```

### Genel Link
```
[LINK type="section" target="birinci-soz"]Birinci Söz[/LINK]
```

---

## Marker Parsing

```typescript
interface Marker {
  type: 'AYET' | 'FN' | 'HASHIYE' | 'LINK';
  id: string;
  startOffset: number;
  endOffset: number;
  attributes: Record<string, string>;
}
```

**Kural**: Markerlar **YALNIZCA** tıklanabilir span olarak render edilir. Lugat için span kullanılmaz.

---

## Word Boundary Rules

### Türkçe
- Kelime sınırı: `\s` veya `[.,;:!?'"»«]`
- Apostrof kelime içi: `Allah'ın` → tek kelime
- Özel karakterler kelime içi: âîû

### Arapça
- Kelime sınırı: boşluk veya Arapça noktalama (؟ ، ؛)
- Hareke kelime parçası (sınır değil)
- Tatweel (ـ) yok sayılır

---

## Deterministic Anchor

Aynı içerik, aynı charOffset her cihazda aynı pozisyonu göstermeli.

**Garanti:**
1. Normalize NFKC uygulandı
2. Delimiter "\n\n" sabit
3. Marker tagları karakter sayısına dahil DEĞİL (sadece içerik)
