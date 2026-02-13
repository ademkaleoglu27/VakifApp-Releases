# Checkpoint: Quran V2 (Vertical Engine) - LOCKED

**Date:** 2026-01-24
**Status:** STABLE / PRODUCTION-READY

## Architecture Overview
The Quran Reader has been migrated from `FlatList` (Horizontal) to a **Vertical FlashList** architecture to resolve performance bottlenecks and improve reading ergonomics.

### Core Components

#### 1. List Engine: `@shopify/flash-list`
- **Why**: Standard `FlatList` dropped frames on large image lists. `FlashList` recycles views efficiently.
- **Config**:
  - `estimatedItemSize`: Calculated based on screen width * Aspect Ratio (1.55).
  - `scrollEventThrottle`: 16ms.

#### 2. Image Engine: `expo-image`
- **Why**: Native caching and decoding off the JS thread.
- **Prefetching**: Logic in `QuranReaderScreen` preloads +/- 3 pages for instant rendering.

#### 3. Zoom Strategy: Container Scaling
- **Problem**: Zooming individual items in a virtualized list causes layout thrashing and crashes.
- **Solution**: 
  - Scale the **Container View** holding the list.
  - **Native Scroll** handles Vertical movement (Y).
  - **Pan Gesture** handles Horizontal movement (X).
  - **Simultaneous Handlers**: Enabled to allow diagonal movement without locking.

## Critical Logic Preservation
> **DO NOT MODIFY** the following without regression testing:

1. **Page Indexing**:
   - `renderItem` maps `item` to `pageNumber={item + 1}`. 
   - This prevents the "Cover Page" issue. `INDEX 0` = `PAGE 1` (Cover), but we display `PAGE 1` data.

2. **Juz Selection**:
   - `QuranMenuScreen` uses `key="juz-list"` and `key="surah-list"` to force re-mounts when switching columns. Removing this **will cause crashes**.

3. **Search Normalization**:
   - `normalizeString` handles Turkish chars AND diacritics (`â` -> `a`).

## Locked Files
- `src/features/quran/components/QuranVerticalList.tsx`
- `src/features/quran/screens/QuranMenuScreen.tsx`
- `src/features/quran/screens/QuranReaderScreen.tsx`
