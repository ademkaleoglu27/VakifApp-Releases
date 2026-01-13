import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RISALE_ROOT = FileSystem.documentDirectory + 'risale/';
const RISALE_PDF_DIR = RISALE_ROOT + 'pdfs/';
const RISALE_JSON_DIR = RISALE_ROOT + 'json/';

const META_STORAGE_KEY = 'risale_assets_meta_v3'; // bump again to force redeploy

const PDF_ASSETS: Record<string, any> = {}; // PDF assets removed

const JSON_ASSETS: Record<string, any> = {
    'risale.meta.json': require('../../assets/risale_json/risale.meta.json'), // IMPORTANT
    'sozler.json': require('../../assets/risale_json/sozler.json'),
    'mektubat.json': require('../../assets/risale_json/mektubat.json'),
    // ...
};

const normalizeBooks = (arr: any): string[] =>
    Array.isArray(arr) ? [...arr].map(String).sort() : [];

export const RisaleAssets = {
    async init(): Promise<void> {
        try {
            await this.ensureDirectories();

            const currentMetaStr = await AsyncStorage.getItem(META_STORAGE_KEY);

            // Source of truth for Reader JSON:
            const bundledJsonMeta = JSON_ASSETS['risale.meta.json'];
            if (!bundledJsonMeta) throw new Error('Missing bundled JSON meta: assets/risale_json/risale.meta.json');

            let shouldUpdate = false;

            if (!currentMetaStr) {
                shouldUpdate = true;
            } else {
                const currentMeta = JSON.parse(currentMetaStr);

                const sameVersion = currentMeta?.version === bundledJsonMeta?.version;
                const sameUpdatedAt = currentMeta?.updatedAt === bundledJsonMeta?.updatedAt;
                const sameBooks =
                    JSON.stringify(normalizeBooks(currentMeta?.books)) ===
                    JSON.stringify(normalizeBooks(bundledJsonMeta?.books));

                shouldUpdate = !(sameVersion && sameUpdatedAt && sameBooks);
            }

            if (shouldUpdate) {
                await this.deployAssets();
            }
        } catch (error) {
            console.error('RisaleAssets init error:', error);
        }
    },

    async ensureDirectories() {
        const rootInfo = await FileSystem.getInfoAsync(RISALE_ROOT);
        if (!rootInfo.exists) await FileSystem.makeDirectoryAsync(RISALE_ROOT, { intermediates: true });

        // PDF Dir kept empty for now or remove if desired, keeping for safety against crashes
        const pdfInfo = await FileSystem.getInfoAsync(RISALE_PDF_DIR);
        if (!pdfInfo.exists) await FileSystem.makeDirectoryAsync(RISALE_PDF_DIR, { intermediates: true });

        const jsonInfo = await FileSystem.getInfoAsync(RISALE_JSON_DIR);
        if (!jsonInfo.exists) await FileSystem.makeDirectoryAsync(RISALE_JSON_DIR, { intermediates: true });
    },

    async deployAssets(): Promise<void> {
        // PDF Deployment removed

        // JSON corpus
        const bundledJsonMeta = JSON_ASSETS['risale.meta.json'];

        // 1) write every JSON file listed in JSON meta (ensures alignment)
        for (const filename of bundledJsonMeta.books ?? []) {
            const content = JSON_ASSETS[filename];
            if (!content) {
                console.warn(`Missing bundled JSON asset: ${filename}`);
                continue;
            }
            await FileSystem.writeAsStringAsync(
                RISALE_JSON_DIR + filename,
                JSON.stringify(content),
                { encoding: FileSystem.EncodingType.UTF8 }
            );
        }

        // 2) write JSON meta to JSON dir (correct source of truth)
        await FileSystem.writeAsStringAsync(
            RISALE_JSON_DIR + 'risale.meta.json',
            JSON.stringify(bundledJsonMeta),
            { encoding: FileSystem.EncodingType.UTF8 }
        );

        // 3) store JSON meta to AsyncStorage (update decision uses this)
        await AsyncStorage.setItem(META_STORAGE_KEY, JSON.stringify(bundledJsonMeta));
    },

    // PDF Path getter removed
    // getPdfPath(filename: string): string { ... }

    getJsonPath(filename: string): string {
        return RISALE_JSON_DIR + filename;
    },

    async getMeta(): Promise<any> {
        try {
            const path = RISALE_JSON_DIR + 'risale.meta.json';
            const info = await FileSystem.getInfoAsync(path);
            if (info.exists) {
                const content = await FileSystem.readAsStringAsync(path);
                return JSON.parse(content);
            }
        } catch (e) {
            console.error('Failed to read meta', e);
        }
        return null;
    }
};
