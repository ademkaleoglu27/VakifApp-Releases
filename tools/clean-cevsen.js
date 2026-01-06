const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/cevsen.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

let cleanCount = 0;

const cleanText = (text) => {
    if (!text) return text;
    // Remove the specific ad script
    let cleaned = text.replace(/\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);/g, '');
    // Remove potential double newlines left behind or weird spacing
    cleaned = cleaned.replace(/\n\s*\n/g, '\n');
    cleaned = cleaned.trim();

    if (text !== cleaned) {
        cleanCount++;
    }
    return cleaned;
};

const cleanedData = data.map(item => ({
    ...item,
    arabic: cleanText(item.arabic),
    transliteration: cleanText(item.transliteration),
    meaning: cleanText(item.meaning)
}));

fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf8');

console.log(`Cleaned ${cleanCount} fields across the dataset.`);
