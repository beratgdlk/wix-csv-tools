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

let droppedCount = 0;
let droppedSamples = [];

for (let handle in origMap) {
    if (!newMap[handle]) {
        droppedCount++;
        if (droppedSamples.length < 5) {
            droppedSamples.push({ handle: handle, origImg: origMap[handle] });
        }
    }
}

console.log(`Found ${droppedCount} products that had an image in original but NO image in new CSV.`);
if (droppedSamples.length > 0) {
    console.log("Sample dropped images:");
    console.log(JSON.stringify(droppedSamples, null, 2));
}

let validCount = 0;
let validSamples = [];
for (let handle in origMap) {
    if (newMap[handle]) {
        validCount++;
        if (validSamples.length < 2) {
            validSamples.push({ handle: handle, origImg: origMap[handle], newImg: newMap[handle] });
        }
    }
}

console.log(`\nFound ${validCount} products with images intact.`);
if (validSamples.length > 0) {
    console.log("Sample intact images:");
    console.log(JSON.stringify(validSamples, null, 2));
}
