# Native Reader Architecture v1.0

## Module Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native Layer                       │
├─────────────────────────────────────────────────────────────┤
│  RisaleReaderEntry.tsx                                       │
│  ├── Flag Check (useNativeReader + bookId filter)           │
│  ├── Legacy: RisaleVirtualPageReaderScreen                  │
│  └── Native: NativeReaderView.tsx                           │
│              ├── ReaderBridge.ts (events/commands)          │
│              └── useReaderProgress.ts (anchor persist)      │
└─────────────────────────────────────────────────────────────┘
                              │
                    Bridge (Native Modules)
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Android Native Layer                     │
├─────────────────────────────────────────────────────────────┤
│  NativeReaderPackage.kt                                      │
│  └── NativeReaderManager.kt (ViewManager)                   │
│      └── NativeReaderView.kt (FrameLayout + TextView)       │
│          ├── TextEngine.kt (typography presets)             │
│          ├── HitTest.kt (x,y → word)                        │
│          ├── ZoomController.kt (overlay + commit)           │
│          ├── SelectionBridge.kt (selection events)          │
│          ├── AnchorController.kt (position tracking)        │
│          ├── Normalization.kt (text normalize)              │
│          └── Haptics.kt (touch feedback)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌──────────┐     SET_CONTENT      ┌──────────────┐
│  RN App  │ ──────────────────▶  │ NativeReader │
│          │                      │    View      │
│          │  ◀────────────────── │              │
│          │     WORD_TAP         │              │
│          │     SELECTION        │              │
│          │     ZOOM_COMMIT      │              │
└──────────┘                      └──────────────┘
     │                                   │
     │ useReaderProgress                 │ AnchorController
     ▼                                   ▼
┌──────────┐                      ┌──────────────┐
│ Async    │                      │   Layout     │
│ Storage  │                      │   Engine     │
└──────────┘                      └──────────────┘
```

---

## Typography Presets (P0)

| ID | fontSize | lineSpacingMultiplier | paragraphGap | arabicExtra |
|----|----------|----------------------|--------------|-------------|
| XS | 13 | 1.15 | 2dp | 2dp |
| SM | 15 | 1.18 | 3dp | 2dp |
| MD | 17 | 1.20 | 4dp | 2dp |
| LG | 20 | 1.22 | 5dp | 2dp |
| XL | 24 | 1.25 | 6dp | 2dp |

**P1 Android Settings:**
- `includeFontPadding = false`
- `setLineSpacing(0f, multiplier)`
- `setElegantTextHeight(true)` (Android Q+)
- Extra padding for Arabic diacritics

---

## Zoom State Machine

```
       ┌─────────┐
       │  IDLE   │
       └────┬────┘
            │ onPinchStart
            ▼
       ┌─────────┐
       │ OVERLAY │ (scale transform, no reflow)
       └────┬────┘
            │ onPinchEnd
            ▼
       ┌─────────┐
       │ COMMIT  │ (find nearest preset)
       └────┬────┘
            │ layout complete
            ▼
       ┌─────────┐
       │ RESTORE │ (scroll to anchor)
       └────┬────┘
            │
            ▼
       ┌─────────┐
       │  IDLE   │
       └─────────┘
```

---

## File Summary

### React Native (5 files)
- `readerFlags.ts` - Feature flag + allowed books
- `ReaderBridge.ts` - Event/command types
- `NativeReaderView.tsx` - Native component wrapper
- `RisaleReaderEntry.tsx` - Router entry point
- `useReaderProgress.ts` - Anchor persistence hook

### Android (11 files)
- `NativeReaderPackage.kt` - React package
- `NativeReaderManager.kt` - View manager
- `NativeReaderView.kt` - Main view
- `ReaderTypes.kt` - Data models
- `TextEngine.kt` - Typography
- `HitTest.kt` - Word detection
- `SelectionBridge.kt` - Selection
- `ZoomController.kt` - Pinch zoom
- `AnchorController.kt` - Position
- `Normalization.kt` - Text normalize
- `Haptics.kt` - Haptic feedback
