import { ReaderDatabase } from '../../services/ReaderDatabase';
import * as FileSystem from 'expo-file-system';
import { IndexJobStatus, PackManifest, SectionDoc, Segment } from '../modules/native-reader/types';

interface IndexCursor {
    bookIndex: number;
    sectionIndex: number;
    segmentOffset: number;
}

export const IndexWorker = {
    // 2.4 Recovery on app start
    async initRecovery() {
        try {
            const db = ReaderDatabase.getDb();
            await db.runAsync(
                `UPDATE index_jobs SET status = ? WHERE status = ?`,
                [IndexJobStatus.PENDING, IndexJobStatus.RUNNING]
            );
        } catch (e) {
            console.warn('Index recovery failed', e);
        }
    },

    async runWorker() {
        const db = ReaderDatabase.getDb();

        // 2.1 Job claim tam atomic garanti (race proof)
        let job: { job_id: string, pack_id: string, cursor_json: string } | null = null;

        await db.withTransactionAsync(async () => {
            const pending = await db.getFirstAsync<{ job_id: string, pack_id: string, cursor_json: string }>(
                `SELECT job_id, pack_id, cursor_json FROM index_jobs WHERE status = ? LIMIT 1`,
                [IndexJobStatus.PENDING]
            );
            if (pending) {
                await db.runAsync(
                    `UPDATE index_jobs SET status = ? WHERE job_id = ? AND status = ?`,
                    [IndexJobStatus.RUNNING, pending.job_id, IndexJobStatus.PENDING]
                );

                // Check if we actually won the race
                const changes = await db.getFirstAsync<{ c: number }>(`SELECT changes() as c`);
                if (changes && changes.c === 1) {
                    job = pending;
                } else {
                    console.log(`Lost race for job ${pending.job_id}`);
                }
            }
        });

        if (!job) return;

        const jobId = (job as any).job_id;
        const packId = (job as any).pack_id;
        console.log(`Starting Index Job: ${jobId}`);

        try {
            let cursor: IndexCursor = (job as any).cursor_json
                ? JSON.parse((job as any).cursor_json)
                : { bookIndex: 0, sectionIndex: 0, segmentOffset: 0 };

            // Get Install Path
            const installed = await db.getFirstAsync<{ local_path: string }>(
                `SELECT local_path FROM installed_packs WHERE id = ?`, [packId]
            );

            if (!installed || !installed.local_path) throw new Error('Pack path not found');
            const installPath = installed.local_path;

            // Read Manifest
            const manifestContent = await FileSystem.readAsStringAsync(`${installPath}/manifest.json`);
            const manifest = JSON.parse(manifestContent) as PackManifest;
            const totalBooks = manifest.books.length;

            // Iterate Books
            for (let bIdx = cursor.bookIndex; bIdx < totalBooks; bIdx++) {
                const book = manifest.books[bIdx];
                const bookContentPath = `${installPath}/${book.path}`;

                let bookContent: { sections: SectionDoc[] };
                try {
                    const contentStr = await FileSystem.readAsStringAsync(bookContentPath);
                    bookContent = JSON.parse(contentStr);
                } catch (e) {
                    console.warn(`Failed to read content ${book.path}`, e);
                    continue;
                }

                const startSecIdx = (bIdx === cursor.bookIndex) ? cursor.sectionIndex : 0;

                // Iterate Sections
                for (let sIdx = startSecIdx; sIdx < bookContent.sections.length; sIdx++) {
                    const section = bookContent.sections[sIdx];

                    // 2.2 Duplicate FTS Fix (Delete before insert) - No extra transaction wrapper for these deletes
                    await db.runAsync(`DELETE FROM fts_titles WHERE bookId = ? AND sectionId = ?`, [book.bookId, section.id]);
                    await db.runAsync(`DELETE FROM fts_text WHERE bookId = ? AND sectionId = ?`, [book.bookId, section.id]);
                    await db.runAsync(`DELETE FROM fts_vecize WHERE sourceBookId = ? AND sourceSectionId = ?`, [book.bookId, section.id]);

                    // Metadata Insert
                    await db.runAsync(
                        `INSERT OR IGNORE INTO sections (id, book_id, title, sort_order, file_path) VALUES (?, ?, ?, ?, ?)`,
                        [section.id, book.bookId, section.title, sIdx, book.path]
                    );

                    // 2.3 Segment Dedupe & Batching
                    const seen = new Set<string>();
                    let pendingBatches: any[] = [];
                    const BATCH_SIZE = 200;

                    for (const segment of section.segments) {
                        // Critical De-dupe
                        if (!segment?.id || seen.has(segment.id)) continue;
                        seen.add(segment.id);

                        pendingBatches.push({ segment, bookId: book.bookId, sectionId: section.id });

                        if (pendingBatches.length >= BATCH_SIZE) {
                            await this.flushBatch(db, pendingBatches);
                            pendingBatches = [];
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }

                    // Flush remaining
                    if (pendingBatches.length > 0) {
                        await this.flushBatch(db, pendingBatches);
                        pendingBatches = [];
                    }

                    // Checkpoint Section Level
                    cursor = { bookIndex: bIdx, sectionIndex: sIdx + 1, segmentOffset: 0 };

                    // Progress Calculation
                    const bookProgress = (bIdx / totalBooks) * 100;
                    const sectionProgress = (sIdx / bookContent.sections.length) * (100 / totalBooks);
                    const totalProgress = Math.min(Math.round(bookProgress + sectionProgress), 99);

                    await this.checkpoint(jobId, cursor, totalProgress);
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                // Reset section index for next book
                cursor.sectionIndex = 0;
            }

            // 2.5 DONE Garantie
            await db.runAsync(`UPDATE index_jobs SET status = ?, progress = 100 WHERE job_id = ?`, [IndexJobStatus.DONE, jobId]);
            console.log(`Index Job Done: ${jobId}`);

        } catch (e: any) {
            console.error('Index Job Failed', e);
            await db.runAsync(
                `UPDATE index_jobs SET status = ?, last_error = ? WHERE job_id = ?`,
                [IndexJobStatus.FAILED, String(e), jobId]
            );
        }
    },

    async flushBatch(db: any, batch: any[]) {
        await db.withTransactionAsync(async () => {
            for (const item of batch) {
                const { segment, bookId, sectionId } = item;
                const text = segment.text || '';

                if (segment.type === 'heading') {
                    await db.runAsync(
                        `INSERT INTO fts_titles (bookId, sectionId, segmentId, titleText) VALUES (?, ?, ?, ?)`,
                        [bookId, sectionId, segment.id, text]
                    );
                } else if (['paragraph', 'note', 'footnote'].includes(segment.type)) {
                    await db.runAsync(
                        `INSERT INTO fts_text (bookId, sectionId, segmentId, text) VALUES (?, ?, ?, ?)`,
                        [bookId, sectionId, segment.id, text]
                    );
                }

                if (segment.type === 'poetry' || (segment as any).isVecize) {
                    await db.runAsync(
                        `INSERT INTO fts_vecize (vecizeId, text, sourceBookId, sourceSectionId, sourceSegmentId, tags) VALUES (?, ?, ?, ?, ?, ?)`,
                        [segment.id, text, bookId, sectionId, segment.id, '']
                    );
                }
            }
        });
    },

    async checkpoint(jobId: string, cursor: IndexCursor, progress: number) {
        const db = ReaderDatabase.getDb();
        await db.runAsync(
            `UPDATE index_jobs SET cursor_json = ?, progress = ?, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?`,
            [JSON.stringify(cursor), progress, jobId]
        );
    }
};
