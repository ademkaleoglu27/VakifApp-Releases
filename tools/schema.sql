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

-- Risale Tables
CREATE TABLE IF NOT EXISTS r_work (
    id INTEGER PRIMARY KEY,
    title TEXT,
    category TEXT,
    order_no INTEGER
);

CREATE TABLE IF NOT EXISTS r_section (
    id INTEGER PRIMARY KEY,
    work_id INTEGER,
    title TEXT,
    order_no INTEGER,
    FOREIGN KEY(work_id) REFERENCES r_work(id)
);

CREATE TABLE IF NOT EXISTS r_chunk (
    id INTEGER PRIMARY KEY,
    section_id INTEGER,
    chunk_no INTEGER,
    text_tr TEXT,
    FOREIGN KEY(section_id) REFERENCES r_section(id)
);

CREATE INDEX IF NOT EXISTS idx_r_section_work ON r_section(work_id, order_no);
CREATE INDEX IF NOT EXISTS idx_r_chunk_section ON r_chunk(section_id, chunk_no);
