
import path from 'path';
import fs from 'fs';
import { PDFExtract } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();
const PDF_DIR = path.join(__dirname, '../assets/risale_pdfs');

async function findInAll() {
    console.log('Searching for "BİRİNCİ SÖZ" in all PDFs...');
    const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));

    for (const file of files) {
        const filePath = path.join(PDF_DIR, file);
        process.stdout.write(`Scanning ${file}... `);

        try {
            const data = await pdfExtract.extract(filePath, { firstPage: 1, lastPage: 20 });
            let found = false;

            for (let i = 0; i < data.pages.length; i++) {
                const text = data.pages[i].content.map(c => c.str).join('');
                if (text.toUpperCase().includes('BİRİNCİSÖZ') || text.toUpperCase().includes('BIRINCISOZ')) {
                    console.log(`\n✅ FOUND in ${file} on Page ${i + 1}`);
                    found = true;
                    break;
                }
            }
            if (!found) console.log('Not found.');
        } catch (e) {
            console.log('Error scanning.');
        }
    }
}

findInAll();
