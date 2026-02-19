
const https = require('https');
const fs = require('fs');

const API_KEY = 'AIzaSyCUpHKkbG9iDrJcePDsKDs2g0t40aBdn80';

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models?key=${API_KEY}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', c => body += c);
    res.on('end', () => {
        fs.writeFileSync('models.json', body);
        console.log('Saved models to models.json');
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
