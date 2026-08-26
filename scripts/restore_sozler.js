const fs = require('fs');
const path = require('path');

const src = 'temp_risale_source/Risale-Repo/html/01 Sözler';
const dest = 'assets/risale_html_pilot/01_sozler';

fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(src);

for (const file of files) {
    if (file.endsWith('.html')) {
        const match = file.match(/^01\.(\d{2})/);
        if (match) {
            const newName = `01_${match[1]}.html`;
            fs.copyFileSync(path.join(src, file), path.join(dest, newName));
            console.log(`Copied ${file} -> ${newName}`);
        } else {
            console.log('Skipping: ' + file);
        }
    }
}
console.log('Done!');
