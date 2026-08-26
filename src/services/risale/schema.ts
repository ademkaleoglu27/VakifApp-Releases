export interface Work {
  id: string; // e.g., 'sozler', 'mektubat'
  title: string; // e.g., 'Sözler', 'Mektubat'
  order_index: number;
}

export interface Section {
  id: string; // e.g., 'sozler-1', 'mektubat-22'
  work_id: string; // references works.id
  title: string; // e.g., 'Birinci Söz', 'İkinci Mektup'
  order_index: number;
  type: string; // 'chapter', 'supplement', etc.
}

export interface Paragraph {
  id: string; // e.g., 'sozler-1-p1'
  section_id: string; // references sections.id
  text: string;
  order_index: number;
  is_arabic?: boolean; // true if paragraph is primarily Arabic text
}

export interface Footnote {
  id: string;
  paragraph_id: string; // references paragraphs.id
  marker: string; // e.g., (*)
  text: string;
}

export interface DictionaryTerm {
  term: string;
  meaning: string;
}

export interface Meta {
  key: string;
  value: string;
}

// SQL Init Script for Content DB
export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    work_id TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    type TEXT,
    FOREIGN KEY(work_id) REFERENCES works(id)
  );

  CREATE TABLE IF NOT EXISTS paragraphs (
    id TEXT PRIMARY KEY,
    section_id TEXT NOT NULL,
    text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    is_arabic INTEGER DEFAULT 0,
    FOREIGN KEY(section_id) REFERENCES sections(id)
  );

  CREATE INDEX IF NOT EXISTS idx_paragraphs_section_order ON paragraphs(section_id, order_index);

  CREATE TABLE IF NOT EXISTS footnotes (
    id TEXT PRIMARY KEY,
    paragraph_id TEXT NOT NULL,
    marker TEXT,
    text TEXT NOT NULL,
    FOREIGN KEY(paragraph_id) REFERENCES paragraphs(id)
  );

  CREATE TABLE IF NOT EXISTS dictionary (
    term TEXT PRIMARY KEY,
    meaning TEXT NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
