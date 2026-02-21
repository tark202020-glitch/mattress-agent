const https = require('https');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/^GEMINI_API_KEY=(.*)$/m);
const key = match ? match[1].trim() : '';
const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' + key;

https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const models = parsed.models || [];
            const imageModels = models.filter(m => m.name.includes('imagen') || m.name.includes('image'));
            console.log("AVAILABLE IMAGE MODELS:");
            console.log(JSON.stringify(imageModels, null, 2));
        } catch (e) {
            console.error("Error parsing response:", e);
        }
    });
}).on('error', (err) => {
    console.error("HTTP GET Error:", err.message);
});
