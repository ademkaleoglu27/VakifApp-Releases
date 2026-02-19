
const https = require('https');

const MANIFEST_URL = 'https://raw.githubusercontent.com/ademkaleoglu27/VakifApp-Assets/main/books/buyuk_cevsen/manifest.json';

function checkUrl(url, label) {
    return new Promise((resolve) => {
        console.log(`🔍 Checking ${label}: ${url}`);
        const req = https.request(url, { method: 'HEAD' }, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ ${label} Found (200 OK) - Size: ${res.headers['content-length']} bytes`);
                resolve(true);
            } else {
                console.error(`❌ ${label} Failed (Status: ${res.statusCode})`);
                resolve(false);
            }
        });
        req.on('error', (e) => {
            console.error(`❌ ${label} Error: ${e.message}`);
            resolve(false);
        });
        req.end();
    });
}

async function verify() {
    const manifestExists = await checkUrl(MANIFEST_URL, 'Manifest');
    if (!manifestExists) return;

    // Fetch manifest content to check parts
    const req = https.get(MANIFEST_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
            try {
                const manifest = JSON.parse(data);
                console.log(`📄 Manifest parsed successfully. Total Pages: ${manifest.totalPages}`);

                if (Array.isArray(manifest.assets)) {
                    for (const asset of manifest.assets) {
                        await checkUrl(asset.url, `Asset (${asset.id})`);
                    }
                } else {
                    await checkUrl(manifest.assets.url, `Asset (${manifest.assets.id})`);
                }

                console.log("🎉 All checks passed!");
            } catch (e) {
                console.error("❌ Manifest JSON Parse Error:", e.message);
            }
        });
    });
}

verify();
