const fs = require('fs');
const path = require('path');
const https = require('https');

const ASSETS_DIR = path.join(__dirname, '../assets/quran_pages_hq');
const CONFIG_FILE = path.join(__dirname, '../src/config/quranPagesHQ.ts');
const BASE_URL = 'https://raw.githubusercontent.com/QuranHub/quran-pages-images/main/easyquran.com/hafs-tajweed';
const TOTAL_PAGES = 604;

// Create assets directory
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log(`Created directory: ${ASSETS_DIR}`);
}

const downloadImage = (pageNum) => {
    return new Promise((resolve, reject) => {
        const fileName = `${pageNum}.jpg`;
        const filePath = path.join(ASSETS_DIR, fileName);
        const url = `${BASE_URL}/${fileName}`;

        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download page ${pageNum}: Status ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                // console.log(`Downloaded page ${pageNum}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => { }); // Delete partial file
            reject(err);
        });
    });
};

const generateConfig = () => {
    let content = 'export const QURAN_PAGES_HQ: Record<number, any> = {\n';
    for (let i = 1; i <= TOTAL_PAGES; i++) {
        // React Native require paths are relative to the file.
        // src/config/quranPagesHQ.ts -> ../../assets/quran_pages_hq/1.jpg
        content += `    ${i}: require('../../assets/quran_pages_hq/${i}.jpg'),\n`;
    }
    content += '};\n';
    fs.writeFileSync(CONFIG_FILE, content);
    console.log(`Generated config file: ${CONFIG_FILE}`);
};

const main = async () => {
    console.log('Starting download of 604 Quran pages...');

    // Process in chunks to avoid opening too many connections
    const CHUNK_SIZE = 20;
    for (let i = 1; i <= TOTAL_PAGES; i += CHUNK_SIZE) {
        const promises = [];
        for (let j = i; j < i + CHUNK_SIZE && j <= TOTAL_PAGES; j++) {
            promises.push(downloadImage(j));
        }
        try {
            await Promise.all(promises);
            process.stdout.write(`\rProgress: ${Math.min(i + CHUNK_SIZE - 1, TOTAL_PAGES)}/${TOTAL_PAGES}`);
        } catch (err) {
            console.error('\nError downloading batch starting at ' + i, err);
        }
    }

    console.log('\nDownload complete.');
    generateConfig();
};

main();
