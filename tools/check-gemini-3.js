
const https = require('https');
require('dotenv').config();

// Using the NEW AI Studio key provided by user
const API_KEY = process.env.GEMINI_API_KEY;

const modelsToTest = [
    'gemini-3-flash-preview',
    'gemini-3.0-flash-preview',
    'gemini-3.0-flash-001',
    'gemini-3.0-flash',
    'gemini-3-flash'
];

const testModel = (modelName) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}?key=${API_KEY}`,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ FOUND: ${modelName}`);
                    console.log(JSON.parse(body));
                    resolve(true);
                } else {
                    console.log(`❌ ${modelName}: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Error with ${modelName}: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
};

const runTests = async () => {
    console.log("Testing specific Gemini 3 model names...");
    for (const model of modelsToTest) {
        await testModel(model);
    }
};

runTests();
