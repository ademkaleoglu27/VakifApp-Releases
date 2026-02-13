const https = require('https');

// Config
const USER = 'alitekdemir';
const REPO = 'Risale-i-Nur-Diyanet';
const BRANCH = 'master';
const ROOT_PATH = 'obsidian-markdown';

function listRepoContent(path = '') {
    return new Promise((resolve, reject) => {
        const urlPath = path ? `/${encodeURIComponent(path)}` : ''; // Encode path
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

        // Find folder by index or imperfect match
        const sualarDir = root.find(item => item.name.startsWith('04'));

        if (sualarDir) {
            console.log("Found Directory:", sualarDir.name);
            console.log("Listing contents of:", sualarDir.path);

            const files = await listRepoContent(sualarDir.name);
            const mdFiles = files.filter(f => f.name.endsWith('.md'));

            console.log(`Found ${mdFiles.length} markdown files.`);
            // Sort by numerical prefix if possible, though they usually come sorted
            mdFiles.forEach(f => console.log(`"${f.name}",`));

        } else {
            console.log("Could not find a directory starting with '04' in root.");
            console.log("Root items:", root.map(r => r.name));
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
