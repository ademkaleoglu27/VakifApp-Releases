const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function cleanPdf() {
    try {
        const inputPath = path.join(__dirname, '../assets/cevsen.pdf');
        // We will overwrite the original for simplicity in the app, 
        // but let's keep a backup just in case users want it back later or for safety.
        // Actually, the plan said save as `cevsen_arabic.pdf`. Let's do that.
        const outputPath = path.join(__dirname, '../assets/cevsen_arabic.pdf');

        console.log(`Loading PDF from: ${inputPath}`);
        const pdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const pageCount = pdfDoc.getPageCount();
        console.log(`Total Pages: ${pageCount}`);

        // Create a new PDF
        const newPdf = await PDFDocument.create();

        // Copy only odd pages (Indices 0, 2, 4...)
        // Page 1 is index 0. Page 2 is index 1.
        // We want Page 1 (0), Page 3 (2), Page 5 (4)...
        const pagesToKeep = [];
        for (let i = 0; i < pageCount; i++) {
            if (i % 2 === 0) { // Keep even indices (Odd page numbers)
                pagesToKeep.push(i);
            }
        }

        console.log(`Keeping ${pagesToKeep.length} pages (Arabic only).`);

        // Copy pages
        const copiedPages = await newPdf.copyPages(pdfDoc, pagesToKeep);
        copiedPages.forEach(page => newPdf.addPage(page));

        // Save
        const pdfBytesNew = await newPdf.save();
        fs.writeFileSync(outputPath, pdfBytesNew);
        console.log(`Saved cleaned PDF to: ${outputPath}`);

    } catch (error) {
        console.error("Error cleaning PDF:", error);
    }
}

cleanPdf();
