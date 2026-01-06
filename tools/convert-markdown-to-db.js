const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SOURCE_DIR = path.join(__dirname, 'risale_source_data', 'obsidian-markdown');
const OUTPUT_DB_PATH = path.join(__dirname, '../assets/content/risale_text.db');

// Ensure assets directory exists
const assetsDir = path.dirname(OUTPUT_DB_PATH);
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
}

// Remove existing DB if any
if (fs.existsSync(OUTPUT_DB_PATH)) {
    fs.unlinkSync(OUTPUT_DB_PATH);
}

const db = new Database(OUTPUT_DB_PATH);

// Initialize Tables
db.exec(`
    CREATE TABLE books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        folder_name TEXT NOT NULL
    );

    CREATE TABLE sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER,
        title TEXT NOT NULL,
        file_name TEXT NOT NULL,
        FOREIGN KEY(book_id) REFERENCES books(id)
    );

    CREATE TABLE paragraphs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER,
        content TEXT NOT NULL,
        is_arabic BOOLEAN DEFAULT 0,
        FOREIGN KEY(section_id) REFERENCES sections(id)
    );

    CREATE TABLE footnotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id INTEGER,
        marker TEXT NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY(section_id) REFERENCES sections(id)
    );
`);

const insertBook = db.prepare('INSERT INTO books (title, folder_name) VALUES (?, ?)');
const insertSection = db.prepare('INSERT INTO sections (book_id, title, file_name) VALUES (?, ?, ?)');
const insertParagraph = db.prepare('INSERT INTO paragraphs (section_id, content, is_arabic) VALUES (?, ?, ?)');
const insertFootnote = db.prepare('INSERT INTO footnotes (section_id, marker, content) VALUES (?, ?, ?)');

function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    // Filter only book directories (e.g., "01 Sözler")
    const bookDirs = items.filter(item => item.isDirectory() && /^\d{2}/.test(item.name));

    for (const bookDir of bookDirs) {
        processBook(bookDir.name);
    }
}

function processBook(folderName) {
    // Remove number prefix for title (e.g., "01 Sözler" -> "Sözler")
    const bookTitle = folderName.replace(/^\d+\s+/, '').trim();
    console.log(`Processing Book: ${bookTitle}`);

    const result = insertBook.run(bookTitle, folderName);
    const bookId = result.lastInsertRowid;

    const bookPath = path.join(SOURCE_DIR, folderName);
    const files = fs.readdirSync(bookPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
        processSection(bookId, bookPath, file);
    }
}

function processSection(bookId, bookPath, fileName) {
    const filePath = path.join(bookPath, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Title is filename without extension and number (e.g., "01.01 Birinci Söz.md" -> "Birinci Söz")
    // Some filenames might be "01 Birinci Söz.md" or "01.01..."
    let title = fileName.replace('.md', '');
    title = title.replace(/^[\d\.]+\s+/, '').trim();

    const sectionResult = insertSection.run(bookId, title, fileName);
    const sectionId = sectionResult.lastInsertRowid;

    parseAndInsertContent(sectionId, content);
}

function parseAndInsertContent(sectionId, rawContent) {
    // 1. Split content into lines to separate body text from footnotes
    const lines = rawContent.split('\n');

    let isMetadata = false;

    // Regex for Footnotes [^1]: ...
    const footnoteRegex = /^\[\^([^\]]+)\]:\s*(.*)/;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip frontmatter (--- ... ---)
        if (line === '---') {
            isMetadata = !isMetadata;
            continue;
        }
        if (isMetadata) continue;

        // Skip empty lines
        if (!line) continue;

        // Check for Footnote Definition
        const fnMatch = line.match(footnoteRegex);
        if (fnMatch) {
            const marker = fnMatch[1];
            const fnContent = fnMatch[2];
            insertFootnote.run(sectionId, marker, fnContent);
            continue;
        }

        // Process Normal Paragraph
        // Clean up markdown specific noise if needed, but keeping HTML tags for now (like <span class="arabic">)
        // Check if paragraph is primarily Arabic (simple heuristic or relying on class)
        const isArabic = line.includes('class="arabic"') || /[\u0600-\u06FF]/.test(line);

        insertParagraph.run(sectionId, line, isArabic ? 1 : 0);
    }
}

try {
    console.log('Starting conversion...');
    processDirectory(SOURCE_DIR);
    console.log(`Database generated at: ${OUTPUT_DB_PATH}`);
} catch (error) {
    console.error('Error processing:', error);
}
