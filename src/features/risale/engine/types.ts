export interface Page {
    pageKey: string; // unique id for list key (e.g. section-1-page-5)
    sectionId: string;
    pageIndex: number; // 0-based index in section

    startOffset: number; // strict char offset in full text
    endOffset: number;   // strict char offset in full text (exclusive)

    contentRaw: string; // fullText.substring(start, end)
}

export interface LayoutMetrics {
    width: number;
    height: number;
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    horizontalPadding: number;
    verticalPadding: number;
    letterSpacing?: number;
    textAlign?: 'left' | 'right' | 'center' | 'justify';
}
