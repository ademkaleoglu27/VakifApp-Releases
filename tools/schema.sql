-- Quran Tables
CREATE TABLE IF NOT EXISTS q_surah (
    id INTEGER PRIMARY KEY,
    name_ar TEXT,
    name_tr TEXT,
    ayah_count INTEGER
);

CREATE TABLE IF NOT EXISTS q_ayah (
    id INTEGER PRIMARY KEY,
    surah_id INTEGER,
    ayah_number INTEGER,
    text_ar TEXT,
    FOREIGN KEY(surah_id) REFERENCES q_surah(id)
);

CREATE INDEX IF NOT EXISTS idx_q_ayah_surah_ayah ON q_ayah(surah_id, ayah_number);

-- Risale Tables (MATCHING APP EXPECTATIONS)
CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    category TEXT,
    meta_json TEXT
);

CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    type TEXT DEFAULT 'main',
    parent_id TEXT,
    FOREIGN KEY(work_id) REFERENCES works(id),
    FOREIGN KEY(parent_id) REFERENCES sections(id)
);

CREATE INDEX IF NOT EXISTS idx_sections_work ON sections(work_id);
CREATE INDEX IF NOT EXISTS idx_sections_type ON sections(type);
CREATE INDEX IF NOT EXISTS idx_sections_parent ON sections(parent_id);

CREATE TABLE IF NOT EXISTS paragraphs (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    text TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_arabic INTEGER DEFAULT 0,
    page_no INTEGER,
    type TEXT DEFAULT 'paragraph',
    meta_json TEXT,
    FOREIGN KEY(section_id) REFERENCES sections(id)
);

CREATE INDEX IF NOT EXISTS idx_paragraphs_section ON paragraphs(section_id);
CREATE INDEX IF NOT EXISTS idx_paragraphs_section_order ON paragraphs(section_id, order_index);
