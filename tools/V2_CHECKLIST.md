# Pagination V2 Verification Checklist

## 1. Cut-Point & Stability
- [ ] **Rapid Font Scale**: rapidly tap `+` and `-` in Reader.
  - *Expected*: Loading spinner appears briefly; no crashes; pages eventually settle to correct layout.
- [ ] **Rotation**: Rotate device (if emulator supports).
  - *Expected*: Pages repaginate for new width. Text flow remains continuous.
- [ ] **Restart**: Close app entirely and reopen same book.
  - *Expected*: Instant load (Cache Hit) with identical page boundaries.

## 2. Text Integrity
- [ ] **No Missing Words**: Read across page boundary.
  - *Expected*: Sentence continues naturally. No characters lost or duplicated.
- [ ] **Paragraph Spacing**: Check `\n\n` preservation.
  - *Expected*: Visual gap between paragraphs exists.

## 3. Logs & Debug
- [ ] Check Metro logs for `[Pagination] Job Success`.
- [ ] Check for `[Pagination] Gap detected` warnings (should be none).

## 4. Edge Cases
- [ ] **Tiny Font**: Set to min size. Verify pages full.
- [ ] **Huge Font**: Set to max size. Verify words wrap or split safely (native behavior).
- [ ] **Long Paragraph**: Test with 20k+ char paragraph.
  - *Expected*: "Chunk too small. Retrying" logs may appear. Pages generate correctly.

## 5. Persistence
- [ ] **Cache Invalidation**: Modify source text manually in DB or code.
  - *Expected*: App detects fingerprint mismatch, clears cache, and regenerates pages.
