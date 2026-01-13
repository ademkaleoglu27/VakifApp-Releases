# GOLD STANDARD READER ARCHITECTURE (V25.8) - LOCKED

> **STATUS: LOCKED**
> **DATE: 2026-01-13**
> **VERSION: 25.8**

This document defines the MANDATORY architecture for the Risale Reader. All future books (Lemalar, Şualar, etc.) MUST adhere to these patterns.

## 1. Identity & Navigation (The "Bridge" Pattern)

The system is transitioning from legacy `workId` (e.g., 'sozler', 'mektubat') to Canonical `bookId` (e.g., 'risale.sozler@diyanet.tr'). Until full migration, the **Bridge Pattern** is mandatory.

### A. Navigation from TOC
When navigating from `RisaleVirtualPageSectionList` to `RisaleVirtualPageReader`, you MUST pass BOTH IDs:

```typescript
navigation.navigate('RisaleVirtualPageReader', {
    bookId: bookId,            // Canonical ID (Future-proof)
    workId: workId,            // Legacy Internal ID (CRITICAL for StreamBuilder)
    sectionId: targetId,
    mode: 'section',
    source: 'toc',
    version: version
});
```

### B. Identity Resolution in Reader
The Reader (`RisaleVirtualPageReaderScreen`) must resolve the "Effective Work ID" to drive the legacy database layer:

```typescript
const getInternalWorkId = (id: string | undefined) => {
    if (id === 'risale.sozler@diyanet.tr') return 'sozler';
    if (id === 'risale.mektubat@diyanet.tr') return 'mektubat';
    // Add new mappings here
    return id || 'sozler';
};

// PREFER legacyWorkId if passed; fallback to mapping bookId
const effectiveWorkId = getInternalWorkId(legacyWorkId ?? bookId);
```

**Auto-Fail Safe**: If `effectiveWorkId` is invalid/locked, the Reader redirects to `ContentIntegrityScreen`.

## 2. Stream Building

The `RisaleRepo` must support `buildReadingStreamByBookId` for future compatibility, but the Reader currently prioritizes the "Legacy Bridge" approach (using `effectiveWorkId`).

- **Mektubat Fix**: Mektubat sections have `type='chapter'`. The TOC logic was patched to support this.
- **Empty Stream Guard**: The Reader includes a **mandatory 2-second timeout**. If `stream.length === 0` after 2s, it **must** verify integrity, not hang on "Sayfa hazırlanıyor".

## 3. Interaction Standards (UX)

To maintain the "Diamond/Gold" feel, these interaction rules are locked:

### A. No-Flash Scroll
*   **Do NOT** clear `hydratedItemId` on `onScrollBegin`.
*   **DO** close Lugat on scroll.
*   **DO** use a short timeout (120ms) on `onScrollEnd` to re-hydrate the active page.

This ensures text remains visible while scrolling, preventing the "blinking" or "pop-in" effect.

### B. Lugat Double-Tap Tolerance
*   Touch events on virtualized lists can be finicky during momentum.
*   **Mandatory**: Implement a 250ms "Double Tap" check in `handleWordClick`.
*   If the same word is tapped twice in <250ms, it bypasses hydration guards and forces Lugat open.

## 4. Database Schema Assumptions

The system expects:
- `sections` table: `book_id`, `work_id`, `type` ('main', 'chapter'), `order_index`.
- `paragraphs` table: `section_id`, `text`, `order_index`.

**Mektubat Specifics**:
- `parent_id` is often NULL (flat structure).
- `type` is 'chapter'.
- `section_uid` MUST be populated (e.g., `mektubat_1`).

## 5. Adding New Books (Checklist)

1.  **Ingest Content**: Ensure `ingest-[book].js` populates `sections` and `paragraphs`.
2.  **Register Book**: Add to `booksRegistry.ts` (set `bookId`).
3.  **Update Library**: Add to `libraryRegistry.ts` (set status 'ready').
4.  **Update Bridge**: Add mapping to `getInternalWorkId` in `RisaleVirtualPageReaderScreen.tsx`.
5.  **Verify TOC**: Ensure `RisaleVirtualPageSectionList` picks up the root sections (fallback to `workId` if needed).
