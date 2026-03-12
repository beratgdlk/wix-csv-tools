const fs = require('fs');
const fileOrig = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';

function parseCSV(text) {
    const lines = [];
    let curLine = [];
    let curCell = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        let c = text[i], n = text[i+1];
        if (inQ) {
            if (c === '"') {
                if (n === '"') { curCell += '"'; i++; }
                else inQ = false;
            } else curCell += c;
        } else {
            if (c === '"') inQ = true;
            else if (c === ',') { curLine.push(curCell); curCell = ''; }
            else if (c === '\n' || c === '\r') {
                curLine.push(curCell); lines.push(curLine); curLine=[]; curCell='';
                if (c==='\r' && n==='\n') i++;
            } else curCell += c;
        }
    }
    if(curCell || curLine.length) { curLine.push(curCell); lines.push(curLine); }
    return lines;
}

const data = parseCSV(fs.readFileSync(fileOrig, 'utf-8'));
const headers = data[0];
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) headers[0] = headers[0].substring(1);

const tIdx = headers.indexOf('fieldType');
const hIdx = headers.indexOf('handleId');
const imgIdx = headers.indexOf('productImageUrl');

// Also check variantImageUrl or similar? Is there one?
console.log("Image related columns:");
for (let h of headers) {
    if (h.toLowerCase().includes('img') || h.toLowerCase().includes('image') || h.toLowerCase().includes('media')) {
        console.log("- " + h);
    }
}

let productImages = {};
let missingVariantCount = 0;
let problemProducts = new Set();
// Wait, the column in Wix CSV for variant images is usually 'productImageUrl' but for the Variant row, OR 'variantImages'?
// Actually, in Wix CSV, fieldType=Variant uses the same `productImageUrl` column.

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (row.length <= hIdx) continue;
    let type = row[tIdx];
    let handle = row[hIdx];
    
    if (type === 'Product') {
        let imgs = row[imgIdx] ? row[imgIdx].split(';').filter(x=>x) : [];
        productImages[handle] = imgs;
    } else if (type === 'Variant') {
        let vImgs = row[imgIdx] ? row[imgIdx].split(';').filter(x=>x) : [];
        if (vImgs.length > 0 && productImages[handle]) {
            for (let vImg of vImgs) {
                if (!productImages[handle].includes(vImg)) {
                    problemProducts.add(handle);
                    missingVariantCount++;
                    break;
                }
            }
        }
    }
}

console.log(`\nVariants referencing an image NOT in the Product's image list: ${missingVariantCount}`);
console.log(`Number of unique products affected: ${problemProducts.size}`);

// Does this match dropped count?
const analysis = JSON.parse(fs.readFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\image_analysis.json', 'utf8'));
const droppedHandles = new Set();
analysis.droppedSamples.forEach(s => droppedHandles.add(s.handle));
if (analysis.droppedCount > analysis.droppedSamples.length) {
    console.log(`(Dropped set is incomplete in json, only showing correlation for the sample ${analysis.droppedSamples.length})`);
}

let correlation = 0;
for (let h of problemProducts) {
    if (droppedHandles.has(h)) correlation++;
}
console.log(`Correlation with the 10 dropped samples: ${correlation} / ${analysis.droppedSamples.length}`);
