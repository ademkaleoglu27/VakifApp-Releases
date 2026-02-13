const https = require('https');

// Config
const USER = 'alitekdemir';
const REPO = 'Risale-i-Nur-Diyanet';
const BRANCH = 'master';
const ROOT_PATH = 'obsidian-markdown';

const TARGET_PREFIXES = ['10', '11', '12', '13', '14'];

function listRepoContent(path = '') {
    return new Promise((resolve, reject) => {
        const urlPath = path ? `/${encodeURIComponent(path)}` : '';
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${USER}/${REPO}/contents/${ROOT_PATH}${urlPath}?ref=${BRANCH}`,
            method: 'GET',
            headers: {
                'User-Agent': 'NodeJS-Probe',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log("Listing root of content:", ROOT_PATH);
        const root = await listRepoContent('');

        for (const prefix of TARGET_PREFIXES) {
            const dir = root.find(item => item.name.startsWith(prefix) && item.type === 'dir');
            if (dir) {
                console.log(`\n--- Found: ${dir.name} ---`);
                const files = await listRepoContent(dir.name);
                const mdFiles = files.filter(f => f.name.endsWith('.md'));

                // Print formatted for compile-content.js
                console.log(`folderName: "${dir.name}",`);
                // Format files for array
                console.log("files: [");
                mdFiles.forEach(f => {
                    console.log(`    "${f.name}",`);
                });
                console.log("]");
            } else {
                console.log(`\n--- NOT FOUND: ${prefix} ---`);
            }
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
