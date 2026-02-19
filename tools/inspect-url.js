
const https = require('https');

const pdfUrl = 'https://can-ada.net/wp-content/uploads/2020/04/b%C3%BCy%C3%BCk-cev%C5%9Fen.pdf';

function checkPdf(targetUrl) {
    console.log(`🔍 Checking PDF: ${targetUrl}`);
    const options = {
        method: 'HEAD',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    const req = https.request(targetUrl, options, (res) => {
        console.log(`✅ Status Code: ${res.statusCode}`);

        if (res.statusCode === 301 || res.statusCode === 302) {
            console.log(`➡️ Redirecting to: ${res.headers.location}`);
            // Check if redirect loops back to homepage
            if (res.headers.location === 'https://can-ada.net' || res.headers.location === 'https://can-ada.net/') {
                console.error("❌ Redirected to homepage (File likely missing or protected).");
                return;
            }
            checkPdf(res.headers.location);
            return;
        }

        console.log(`📦 Content-Type: ${res.headers['content-type']}`);
        if (res.headers['content-length']) {
            const sizeMB = (res.headers['content-length'] / 1024 / 1024).toFixed(2);
            console.log(`wv Content-Length: ${sizeMB} MB`);
        }
    });

    req.on('error', (e) => {
        console.error(`❌ Error: ${e.message}`);
    });

    req.end();
}

checkPdf(pdfUrl);
