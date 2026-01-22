export interface QuranManifest {
    id: string;
    version: number;
    pageCount: number;
    format: 'webp' | 'png' | 'jpg';
    widthPx: number;
    heightPx: number | 'variable';
    filePattern: string; // e.g. "pages/{page}.webp"
    pagePad: number; // e.g. 4 for 0001.webp
    quality: number;
}

export interface QuranPageInfo {
    pageNumber: number;
    imageUrl: string;
}
