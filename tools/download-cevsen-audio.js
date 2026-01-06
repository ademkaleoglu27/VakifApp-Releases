/**
 * Cevşen Audio Download Script
 * 
 * Bu script YouTube videosundan ses indirir ve assets/audio/cevsen klasörüne kaydeder.
 * 
 * Kullanım:
 * 1. yt-dlp yüklü olmalı: npm install -g yt-dlp veya choco install yt-dlp
 * 2. ffmpeg yüklü olmalı: choco install ffmpeg
 * 3. node tools/download-cevsen-audio.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=Q22oRpluUws';
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'cevsen');
const OUTPUT_FILE = 'cevsen_kebir.mp3';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Klasör oluşturuldu: ${OUTPUT_DIR}`);
}

const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║          Cevşen Audio İndirme Scripti                  ║');
console.log('╠════════════════════════════════════════════════════════╣');
console.log(`║ URL: ${YOUTUBE_URL.substring(0, 45)}...`);
console.log(`║ Hedef: ${OUTPUT_FILE}`);
console.log('╚════════════════════════════════════════════════════════╝');

try {
    console.log('\n⏳ YouTube\'dan ses indiriliyor (bu biraz zaman alabilir)...\n');

    // yt-dlp command to extract audio as mp3
    // -x: extract audio
    // --audio-format mp3: convert to mp3
    // --audio-quality 0: best quality
    // -o: output path
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${YOUTUBE_URL}"`;

    execSync(command, { stdio: 'inherit' });

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ İndirme başarılı!                                   ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Dosya: ${outputPath.split('\\').pop()}`);

    // Check file size
    if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`║ Boyut: ${fileSizeMB} MB`);
    }

    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('\n📝 Sonraki adım: Uygulamaya entegrasyon yapılacak.');

} catch (error) {
    console.error('\n❌ Hata oluştu:', error.message);
    console.log('\n📋 Çözüm önerileri:');
    console.log('1. yt-dlp yüklü mü? → npm install -g yt-dlp');
    console.log('2. ffmpeg yüklü mü? → choco install ffmpeg');
    console.log('3. İnternet bağlantınızı kontrol edin.');
    process.exit(1);
}
