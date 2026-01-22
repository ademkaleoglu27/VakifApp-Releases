export const FeatureFlags = {
    // Phase 1: Ingestion V2 (Not runtime impactful, but good for consistency)
    INGEST_V2_ENABLED: false,

    // Phase 2: Council SQLite Storage
    COUNCIL_SQLITE_ENABLED: false,
    COUNCIL_DUAL_WRITE_ENABLED: false, // Write to both Stores (for safety during switching)
    COUNCIL_IMPORT_ON_ENTRY: false, // Run migration when app opens

    // Phase 4: Quran Image Reader (WebP)
    QURAN_IMAGE_READER_ENABLED: true,
    QURAN_IMAGE_SOURCE: 'remote', // 'local' | 'remote'
    QURAN_OFFLINE_PACK_ENABLED: true, // New ZIP-based offline pack
};




export type FeatureFlagKey = keyof typeof FeatureFlags;

export const getFlagSnapshot = () => {
    return { ...FeatureFlags };
};

export const isFlagEnabled = (key: FeatureFlagKey): boolean => {
    return (FeatureFlags as any)[key] === true;
};
