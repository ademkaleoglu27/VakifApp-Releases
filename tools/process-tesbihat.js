const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, 'tesbihat_source.txt');
const outputPath = path.join(__dirname, '../src/features/tesbihat/data/tesbihatTextData.ts');

try {
    let content = fs.readFileSync(sourcePath, 'utf8');

    // Basic cleanup
    content = content.trim();

    // If source is empty
    if (!content) {
        console.error('HATA: Dosya boş!');
        process.exit(1);
    }

    // Try to auto-split by major Headers if we find them
    const headers = [
        'Sabah Namazı Tesbihatı',
        'Tercüman-ı İsm-i A’zâm duası okunur:',
        'Avuçlar yukarı gelecek şekilde eller açılır:',
        'Haşr Sûresi’nin 20-24.Âyetleri okunur:',
        'Fatiha-i Şerife ile tesbihat tamamlanır:',
        'SABAH NAMAZI TÜRKÇE OKUNUŞU'
    ];

    let processed = content;
    headers.forEach(h => {
        processed = processed.split(h).join(`\n---\n${h}`);
    });

    // Split by manually or auto-inserted '---'
    let pages = processed.split('---').map(p => p.trim()).filter(p => p.length > 5);

    // If no pages found (splitting failed), just use the whole text as one page
    if (pages.length === 0) {
        pages = [content];
    }

    const outputContent = `
export interface TesbihatPage {
    id: number;
    text: string;
}

export const tesbihatTextData: TesbihatPage[] = ${JSON.stringify(pages.map((text, i) => ({
        id: i + 1,
        text: text
    })), null, 4)};
`;

    fs.writeFileSync(outputPath, outputContent);
    console.log(`Script Tamamlandı. ${pages.length} sayfa oluşturuldu.`);

} catch (error) {
    console.error('Hata:', error);
}
