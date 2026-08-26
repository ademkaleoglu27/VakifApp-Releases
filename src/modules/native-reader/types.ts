export enum PackStatus {
    NOT_INSTALLED = 'NOT_INSTALLED',
    DOWNLOADING = 'DOWNLOADING',
    VERIFYING = 'VERIFYING',
    INSTALLING = 'INSTALLING',
    INSTALLED = 'INSTALLED',
    FAILED = 'FAILED'
}

export enum PackErrorCode {
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
    HTTP_STATUS_NOT_OK = 'HTTP_STATUS_NOT_OK',
    ZIP_SHA_MISMATCH = 'ZIP_SHA_MISMATCH',
    MANIFEST_MISSING = 'MANIFEST_MISSING',
    MANIFEST_INVALID = 'MANIFEST_INVALID',
    FILE_SHA_MISMATCH = 'FILE_SHA_MISMATCH',
    UNZIP_FAILED = 'UNZIP_FAILED',
    DISK_FULL = 'DISK_FULL',
    DB_ERROR = 'DB_ERROR',
    CORRUPT_PACK = 'CORRUPT_PACK',
    UNKNOWN = 'UNKNOWN'
}

export enum IndexJobStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    DONE = 'DONE',
    FAILED = 'FAILED'
}

export interface PackManifest {
    schemaVersion: number;
    packId: string;
    packVersion: string; // "1.0.0"
    minAppVersion: string;
    integrity: {
        packSha256: string;
        files: Array<{ path: string, sha256: string, bytes: number }>;
    };
    books: Array<{
        bookId: string;
        title: string;
        sortOrder: number; // Renamed from 'order' to 'sortOrder'
        path: string; // Path to the book's content file (e.g., "content/book_1.json")
    }>;
}

export interface InstalledPackEntity {
    id: string;
    version: string;
    status: PackStatus;
    local_path: string;
    bytes_total: number;
    bytes_downloaded: number;
    error_code?: PackErrorCode;
    error_message?: string;
    updated_at: string;
    installed_at?: string;
}

// SegmentDocV2 Types
export type SegmentType = 'heading' | 'paragraph' | 'arabic_block' | 'note' | 'footnote' | 'label' | 'divider' | 'poetry';

export interface Segment {
    id: string;
    type: SegmentType;
    text?: string;
    // other props like arab_text, tokens, etc.
}

export interface SectionDoc {
    id: string;
    title: string;
    segments: Segment[];
}
