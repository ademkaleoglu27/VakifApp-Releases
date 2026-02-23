const fs = require('fs');
const path = require('path');

// This script runs on EAS Build after `npx expo prebuild` but before `gradlew` runs.
// It ensures that raw HTML assets required by WebView are copied into the native Android assets directory.

console.log('🔄 Running EAS Pre-Build Hook: restore_android_assets.js');

const srcDir = path.join(__dirname, '..', 'assets', 'risale_html_pilot', '01_sozler');
const destDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'risale_html_pilot', '01_sozler');

if (fs.existsSync(srcDir)) {
    console.log(`📁 Copying Sözler HTML files from ${srcDir} to ${destDir}`);
    fs.mkdirSync(destDir, { recursive: true });

    // Copy all files
    const files = fs.readdirSync(srcDir);
    let count = 0;
    for (const file of files) {
        if (file.endsWith('.html')) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
            count++;
        }
    }
    console.log(`✅ Successfully copied ${count} HTML files to Android assets.`);
} else {
    console.warn(`⚠️ Warning: Source directory ${srcDir} does not exist! Sözler will not be bundled.`);
}

console.log('🎉 EAS Pre-Build Hook completed.');
