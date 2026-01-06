
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'assets', 'audio');
const DEST_DIR = path.join(__dirname, '..', 'audio_release_bundle');

function copyAudioFiles(source, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(source);

    items.forEach(item => {
        const fullPath = path.join(source, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            copyAudioFiles(fullPath, dest);
        } else if (item.endsWith('.mp3') || item.endsWith('.wav') || item.endsWith('.m4a')) {
            const destPath = path.join(dest, item);
            fs.copyFileSync(fullPath, destPath);
            console.log(`Copied: ${item}`);
        }
    });
}

console.log('Preparing audio files for upload...');
copyAudioFiles(SOURCE_DIR, DEST_DIR);
console.log('\nAll audio files have been copied to folder: audio_release_bundle');
console.log('You can now upload the contents of this folder to your GitHub Release.');
