
const https = require('https');

const API_KEY = 'AIzaSyCUpHKkbG9iDrJcePDsKDs2g0t40aBdn80';

const modelsToTest = [
    'text-embedding-004',
    'models/text-embedding-004',
    'embedding-001',
    'models/embedding-001'
];

const testModel = (modelName) => {
    return new Promise((resolve) => {
        // Embeddings endpoint is different: models/{model}:embedContent
        const cleanName = modelName.startsWith('models/') ? modelName : `models/${modelName}`;

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/${cleanName}:embedContent?key=${API_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ FOUND & WORKING: ${modelName}`);
                    resolve(modelName);
                } else {
                    console.log(`❌ ${modelName}: ${res.statusCode} - ${body.substring(0, 100)}`);
                    resolve(null);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Error with ${modelName}: ${e.message}`);
            resolve(null);
        });

        // Payload for embedding
        req.write(JSON.stringify({
            content: { parts: [{ text: "Hello world" }] }
        }));

        req.end();
    });
};

const runTests = async () => {
    console.log("Testing embedding models...");
    for (const model of modelsToTest) {
        const working = await testModel(model);
        if (working) break;
    }
};

runTests();
