
import path from 'path';
import fs from 'fs';
import { PDFExtract, PDFExtractOptions } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();
const PDF_PATH = path.join(__dirname, '../assets/risale_pdfs/sozler.pdf');

async function findText() {
    console.log('Searching for "Bismillahirrahmanirrahim"...');
    const data = await pdfExtract.extract(PDF_PATH, { firstPage: 1, lastPage: 50 });

    for (let i = 0; i < data.pages.length; i++) {
        const page = data.pages[i];
        const text = page.content.map(c => c.str).join(''); // Join without space to catch split text

        // Remove spaces for loose matching
        const cleanText = text.replace(/\s/g, '').toLowerCase();

        if (cleanText.includes('bismillahirrahmanirrahim')) {
            console.log(`FOUND "Bismillahirrahmanirrahim" on Page ${i + 1}`);
            const lines = page.content.slice(0, 50).map(c => c.str).join(' ');
            console.log('Preview:', lines.substring(0, 300));
            return;
        }
    }
    console.log('Not found in first 50 pages.');
}

findText();
