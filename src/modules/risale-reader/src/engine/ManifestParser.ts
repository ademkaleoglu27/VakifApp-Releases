import * as FileSystem from 'expo-file-system';
import { ManifestData } from '../api/types';

export class ManifestParser {
    static async load(uri: string): Promise<ManifestData> {
        console.log(`[ManifestParser] Loading manifest from: ${uri}`);

        try {
            // Handle "bundle://" or "asset://" schemes if needed in future
            // For now, assume file:// or absolute path
            // If it's a bundled asset, we might need Asset.fromModule, but requirements say "file system" (documentDirectory)

            const content = await FileSystem.readAsStringAsync(uri);
            const data = JSON.parse(content) as ManifestData;

            // Basic Validation
            if (!data.version || !data.books) {
                throw new Error("Invalid manifest structure: missing version or books");
            }

            return data;
        } catch (error) {
            console.error(`[ManifestParser] Failed to load manifest:`, error);
            throw error;
        }
    }
}
