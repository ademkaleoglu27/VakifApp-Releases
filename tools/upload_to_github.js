
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const AUDIO_BUNDLE_DIR = path.join(__dirname, '..', 'audio_release_bundle');
const RL = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => new Promise(resolve => RL.question(question, resolve));

async function main() {
    console.log('\n--- GitHub Release Upload Tool ---\n');

    if (!fs.existsSync(AUDIO_BUNDLE_DIR)) {
        console.error(`Error: Directory ${AUDIO_BUNDLE_DIR} does not exist. Run prepare_audio_release.js first.`);
        process.exit(1);
    }

    const token = await ask('Enter your GitHub Personal Access Token (starts with ghp_ or github_pat_): ');
    if (!token) { console.error('Token is required.'); process.exit(1); }

    let repo = await ask('Enter your Repository (e.g. username/repo): ');
    if (!repo) { console.error('Repository is required.'); process.exit(1); }

    // Clean up repo input if user pasted full URL
    repo = repo.replace('https://github.com/', '').replace('http://github.com/', '').replace(/\/$/, '');
    console.log(`Target Repository: ${repo}`);

    const tagName = await ask('Enter Release Tag Name (default: v1.0-audio): ') || 'v1.0-audio';

    console.log(`\nChecking release ${tagName} in ${repo}...`);

    try {
        let release = await getReleaseByTag(repo, tagName, token);

        if (!release) {
            console.log('Release not found. Creating new release...');
            try {
                release = await createRelease(repo, tagName, token);
            } catch (createError) {
                // Handle "Repository is empty" error (422)
                if (createError.response && createError.response.statusCode === 422) {
                    const body = JSON.parse(createError.response.body || '{}');
                    if (body.errors && body.errors.some(e => e.message === 'Repository is empty.')) {
                        console.log('Repository is empty. Creating README.md to initialize it...');
                        await createReadme(repo, token);
                        console.log('README.md created. Retrying release creation...');
                        // Wait a bit ensuring consistency
                        await new Promise(r => setTimeout(r, 2000));
                        release = await createRelease(repo, tagName, token);
                    } else {
                        throw createError;
                    }
                } else {
                    throw createError;
                }
            }
        }

        console.log(`\nRelease found/created. Upload URL: ${release.upload_url}`);

        const files = fs.readdirSync(AUDIO_BUNDLE_DIR).filter(f => f.endsWith('.mp3'));
        console.log(`Found ${files.length} audio files to upload.`);

        for (const file of files) {
            console.log(`Uploading ${file}...`);
            try {
                await uploadAsset(release.upload_url, path.join(AUDIO_BUNDLE_DIR, file), file, token);
            } catch (e) {
                if (e.message.includes('already_exists')) {
                    console.log(` - ${file} already exists, skipping.`);
                } else {
                    console.error(` - Failed to upload ${file}: ${e.message}`);
                }
            }
        }

        console.log('\n--- Upload Complete! ---');

        const downloadUrlBase = `https://github.com/${repo}/releases/download/${tagName}/`;
        console.log(`\nIMPORTANT: Copy this URL below to send to me:\n`);
        console.log(`URL: ${downloadUrlBase}\n`);

        const deleteChoice = await ask('Do you want to DELETE the local assets/audio folder now to save space? (yes/no): ');
        if (deleteChoice.toLowerCase().startsWith('y')) {
            const assetsAudioDir = path.join(__dirname, '..', 'assets', 'audio');
            // Basic deletion logic (recursive)
            if (fs.existsSync(assetsAudioDir)) {
                fs.rmSync(assetsAudioDir, { recursive: true, force: true });
                console.log('Local assets/audio folder deleted. APK size optimized!');
            } else {
                console.log('Folder already deleted.');
            }
        } else {
            console.log('Files kept. You can delete assets/audio manually later.');
        }

    } catch (error) {
        console.error('An error occurred:', error.message);
        if (error.response) console.error({ status: error.response.statusCode, body: error.response.body });
    } finally {
        RL.close();
    }
}

// --- Utils ---

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    } catch (e) { resolve(body); }
                } else {
                    // Pass body for debugging
                    reject({ message: `Request failed with ${res.statusCode}: ${body}`, response: { statusCode: res.statusCode, body } });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function getReleaseByTag(repo, tag, token) {
    try {
        return await request({
            hostname: 'api.github.com',
            path: `/repos/${repo}/releases/tags/${tag}`,
            method: 'GET',
            headers: { 'User-Agent': 'NodeJS-Script', 'Authorization': `token ${token}` }
        });
    } catch (e) {
        return null; // Not found
    }
}

async function createReadme(repo, token) {
    return await request({
        hostname: 'api.github.com',
        path: `/repos/${repo}/contents/README.md`,
        method: 'PUT',
        headers: { 'User-Agent': 'NodeJS-Script', 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }
    }, {
        message: 'Initial commit (Auto-created for release)',
        content: Buffer.from('# Audio Assets\n\nSound files for VakifApp.').toString('base64')
    });
}

async function createRelease(repo, tag, token) {
    return await request({
        hostname: 'api.github.com',
        path: `/repos/${repo}/releases`,
        method: 'POST',
        headers: { 'User-Agent': 'NodeJS-Script', 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }
    }, { tag_name: tag, name: 'Audio Assets', body: 'Audio files for the app (on-demand download).' });
}

function uploadAsset(uploadUrlTemplate, filePath, fileName, token) {
    return new Promise((resolve, reject) => {
        const stats = fs.statSync(filePath);
        const uploadUrl = uploadUrlTemplate.replace('{?name,label}', `?name=${fileName}`);
        const urlObj = new URL(uploadUrl);

        const req = https.request({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'User-Agent': 'NodeJS-Script',
                'Authorization': `token ${token}`,
                'Content-Type': 'audio/mpeg',
                'Content-Length': stats.size
            }
        }, (res) => {
            // Consume response to free memory
            res.resume();
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    // Check if it's already exists error
                    try {
                        const json = JSON.parse(body);
                        if (json.errors && json.errors.some(e => e.code === 'already_exists')) {
                            reject(new Error('already_exists'));
                        } else {
                            reject(new Error(`Upload failed ${res.statusCode}: ${body}`));
                        }
                    } catch (e) {
                        reject(new Error(`Upload failed ${res.statusCode}: ${body}`));
                    }
                });
            }
        });

        req.on('error', reject);
        const stream = fs.createReadStream(filePath);
        stream.pipe(req);
    });
}

main();
