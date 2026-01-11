import { getDb } from '../../../services/contentDb';
import sourceData from '../../../../birinci_soz_stage1.json';

export const ContentRepairService = {
    async repairBirinciSoz() {
        const db = getDb();
        const SECTION_ID = 'sozler-01';

        try {
            // 1. Check current count
            const countResult = await db.getFirstAsync<{ c: number }>(
                'SELECT COUNT(*) as c FROM paragraphs WHERE section_id = ?',
                [SECTION_ID]
            );

            const count = countResult?.c || 0;
            console.log(`[ContentRepair] Current chunk count for ${SECTION_ID}: ${count}`);

            // 2. If valid data exists (e.g. > 10 chunks), don't overwrite
            if (count > 10) {
                console.log('[ContentRepair] Data appears valid. Skipping repair.');
                return false; // No repair needed
            }

            console.log('[ContentRepair] Data invalid or missing. Starting repair...');

            // 3. Clear existing bad data
            await db.runAsync('DELETE FROM paragraphs WHERE section_id = ?', [SECTION_ID]);

            // 4. Insert new data
            // sourceData is Array<{ type, text }>
            // We need to map this to DB schema: id, section_id, text, order_index, is_arabic, page_no

            let orderIndex = 0;
            const CHUNKS_PER_PAGE = 7; // Approximate mapping for now

            for (const item of sourceData) {
                // Determine page number based on order index (simple approximation)
                const pageNo = Math.floor(orderIndex / CHUNKS_PER_PAGE) + 1;

                // Determine is_arabic
                const isArabic = item.type === 'arabic_block' ? 1 : 0;

                await db.runAsync(
                    'INSERT INTO paragraphs (id, section_id, text, order_index, is_arabic, page_no) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        `${SECTION_ID}_${orderIndex}`, // Unique ID
                        SECTION_ID,
                        item.text,
                        orderIndex,
                        isArabic,
                        pageNo
                    ]
                );

                orderIndex++;
            }

            console.log(`[ContentRepair] Successfully inserted ${orderIndex} chunks.`);
            return true; // Repair performed

        } catch (error: any) {
            console.error('[ContentRepair] Error repairing content:', error);

            // Check for corruption
            const isCorruption = error?.message?.includes('malformed') || error?.code?.includes('malformed');
            if (isCorruption) {
                const { forceResetDatabase } = require('../../../services/contentDb'); // Require to avoid circular dep issues at top level if any
                console.log('[ContentRepair] Corruption detected. Triggering hard reset...');
                await forceResetDatabase();
                return false;
            }
            throw error;
        }
    }
};
