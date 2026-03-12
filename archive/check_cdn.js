const https = require('https');
const fs = require('fs');

const analysis = JSON.parse(fs.readFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\image_analysis.json', 'utf8'));
const sampleImgList = analysis.droppedSamples[0].origImg.split(';');

let success = 0;
let fail = 0;

function checkUrl(urlStr) {
    return new Promise((resolve) => {
        https.request(urlStr, { method: 'HEAD' }, (res) => {
            resolve(res.statusCode);
        }).on('error', (err) => {
            resolve(500);
        }).end();
    });
}

async function run() {
    for (let i = 0; i < Math.min(5, sampleImgList.length); i++) {
        let img = sampleImgList[i];
        if (!img) continue;
        
        let url = `https://static.wixstatic.com/media/${img}`;
        let status = await checkUrl(url);
        console.log(`Checking ${url} -> ${status}`);
        if (status === 200 || status === 301 || status === 302) success++;
        else fail++;
    }
    
    console.log(`\nChecked 5 dropped images on static CDN: ${success} OK, ${fail} Failed.`);
    if (success > 0) {
        console.log('Conclusion: The images STILL EXIST on Wix CDN! We can fix the CSV by converting internal paths to full URLs.');
    }
}

run();
