const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const KEYWORDS = ['kuran', 'quran', 'cevsen', 'cevşen', 'tesbihat', 'kapak', 'cover', 'book'];
const EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function searchImages(dir, results = []) {
    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            searchImages(fullPath, results);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (EXTENSIONS.includes(ext)) {
                const lowerName = file.toLowerCase();
                // Check if any keyword matches
                const matches = KEYWORDS.filter(kw => lowerName.includes(kw));
                if (matches.length > 0) {
                    results.push({
                        file: file,
                        path: path.relative(path.join(__dirname, '..'), fullPath),
                        matches: matches
                    });
                }
            }
        }
    }

    return results;
}

console.log('🔍 Aranıyor: Kuran, Cevşen, Tesbihat görselleri...');
try {
    const findings = searchImages(ASSETS_DIR);

    if (findings.length === 0) {
        console.log('\n❌ İlgili isimleri (kuran, cevşen, tesbihat vb.) içeren görsel Asset klasöründe bulunamadı.');
    } else {
        console.log(`\n✅ Toplam ${findings.length} adet olası görsel bulundu:\n`);
        findings.forEach((f, idx) => {
            console.log(`${idx + 1}. [${f.matches.join(', ')}] -> ${f.path}`);
        });
    }

    // Also let's check what the LibraryCatalog says
    const catalogPath = path.join(__dirname, '..', 'src', 'features', 'library', 'data', 'LibraryCatalog.ts');
    if (fs.existsSync(catalogPath)) {
        const catalogContent = fs.readFileSync(catalogPath, 'utf8');
        console.log('\n=============================================');
        console.log('📚 LibraryCatalog.ts içindeki referanslar (quran, cevsen, tesbihat):');

        const lines = catalogContent.split('\n');
        lines.forEach((line, i) => {
            if (line.match(/(quran|cevsen|tesbihat)/i) && line.includes('require(')) {
                console.log(`Satır ${i + 1}: ${line.trim()}`);
            }
        });
    }

} catch (error) {
    console.error('Hata oluştu:', error);
}
