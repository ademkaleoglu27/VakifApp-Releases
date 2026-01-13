import * as fs from 'fs';
import * as path from 'path';
import { generateSectionUid } from './sectionUid';

// Mock DB Driver interface (compatible with expo-sqlite logic or direct node-sqlite)
// In a real tool this would use 'sqlite3' or 'better-sqlite3' for Node execution.
// For this deliverable, we provide the logic structure.
// NOTE: This script assumes running in a Node environment with access to a SQLite driver.
// We will simulate the DB interactions for the purpose of the architecture prompt.

interface IngestConfig {
    books: {
        id: string;
        path: string;
        version: string;
        title: string;
        enabled: boolean;
    }[];
}

interface RawSection {
    title: string;
    order_index: number;
    type?: 'main' | 'sub' | 'footnote';
    sub_sections?: RawSection[];
    text?: string; // For leaf nodes or paragraphs
}

async function runIngest() {
    console.log('[Ingest] Starting Risale-i Nur Ingest Pipeline...');

    // 1. Load Config
    const configPath = path.join(__dirname, 'config', 'risale_books.json');
    const config: IngestConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // 2. Open Database (Simulated connection)
    console.log('[Ingest] Connecting to DB...');
    // const db = await openDatabase('app.db'); 

    // 3. Verify Constraints
    // await verifyUniqueIndex(db);

    // 4. Process Each Book
    for (const book of config.books) {
        if (!book.enabled) {
            console.log(`[Ingest] Skipping disabled book: ${book.title}`);
            continue;
        }

        console.log(`[Ingest] Processing book: ${book.title} (${book.id})...`);
        const sourcePath = path.join(path.dirname(configPath), '../../', book.path); // Resolve relative to tools/ingest/config

        if (!fs.existsSync(sourcePath)) {
            console.error(`[Ingest] ERROR: Source file not found: ${sourcePath}`);
            continue; // or process.exit(1) based on strictness
        }

        const rawData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

        // Recursive Ingest
        await ingestSections(book.id, book.version, rawData.sections, [], null);
    }

    console.log('[Ingest] Completed.');
}

async function ingestSections(
    bookId: string,
    version: string,
    sections: RawSection[],
    parentChain: { title: string; orderIndex: number }[],
    parentId: string | null
) {
    for (const section of sections) {
        // 1. Generate Deterministic UID
        const currentChain = [...parentChain]; // Chain *up to* this section (parents only)

        // Strict Seed Logic: normalize(title) | order | parent_chain
        const uid = generateSectionUid(section.title, section.order_index, currentChain);

        // 2. Prepare DB Record
        // INSERT OR IGNORE / UPSERT logic
        // We use INSERT OR IGNORE to respect existing "Sözler" or other data.
        // If we want to update content (e.g. text fixes) we'd use UPSERT on the data columns, 
        // but NEVER change the ID or UID.

        const record = {
            book_id: bookId,
            section_uid: uid,
            title: section.title,
            order_index: section.order_index,
            parent_id: parentId, // This might be tricky if parentId is also generated. 
            // Ideally we use UIDs for parent links too in V2, 
            // but schema uses 'parent_id' referring to 'id'.
            // For now, assume we look up the parent's ID by its UID.
            version: version,
            type: section.type || 'main'
        };

        console.log(`[Ingest] Merge: ${section.title} -> UID: ${uid}`);

        // SIMULATED DB OPERATION:
        // const existing = await db.get('SELECT id FROM sections WHERE book_id = ? AND section_uid = ?', [bookId, uid]);
        // let actualId: string;
        // if (existing) {
        //    actualId = existing.id;
        //    // Optional: Update version/title/content if needed
        // } else {
        //    // Insert new
        //    actualId = uuidv4(); // Generate new internal ID
        //    await db.run('INSERT INTO sections ...', [actualId, ...]);
        // }

        // 3. Recurse for children
        if (section.sub_sections && section.sub_sections.length > 0) {
            // Update chain for children: include THIS section
            const nextChain = [...currentChain, { title: section.title, orderIndex: section.order_index }];
            // Pass actualId as parentId for children
            // await ingestSections(bookId, version, section.sub_sections, nextChain, actualId);
        }
    }
}

// In a real execution, we would invoke runIngest();
// For this deliverable, it is a logic reference.
export { runIngest };
