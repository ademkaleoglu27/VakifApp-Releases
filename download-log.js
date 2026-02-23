const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync('build.json', 'utf16le').replace(/^\uFEFF/, '')); // Remove BOM if present
const logUrl = data.logFiles && data.logFiles.length > 0 ? data.logFiles[data.logFiles.length - 1] : null;

if (logUrl) {
    console.log('Downloading log from:', logUrl);
    https.get(logUrl, (res) => {
        const fileStream = fs.createWriteStream('eas_build_log.txt');
        res.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log('Log downloaded to eas_build_log.txt');
        });
    }).on('error', (err) => {
        console.error('Error downloading:', err.message);
    });
} else {
    console.log('No log files found in build.json');
}
