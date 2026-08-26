import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const BASE_GITHUB_URL = 'https://raw.githubusercontent.com/GovarJabbar/Quran-PNG/master';
const LOCAL_DIR = FileSystem.documentDirectory + 'quran/pages/';

export interface QuranPage {
    pageNumber: number;
    localUri: string | null;
    remoteUrl: string;
}

export const QuranService = {
    /**
     * Ensures the local directory exists
     */
    async ensureDirectory() {
        const dirInfo = await FileSystem.getInfoAsync(LOCAL_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(LOCAL_DIR, { intermediates: true });
        }
    },

    /**
     * Gets structure for a specific Juz
     * A Juz is typically 20 pages.
     * Juz 1: 1-20
     * Juz 2: 21-40
     * ...
     * Juz 30: 581-604 (24 pages)
     */
    getJuzPageRange(juzNumber: number): { start: number; end: number } {
        if (juzNumber < 1 || juzNumber > 30) throw new Error('Invalid Juz Number');

        const start = (juzNumber - 1) * 20 + 1;
        const end = juzNumber === 30 ? 604 : start + 19;
        return { start, end };
    },

    /**
     * Checks status of pages for a Juz
     * Returns list of pages with status (downloaded or not)
     */
    async getJuzStatus(juzNumber: number): Promise<{ pages: QuranPage[]; isFullyDownloaded: boolean; downloadedCount: number, totalCount: number }> {
        await this.ensureDirectory();

        const { start, end } = this.getJuzPageRange(juzNumber);
        const pages: QuranPage[] = [];
        let downloadedCount = 0;

        for (let i = start; i <= end; i++) {
            const padNum = i.toString().padStart(3, '0');
            const fileName = `${padNum}.png`;
            const localPath = LOCAL_DIR + fileName;

            // Check if exists
            const info = await FileSystem.getInfoAsync(localPath);

            pages.push({
                pageNumber: i,
                localUri: info.exists ? localPath : null,
                remoteUrl: `${BASE_GITHUB_URL}/${fileName}`
            });

            if (info.exists) downloadedCount++;
        }

        return {
            pages,
            isFullyDownloaded: downloadedCount === (end - start + 1),
            downloadedCount,
            totalCount: end - start + 1
        };
    },

    /**
     * Downloads a specific Juz
     * onProgress callback returns formatted string "X/Y indirilidi"
     */
    async downloadJuz(juzNumber: number, onProgress?: (progress: number, total: number) => void): Promise<void> {
        await this.ensureDirectory();
        const { start, end } = this.getJuzPageRange(juzNumber);

        let completed = 0;
        const total = end - start + 1;

        // Parallel download management could be better, but sequential is safer for reliability
        for (let i = start; i <= end; i++) {
            const padNum = i.toString().padStart(3, '0');
            const fileName = `${padNum}.png`;
            const localPath = LOCAL_DIR + fileName;
            const remoteUrl = `${BASE_GITHUB_URL}/${fileName}`;

            // Skip if already exists
            const info = await FileSystem.getInfoAsync(localPath);
            if (!info.exists) {
                try {
                    await FileSystem.downloadAsync(remoteUrl, localPath);
                } catch (e) {
                    console.error(`Failed to download page ${i}`, e);
                    // Continue to next page even if one fails
                }
            }

            completed++;
            if (onProgress) onProgress(completed, total);
        }
    },

    /**
     * Get image source for a page (Local preferred, Remote fallback)
     * Compatible with <Image source={{ uri: ... }} />
     */
    async getPageSource(pageNumber: number): Promise<string> {
        const padNum = pageNumber.toString().padStart(3, '0');
        const fileName = `${padNum}.png`;
        const localPath = LOCAL_DIR + fileName;

        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) {
            return localPath;
        } else {
            return `${BASE_GITHUB_URL}/${fileName}`;
        }
    },

    /**
     * Clear cache for a Juz
     */
    async deleteJuz(juzNumber: number): Promise<void> {
        const { start, end } = this.getJuzPageRange(juzNumber);
        for (let i = start; i <= end; i++) {
            const padNum = i.toString().padStart(3, '0');
            const fileName = `${padNum}.png`;
            const localPath = LOCAL_DIR + fileName;
            await FileSystem.deleteAsync(localPath, { idempotent: true });
        }
    }
};
