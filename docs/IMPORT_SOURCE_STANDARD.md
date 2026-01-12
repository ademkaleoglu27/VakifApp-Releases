# Content Import Source Standard (LOCKED)

## TEXT-First Principle

> **LOCKED**: Default to TEXT ingestion. HTML is never rendered directly.

## Source Priority

1. **TEXT** (Primary)
   - Source: Cleaned plain text files
   - Processing: `blockDetector.processPipeline()`
   - Output: Typed blocks with hash-based IDs

2. **HTML** (Structural Markers Only)
   - HTML may only provide:
     - Heading markers (`<h1>`, `<h2>`)
     - Footnote references
     - Section dividers
   - These markers are INJECTED into TEXT-based blocks
   - HTML content is NEVER rendered directly

## Pipeline Order (ENFORCED)

All ingestion MUST follow this order:

```
raw text
    ↓
blockDetector.normalizeText()
    ↓
blockDetector.detectBlockType()
    ↓
blockDetector.mergeGlueNeighbors()
    ↓
persist blocks
```

**No code path may bypass `normalizeText` or `mergeGlueNeighbors`.**

Use `blockDetector.processPipeline()` as the single entry point.

## BlockId Scheme (V2.1)

```
${bookId}:${sectionId}:${ordinal}:${hash8}
```

- `hash8`: First 8 chars of djb2 hash of normalized text
- Prevents ID collisions across builds
- Existing IDs preserved; new scheme for new ingestion only

## Schema Version

Current: **2.1**

Bump schema version when:
- Block type definitions change
- Detection thresholds change
- Cache key fields change
