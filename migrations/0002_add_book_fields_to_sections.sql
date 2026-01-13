-- Migration: 0002_add_book_fields_to_sections.sql
-- Description: Adds World-Standard Book Identity fields to the sections table.

-- 1. Add columns (NULL initially to allow backfill)
ALTER TABLE sections ADD COLUMN book_id TEXT;
ALTER TABLE sections ADD COLUMN section_uid TEXT;
ALTER TABLE sections ADD COLUMN version TEXT;

-- 2. Create Unique Index to enforce identity integrity
-- Note: This might fail if duplicates exist before backfill. 
-- In the app logic, we create this index *after* the backfill or ensure backfill guarantees uniqueness.
-- Here we define it, but for execution, ensure data is clean first.

CREATE UNIQUE INDEX IF NOT EXISTS ux_sections_book_uid ON sections(book_id, section_uid);

-- 3. Performance Index
CREATE INDEX IF NOT EXISTS ix_sections_book_parent_order ON sections(book_id, parent_id, order_index);
