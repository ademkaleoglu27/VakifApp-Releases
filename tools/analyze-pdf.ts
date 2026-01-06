import path from 'path';
import fs from 'fs';
import { PDFExtract, PDFExtractOptions, PDFExtractPage, PDFExtractText } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();

const options: PDFExtractOptions = {
    // extract pages 6-10 to find Birinci Soz
    firstPage: 6,
    lastPage: 12,
};

const PDF_PATH = path.join(__dirname, '../assets/risale_pdfs/lemalar.pdf');

async function analyzePdf() {
    if (!fs.existsSync(PDF_PATH)) {
        console.error(`PDF not found: ${PDF_PATH}`);
        process.exit(1);
    }

    console.log(`Analyzing PDF: ${PDF_PATH}`);

    try {
        const data = await pdfExtract.extract(PDF_PATH, options);

        console.log(`Pages: ${data.pages.length}`);

        const fonts = new Set<string>();
        const sampleLines: any[] = [];

        data.pages.forEach((page: PDFExtractPage) => {
            page.content.forEach((item: PDFExtractText) => {
                if (item.str.trim().length > 0) {
                    fonts.add(item.fontName);
                    // Check for font variations (bold/italic often embedded in name)

                    // Collect sample lines if they have interesting fonts
                    if (sampleLines.length < 20) {
                        sampleLines.push({
                            text: item.str,
                            font: item.fontName,
                            x: item.x,
                            y: item.y,
                            height: item.height
                        });
                    }
                }
            });
        });

        console.log('\n--- Detected Fonts ---');
        fonts.forEach(f => console.log(f));

        console.log('\n--- Sample Content ---');
        console.log(JSON.stringify(sampleLines, null, 2));

    } catch (err) {
        console.error('Extraction error:', err);
    }
}

analyzePdf();
