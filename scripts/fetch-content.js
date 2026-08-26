const https = require('https');
const fs = require('fs');

// Try a few likely URL patterns
const urls = [
    "https://raw.githubusercontent.com/alitekdemir/Risale-i-Nur-Diyanet/master/obsidian-markdown/Sözler/1.%20Söz.md",
    "https://raw.githubusercontent.com/alitekdemir/Risale-i-Nur-Diyanet/master/obsidian-markdown/Sözler/1.Söz.md",
    "https://raw.githubusercontent.com/alitekdemir/Risale-i-Nur-Diyanet/master/obsidian-markdown/Sözler/01.Söz.md",
    "https://raw.githubusercontent.com/alitekdemir/Risale-i-Nur-Diyanet/master/obsidian-markdown/Sözler/1_Soz.md"
];

const dest = "scripts/source_content.md";

function tryNext(index) {
    if (index >= urls.length) {
        console.error("All URLs failed.");
        return;
    }

    const url = urls[index];
    console.log(`Trying ${url}...`);

    https.get(url, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Success: Downloaded to ${dest}`);
            });
        } else {
            console.log(`Failed: ${res.statusCode}`);
            tryNext(index + 1);
        }
    }).on('error', (err) => {
        console.error(err);
        tryNext(index + 1);
    });
}

tryNext(0);
