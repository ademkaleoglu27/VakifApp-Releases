export type ReaderMode = 'pdf' | 'text';

export interface ReaderLocation {
    bookId: string;
    pageNumber: number; // Universal page number reference (1-based usually)
    cuzId?: number;     // Optional context
}

export type ReaderTheme = 'light' | 'dark' | 'sepia';

export interface ReaderConfig {
    theme: ReaderTheme;
    fontSize?: number;
    useScrollMode: boolean; // false = pagination
    preferredFormat?: 'pdf' | 'json';
}

export interface ReaderProps {
    // CONFIG
    manifestUri: string; // "file:///..." or "bundle://..." URI pointing to manifest.json
    initialLocation?: ReaderLocation;
    config: ReaderConfig;

    // CALLBACKS
    onLocationChange?: (location: ReaderLocation) => void;
    onClose?: () => void;
    onError?: (error: Error) => void;

    // Style overrides if absolutely necessary (e.g. safe area)
    style?: any;
}

export interface BookFormatInfo {
    enabled: boolean;
    root: string;
    pageCount?: number;
    files?: {
        range_strategy: string;
        path: string;
    };
}

export interface BookFormat {
    pdf?: BookFormatInfo;
    text?: BookFormatInfo;
    json?: BookFormatInfo;
}

export interface BookManifest {
    id: string;
    title: string;
    formats: BookFormat;
}

export interface ManifestData {
    version: string;
    buildDate: string;
    books: Record<string, BookManifest>;
}
