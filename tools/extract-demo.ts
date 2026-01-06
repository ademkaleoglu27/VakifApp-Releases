
import path from 'path';
import fs from 'fs';
import { PDFExtract, PDFExtractOptions, PDFExtractPage, PDFExtractText } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();

const options: PDFExtractOptions = {
    firstPage: 4, // Skip preamble
    lastPage: 10,
};

const PDF_PATH = path.join(__dirname, '../assets/risale_pdfs/sozler.pdf');

// Based on analysis:
// f4 tends to be Body
// f5 tends to be Emphasis (Bold/Italic)
// We need to detect "base font" per page or global.

async function extractDemo() {
    console.log('Extracting text with style inference...');
    const data = await pdfExtract.extract(PDF_PATH, options);

    let outputMarkdown = '';

    data.pages.forEach((page: PDFExtractPage, pageIdx: number) => {
        outputMarkdown += `\n\n--- PAGE ${pageIdx + 4} ---\n\n`;

        // Sort items by Y then X
        const items = page.content.sort((a, b) => {
            if (Math.abs(a.y - b.y) < 5) return a.x - b.x; // Same line (tolerance 5px)
            return a.y - b.y;
        });

        let currentY = -1;
        let lineText = '';

        // Simple heuristic: Most frequent font is "Regular"
        const fontCounts: { [key: string]: number } = {};
        items.forEach(i => fontCounts[i.fontName] = (fontCounts[i.fontName] || 0) + 1);
        const regularFont = Object.keys(fontCounts).reduce((a, b) => fontCounts[a] > fontCounts[b] ? a : b);

        items.forEach((item: PDFExtractText) => {
            if (item.str.trim() === '') return;

            // New line detection
            if (currentY !== -1 && Math.abs(item.y - currentY) > 8) {
                outputMarkdown += lineText + '\n';
                lineText = '';
            }
            currentY = item.y;

            // Style detection
            let text = item.str;
            if (item.fontName !== regularFont) {
                // Determine if it's title or emphasis
                // Headers often have much larger height ??
                // For now, assume anything non-regular is EMPHASIS (*)
                text = `**${text.trim()}** `; // BOLD
            }

            lineText += text + (item.str.endsWith(' ') ? '' : ' ');
        });

        outputMarkdown += lineText + '\n';
    });

    console.log(outputMarkdown);
}

extractDemo();
