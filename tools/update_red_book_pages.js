const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../assets/content/risale_text_v2.db');
const MAPPING_FILE = path.join(__dirname, 'red_book_mapping.json');

// --- SAMPLE MAPPING STRUCTURE ---
// [
//   {
//     "book_name": "Sözler",
//     "page_number": 5,
//     "first_sentence_snippet": "Bismillah her hayrın başıdır."
//   },
//   ...
// ]

function reflowPages() {
    if (!fs.existsSync(MAPPING_FILE)) {
        console.error(`Mapping file not found: ${MAPPING_FILE}`);
        console.log("Please create this file with 'book_name', 'page_number', and 'first_sentence_snippet'.");
        return;
    }

    const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
    const db = new Database(DB_PATH);

    // Sort mapping by book and page to ensure sequential processing
    mapping.sort((a, b) => {
        if (a.book_name !== b.book_name) return a.book_name.localeCompare(b.book_name);
        return a.page_number - b.page_number;
    });

    const updateParaPage = db.prepare('UPDATE paragraphs SET page_id = ? WHERE paragraph_id = ?');
    const insertPage = db.prepare('INSERT INTO pages (book_id, page_number) VALUES (?, ?)');
    const getBook = db.prepare('SELECT book_id FROM books WHERE book_name = ?');
    const findPara = db.prepare('SELECT paragraph_id FROM paragraphs WHERE text_original LIKE ? AND page_id IN (SELECT page_id FROM pages WHERE book_id = ?) LIMIT 1');
    const getAllParasInBook = db.prepare(`
        SELECT p.paragraph_id, p.text_original 
        FROM paragraphs p 
        JOIN pages pg ON p.page_id = pg.page_id 
        WHERE pg.book_id = ? 
        ORDER BY p.paragraph_id ASC
    `);

    // We need to fetch ALL paragraphs for a book effectively, then "slice" them into pages based on markers.
    // Actually, simpler approach:
    // 1. Reset all pages for the book? No, keep existing IDs but maybe update them? 
    // Better: Create NEW pages for the real mapping, assign paras to them, delete old virtual pages.

    db.transaction(() => {
        // Group by Book
        const books = {};
        for (const item of mapping) {
            if (!books[item.book_name]) books[item.book_name] = [];
            books[item.book_name].push(item);
        }

        for (const bookName of Object.keys(books)) {
            const bookRow = getBook.get(bookName);
            if (!bookRow) {
                console.warn(`Book not found in DB: ${bookName}`);
                continue;
            }
            const bookId = bookRow.book_id;
            const markers = books[bookName];

            console.log(`Reflowing ${bookName} (${bookId})...`);

            // Fetch all paragraphs in order
            const paragraphs = getAllParasInBook.all(bookId);

            let currentMarkerIdx = 0;
            let currentPageId = null;
            let paragraphsUpdated = 0;

            for (const para of paragraphs) {
                // Check if this paragraph starts a new page
                // We look at the NEXT marker
                if (currentMarkerIdx < markers.length) {
                    const nextMarker = markers[currentMarkerIdx];
                    // Clean text comparison: Remove Markdown chars (*, _, [, ]) and extra whitespace
                    // Also lower case for case-insensitive match
                    const paraTextRaw = para.text_original;
                    const paraTextClean = paraTextRaw.replace(/[\*\_\[\]]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                    const snippetClean = nextMarker.first_sentence_snippet.replace(/[\*\_\[\]]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

                    // Simple "Starts With" check (can be fuzzy later)
                    if (paraTextClean.includes(snippetClean.substring(0, 30))) { // Check first 30 chars
                        // Start New Page
                        const res = insertPage.run(bookId, nextMarker.page_number);
                        currentPageId = res.lastInsertRowid;
                        currentMarkerIdx++;
                        console.log(`  -> Started Page ${nextMarker.page_number} at ID ${para.paragraph_id}`);
                    }
                }

                if (currentPageId) {
                    updateParaPage.run(currentPageId, para.paragraph_id);
                    paragraphsUpdated++;
                } else {
                    // BEFORE first marker? Assign to a "Pre-content" page (e.g. 0) or keep as is?
                    // Usually Title/Intro. Let's create Page 0 if not exists.
                    // Or usually First Marker IS Page 1 or 5.
                }
            }
            console.log(`  Updated ${paragraphsUpdated} paragraphs.`);

            // Cleanup: Delete old Virtual Pages that have no paragraphs now?
            // db.prepare('DELETE FROM pages WHERE book_id = ? AND page_id NOT IN (SELECT DISTINCT page_id FROM paragraphs)').run(bookId);
        }
    })();
}

reflowPages();
