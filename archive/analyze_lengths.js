const fs = require('fs');
const analysis = JSON.parse(fs.readFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\image_analysis.json', 'utf8'));

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
const headers = origData[0];
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) headers[0] = headers[0].substring(1);
const handleIdx = headers.indexOf('handleId');
const imgIdx = headers.indexOf('productImageUrl');

let origMap = {};
for (let i = 1; i < origData.length; i++) {
    let row = origData[i];
    if (row.length <= handleIdx) continue;
    let handle = row[handleIdx];
    let img = row[imgIdx];
    if (img && img.trim() !== '') {
        origMap[handle] = img;
    }
}

const fileNew = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv';
const newData = parseCSV(fs.readFileSync(fileNew, 'utf-8'));
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

let droppedLengths = [];
let keptLengths = [];
let droppedCount = 0;
let keptCount = 0;

for (let handle in origMap) {
    let len = origMap[handle].length;
    if (!newMap[handle]) {
        droppedLengths.push(len);
        droppedCount++;
    } else {
        keptLengths.push(len);
        keptCount++;
    }
}

droppedLengths.sort((a, b) => a - b);
keptLengths.sort((a, b) => a - b);

console.log(`Dropped Images (${droppedCount}) - String Lengths: Min: ${droppedLengths[0]}, Max: ${droppedLengths[droppedLengths.length - 1]}, Avg: ${Math.round(droppedLengths.reduce((a,b)=>a+b, 0)/droppedCount)}`);
console.log(`Kept Images (${keptCount}) - String Lengths: Min: ${keptLengths[0]}, Max: ${keptLengths[keptLengths.length - 1]}, Avg: ${Math.round(keptLengths.reduce((a,b)=>a+b, 0)/keptCount)}`);

// Also check the specific images - are they valid strings?
let allValid = true;
let stringFormatSample = '';
for (let handle in origMap) {
    if (!newMap[handle]) {
        let imgs = origMap[handle].split(';');
        for (let img of imgs) {
            // does it look like 1a67b6_...~mv2.jpg?
            if (!img.match(/^[a-zA-Z0-9_]+\~mv2\.(jpg|jpeg|png|gif|webp)$/i)) {
               // checking if there are weird spaces or quotes
               if (!stringFormatSample) stringFormatSample = img;
            }
        }
    }
}
if (stringFormatSample) {
    console.log("Found weird image format in dropped:", stringFormatSample);
} else {
    console.log("All dropped image URLs match the expected Wix internal format (alphanumeric_uuid~mv2.ext)");
}
