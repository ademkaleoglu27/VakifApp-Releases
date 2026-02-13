# Reader Bridge Contract v1.0

Native Reader Engine ↔ React Native iletişim sözleşmesi.

## Bridge API

### Commands (RN → Native)

| Command | Payload | Description |
|---------|---------|-------------|
| `SET_CONTENT` | `{ text: string, markers: Marker[], anchor?: Anchor }` | İçerik yükle |
| `SET_ZOOM_PRESET` | `{ presetId: 'XS'|'SM'|'MD'|'LG'|'XL' }` | Zoom seviyesi ayarla |
| `SCROLL_TO_ANCHOR` | `{ anchor: Anchor }` | Belirtilen anchor'a scroll |
| `CLEAR_SELECTION` | `{}` | Seçimi temizle |

### Events (Native → RN)

| Event | Payload | Description |
|-------|---------|-------------|
| `WORD_TAP` | `WordTapEvent` | Kelime tıklaması |
| `SELECTION_CHANGE` | `SelectionEvent` | Metin seçimi değişti |
| `ZOOM_COMMIT` | `ZoomCommitEvent` | Pinch zoom tamamlandı |
| `SCROLL_POSITION` | `ScrollEvent` | Scroll pozisyonu |
| `ANCHOR_UPDATE` | `AnchorEvent` | Mevcut anchor güncellendi |
| `ERROR` | `ErrorEvent` | Hata oluştu |

---

## Event Payloads

```typescript
// v1 - Tüm payloadlar versiyonlanır
interface WordTapEvent {
  v: 1;
  wordRaw: string;
  wordNormalized: string;
  rect: { x: number; y: number; w: number; h: number };
  charOffset: number;
  contextSnippet: string; // ±20 karakter
}

interface SelectionEvent {
  v: 1;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  anchor: Anchor;
}

interface ZoomCommitEvent {
  v: 1;
  fromPresetId: string;
  toPresetId: string;
  commitDurationMs: number;
}

interface ScrollEvent {
  v: 1;
  charOffset: number;
  scrollY: number;
  contentHeight: number;
}

interface AnchorEvent {
  v: 1;
  anchor: Anchor;
}

interface ErrorEvent {
  v: 1;
  code: string;
  message: string;
  fatal: boolean;
}
```

---

## Anchor Schema

```typescript
interface Anchor {
  bookId: string;
  sectionUid: string;
  charOffset: number;
  timestamp: number;
  zoomPresetId: string;
}
```

---

## Error Codes

| Code | Description | Fatal |
|------|-------------|-------|
| `ERR_CONTENT_EMPTY` | İçerik boş | No |
| `ERR_ANCHOR_INVALID` | Anchor restore edilemedi | No |
| `ERR_RENDER_FAILED` | Render hatası | Yes |
| `ERR_UNKNOWN` | Beklenmedik hata | No |

---

## Hata Yönetimi

1. **Fatal olmayan hatalar**: Log + fallback davranış
2. **Fatal hatalar**: Event gönder, RN tarafında eski reader'a düş
3. **Timeout**: 5 saniye içinde yanıt gelmezse RN timeout event'i tetikler
