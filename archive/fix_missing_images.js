const fs = require('fs');

const origPath = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';
const newPath = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv';
const outPath = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_fixed_images.csv';

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
    if(lines[0] && lines[0][0] && lines[0][0].charCodeAt(0) === 0xFEFF) lines[0][0] = lines[0][0].substring(1);
    return lines;
}

function toCSV(rowArray) {
    return rowArray.map(cell => {
        if (cell === undefined || cell === null) cell = '';
        cell = String(cell).replace(/"/g, '""');
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
            return `"${cell}"`;
        }
        return cell;
    }).join(',');
}

let oData = parseCSV(fs.readFileSync(origPath, 'utf8'));
let nData = parseCSV(fs.readFileSync(newPath, 'utf8'));

let oHeaders = oData[0];
let nHeaders = nData[0];

let oHi = oHeaders.indexOf('handleId');
let oTi = oHeaders.indexOf('fieldType');
let oIi = oHeaders.indexOf('productImageUrl');

let nHi = nHeaders.indexOf('handleId');
let nTi = nHeaders.indexOf('fieldType');
let nIi = nHeaders.indexOf('productImageUrl');

function getRowKey(row, headers) {
    let handle = row[headers.indexOf('handleId')] || '';
    let type = row[headers.indexOf('fieldType')] || '';
    let opts = [];
    for (let i = 1; i <= 6; i++) {
        opts.push(row[headers.indexOf('productOptionDescription' + i)] || '');
    }
    return `${handle}||${type}||${opts.join('||')}`;
}

let oMap = {};
for (let i = 1; i < oData.length; i++) {
    let row = oData[i];
    if (row.length <= oHi) continue;
    let key = getRowKey(row, oHeaders);
    if (row[oIi] && row[oIi].trim() !== '') {
        oMap[key] = row[oIi];
    }
}

let modifiedCount = 0;
let variantModifiedCount = 0;

for (let i = 1; i < nData.length; i++) {
    let row = nData[i];
    if (row.length <= nHi) continue;
    
    let key = getRowKey(row, nHeaders);
    let type = row[nTi];
    let existingImg = row[nIi];
    
    // If the image is missing in the new file, but was present in the original
    if ((!existingImg || existingImg.trim() === '') && oMap[key]) {
        let oldImgStr = oMap[key];
        // The old image string is like "1a67b6_xyz~mv2.jpg;..."
        // Convert to full static.wixstatic.com URL!
        let imgs = oldImgStr.split(';').filter(x => x.trim() !== '');
        
        let newImgStr = imgs.map(img => {
            if (img.startsWith('http://') || img.startsWith('https://')) return img;
            return `https://static.wixstatic.com/media/${img}`;
        }).join(';');
        
        row[nIi] = newImgStr;
        
        if (type === 'Product') modifiedCount++;
        else if (type === 'Variant') variantModifiedCount++;
    }
}

let outCSV = '';
for (let i = 0; i < nData.length; i++) {
    outCSV += toCSV(nData[i]) + '\r\n';
}

fs.writeFileSync(outPath, '\uFEFF' + outCSV, 'utf8');
console.log(`Saved fixed CSV to: ${outPath}`);
console.log(`Injected full image URLs into ${modifiedCount} Products and ${variantModifiedCount} Variants!`);
