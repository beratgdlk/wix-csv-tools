const fs = require('fs');

const fileOrig = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';
const fileNew = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv';

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
const newData = parseCSV(fs.readFileSync(fileNew, 'utf-8'));

if (origData[0][0] && origData[0][0].charCodeAt(0) === 0xFEFF) origData[0][0] = origData[0][0].substring(1);
if (newData[0][0] && newData[0][0].charCodeAt(0) === 0xFEFF) newData[0][0] = newData[0][0].substring(1);

const origHandleIdx = origData[0].indexOf('handleId');
const origImgIdx = origData[0].indexOf('productImageUrl');
const newHandleIdx = newData[0].indexOf('handleId');
const newImgIdx = newData[0].indexOf('productImageUrl');

let origMap = {};
for (let i = 1; i < origData.length; i++) {
    let row = origData[i];
    if (row.length <= origHandleIdx) continue;
    let handle = row[origHandleIdx];
    let img = row[origImgIdx];
    if (img && img.trim() !== '') {
        origMap[handle] = img;
    }
}

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

let dropped = [];
for (let handle in origMap) {
    if (!newMap[handle]) {
        dropped.push({
            handle: handle,
            origImg: origMap[handle]
        });
    }
}

let kept = [];
for (let handle in origMap) {
    if (newMap[handle]) {
        kept.push({
            handle: handle,
            origImg: origMap[handle],
            newImg: newMap[handle]
        });
    }
}

let result = {
    totalOrigImages: Object.keys(origMap).length,
    totalNewImages: Object.keys(newMap).length,
    droppedCount: dropped.length,
    keptCount: kept.length,
    droppedSamples: dropped.slice(0, 10),
    keptSamples: kept.slice(0, 3)
};

fs.writeFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\image_analysis.json', JSON.stringify(result, null, 2));
console.log("Wrote image_analysis.json");
