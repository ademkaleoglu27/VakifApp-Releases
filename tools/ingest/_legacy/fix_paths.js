const fs = require('fs');
const path = require('path');

const legacyDir = __dirname;
const files = fs.readdirSync(legacyDir).filter(f => f.endsWith('.legacy.js'));

files.forEach(file => {
    const filePath = path.join(legacyDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // Fix DB Path
    if (content.includes("'../assets/risale.db'") || content.includes('"../assets/risale.db"')) {
        content = content.replace(/'\.\.\/assets\/risale.db'/g, "'../../../assets/risale.db'");
        content = content.replace(/"\.\.\/assets\/risale.db"/g, '"../../../assets/risale.db"');
        changed = true;
    }

    // Fix JSON Path
    if (content.includes("'../assets/risale_json/") || content.includes('"../assets/risale_json/') || content.includes("`../assets/risale_json/")) {
        content = content.replace(/'\.\.\/assets\/risale_json\//g, "'../../../assets/risale_json/");
        content = content.replace(/"\.\.\/assets\/risale_json\//g, '"../../../assets/risale_json/');
        content = content.replace(/`\.\.\/assets\/risale_json\//g, '`../../../assets/risale_json/');
        changed = true;
    }

    // Fix Meta Path
    if (content.includes("'../assets/content/content.meta.json'") || content.includes('"../assets/content/content.meta.json"')) {
        content = content.replace(/'\.\.\/assets\/content\/content.meta.json'/g, "'../../../assets/content/content.meta.json'");
        content = content.replace(/"\.\.\/assets\/content\/content.meta.json"/g, '"../../../assets/content/content.meta.json"');
        changed = true;
    }

    // Fix Require Shared Modules
    // Regex for require('./ingest/_shared/...') or require("./ingest/_shared/...")
    if (content.includes("ingest/_shared/")) {
        content = content.replace(/require\(['"]\.\/ingest\/_shared\//g, "require('../_shared/");
        content = content.replace(/require\(['"]\.\.\/ingest\/_shared\//g, "require('../_shared/");
        changed = true;
    }

    if (changed) {
        console.log(`Fixed paths in ${file}`);
        fs.writeFileSync(filePath, content, 'utf-8');
    }
});
