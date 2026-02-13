const fs = require('fs');
const path = require('path');

const fontPath = path.join(__dirname, '../android/app/src/main/assets/fonts/ScheherazadeNew-Regular.ttf');
const outputPath = path.join(__dirname, '../src/features/reader/html_pilot/ScheherazadeNewBase64.ts');

try {
    const fontBuffer = fs.readFileSync(fontPath);
    const base64 = fontBuffer.toString('base64');

    const fileContent = `export const SCHEHERAZADE_BASE64 = "${base64}";`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Success: Wrote ${base64.length} chars to ${outputPath}`);
} catch (e) {
    console.error('Error:', e);
}
