import * as FileSystem from 'expo-file-system';
import { ManifestData } from '../api/types';

/**
 * Expected major version of the meta schema.
 * If manifest.schemaVersion has a different major, Reader will fail-fast.
 */
export const EXPECTED_META_MAJOR = 1;

export interface SchemaValidationResult {
    valid: boolean;
    expectedMajor: number;
    actualMajor: number | null;
}

/**
 * Validates that the schema version is compatible.
 * @returns true if schema is compatible or if no schemaVersion (legacy support)
 */
export function validateSchemaVersion(data: any): SchemaValidationResult {
    if (!data.schemaVersion) {
        // Legacy manifest without schemaVersion - allow for backwards compatibility
        return { valid: true, expectedMajor: EXPECTED_META_MAJOR, actualMajor: null };
    }

    const parts = data.schemaVersion.split('.');
    const major = parseInt(parts[0], 10);

    if (isNaN(major)) {
        console.warn(`[ManifestParser] Invalid schemaVersion format: ${data.schemaVersion}`);
        return { valid: false, expectedMajor: EXPECTED_META_MAJOR, actualMajor: null };
    }

    const valid = major === EXPECTED_META_MAJOR;
    if (!valid) {
        console.error(`[ManifestParser] Schema version mismatch! Expected major: ${EXPECTED_META_MAJOR}, got: ${major}`);
    }

    return { valid, expectedMajor: EXPECTED_META_MAJOR, actualMajor: major };
}

export class ManifestParser {
    static async load(uri: string): Promise<ManifestData & { schemaValid: boolean }> {
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

            // Schema version validation
            const schemaResult = validateSchemaVersion(data);

            return { ...data, schemaValid: schemaResult.valid };
        } catch (error) {
            console.error(`[ManifestParser] Failed to load manifest:`, error);
            throw error;
        }
    }
}
