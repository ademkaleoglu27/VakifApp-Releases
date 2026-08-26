# VakifApp Platform - World Class E-Book Architecture

**Version:** 2.0 (Diamond Standard)
**Last Updated:** 2025-01-13

## Overview

This platform implements a robust, manifest-driven architecture for delivering Risale-i Nur content with immutable provenance, deep linking capability, and "no-compromise" reading experience.

## Core Concepts

### 1. Immutable Identities (`bookId`)
Every book and version is uniquely identified by a URN-like `bookId`.
**Format:** `risale.<workId>@<publisher>`
**Example:** `risale.sozler@diyanet.tr`

This ID is used consistently across:
- **Registry:** `library_manifest.json`
- **Navigation:** `AppNavigator` params (`bookId`, `sectionId`)
- **Persistence:** reading progress keys (`last_read_risale.sozler@diyanet.tr`)
- **Content Resolution:** `ContentResolver` service

### 2. Manifest-Driven Content
All library content is defined in JSON manifests. Hardcoding book lists in UI code is strictly forbidden.

- **Global Registry:** `src/content/manifests/library_manifest.json`
  - Lists available books, authors, and cover images.
- **Book Manifests:** `src/content/manifests/<collection>/<bookId>.json`
  - Defines sections, hierarchy, and metadata for a specific book version.

### 3. Virtual Page (VP) Reader
A single, highly optimized reader component (`RisaleVirtualPageReaderScreen`) handles all content rendering.
- **No PDF usage:** PDF readers are deprecated and removed.
- **Streaming:** Content is streamed in chunks for instant load times (`RisaleChunk`).
- **Deep Linking:** URLs like `vakifapp://read/risale.sozler@diyanet.tr?section=1.2` are supported by the architecture (deep link handler pending).

## Adding New Books

1. **Ingest Content:** Process raw text/HTML into `RisaleStream` JSON format.
2. **Create Manifest:** Generate `risale.<newbook>@<source>.json`.
3. **Update Registry:** Add entry to `library_manifest.json`.
4. **Deploy:** The app automatically discovers the new book without code changes.

## Verification

To verify the integrity of the platform:
1. Go to **Settings > About > Veri (Tab)**.
2. Check "Active Book" and "Library Manifest" versions.
3. Ensure no legacy "Work ID" mapping warnings appear in logs.

## Security & lockdown

- **Reader Lockdown:** The `RisaleVirtualPageReaderScreen` is the *only* authorized way to display content.
- **Strict Mode:** Navigation rejects invalid `bookId`s.
- **Provenance:** All content must be traceable to a manifest entry.

## Book Identity Standard (Identity Architecture)
The platform enforces a strict identity model to prevent content corruption and ensure stable navigation across versions.

1.  **Book Identity (`book_id`)**:
    -   Immutable URN: `risale.<work>@<publisher>` (e.g., `risale.sozler@diyanet.tr`).
    -   Versioning: SemVer string (e.g., `1.0.0`).

2.  **Section Identity (`section_uid`)**:
    -   **Deterministic**: Generated via SHA1 hash of identifying properties.
    -   **Seed Logic**: `normalize(title) | order_index | normalize(parent_title):parent_order > ...`
    -   **Immutable**: Once generated, a UID never changes even if the content is updated, ensuring bookmarks and deep links remain valid.

3.  **Database Integrity**:
    -   **Unique Constraint**: `UNIQUE(book_id, section_uid)` prevents duplicate sections for the same book.
    -   **Merge-Only Ingest**: New content is added via `INSERT OR IGNORE` or `UPSERT`. Existing content is never deleted or destructively overwritten by the reader.
