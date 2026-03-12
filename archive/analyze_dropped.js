const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\image_analysis.json', 'utf8'));

// Re-read both CSVs to inspect full row, not just images.
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
const origData = parseCSV(fs.readFileSync(fileOrig, 'utf-8'));
if (origData[0][0] && origData[0][0].charCodeAt(0) === 0xFEFF) origData[0][0] = origData[0][0].substring(1);
const headers = origData[0];
const handleIdx = headers.indexOf('handleId');
const imgIdx = headers.indexOf('productImageUrl');

let origMap = {};
for (let i = 1; i < origData.length; i++) {
    let row = origData[i];
    if (row.length <= handleIdx) continue;
    let handle = row[handleIdx];
    let img = row[imgIdx];
    if (img && img.trim() !== '') {
        origMap[handle] = { img: img, rowData: row };
    }
}

// We have data.droppedSamples
// We know a dropped product's handle.
// Let's count the number of images in the dropped vs kept
let droppedFromAll = 0;
let droppedImgCounts = {};
const droppedHandles = new Set();

const fileNew = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv';
const newData = parseCSV(fs.readFileSync(fileNew, 'utf-8'));
if (newData[0][0] && newData[0][0].charCodeAt(0) === 0xFEFF) newData[0][0] = newData[0][0].substring(1);
const newHandleIdx = newData[0].indexOf('handleId');
const newImgIdx = newData[0].indexOf('productImageUrl');

let newMap = {};
for (let i = 1; i < newData.length; i++) {
    let row = newData[i];
    if (row.length <= newHandleIdx) continue;
    let handle = row[newHandleIdx];
    let img = row[newImgIdx];
    if (img && img.trim() !== '') {
        newMap[handle] = img;
    }
}

let droppedProducts = [];
let keptProducts = [];

for (let handle in origMap) {
    let imgCount = origMap[handle].img.split(';').filter(x=>x).length;
    if (!newMap[handle]) {
        droppedProducts.push(handle);
        droppedImgCounts[imgCount] = (droppedImgCounts[imgCount] || 0) + 1;
    } else {
        keptProducts.push(handle);
    }
}

let keptImgCounts = {};
for (let handle of keptProducts) {
    let imgCount = origMap[handle].img.split(';').filter(x=>x).length;
    keptImgCounts[imgCount] = (keptImgCounts[imgCount] || 0) + 1;
}

console.log("Dropped Images length distribution:", droppedImgCounts);
console.log("Kept Images length distribution:", keptImgCounts);

// Were there any duplicate images within the same product?
let droppedWithDupes = 0;
for (let handle of droppedProducts) {
    let imgs = origMap[handle].img.split(';').filter(x=>x);
    let s = new Set(imgs);
    if (s.size !== imgs.length) {
        droppedWithDupes++;
    }
}

let keptWithDupes = 0;
for (let handle of keptProducts) {
    let imgs = origMap[handle].img.split(';').filter(x=>x);
    let s = new Set(imgs);
    if (s.size !== imgs.length) {
        keptWithDupes++;
    }
}

console.log(`Dropped with duplicate images within string: ${droppedWithDupes} out of ${droppedProducts.length}`);
console.log(`Kept with duplicate images within string: ${keptWithDupes} out of ${keptProducts.length}`);

// Is it EXACTLY 15 images that fail?
// In wix_fix.js: imgs.slice(0, 15).join(';')
// This leaves exactly 15 images.
