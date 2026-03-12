const fs = require('fs');

const filePath = 'c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';
const content = fs.readFileSync(filePath, 'utf-8');

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

let data = parseCSV(content);
const headers = data[0];
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) {
    headers[0] = headers[0].substring(1);
}

// Fix elements we suspect might cause issues:
// 1. Discount = 0.0 -> remove mode and value
// 2. Images > 15 -> truncate to 15
// 3. Name > 80 -> truncate
// 4. Description > 8000 -> truncate
// 5. Duplicate productOptionNames

let typeIdx = headers.indexOf('fieldType');
let disModeIdx = headers.indexOf('discountMode');
let disValIdx = headers.indexOf('discountValue');
let imgIdx = headers.indexOf('productImageUrl');
let nameIdx = headers.indexOf('name');
let descIdx = headers.indexOf('description');

let highImageCount = 0;
let emptyPriceCount = 0;
let emptyNameCount = 0;
let longNameCount = 0;
let longDescCount = 0;
let manyVariantCount = 0;
let missingImageCount = 0;
let optionsInvalidCount = 0;

let fixCount = 0;

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    let t = row[typeIdx];
    
    if (t === 'Product') {
        // Fix discount
        if (row[disValIdx] === '0.0' || row[disValIdx] === '0') {
            row[disValIdx] = '';
            row[disModeIdx] = '';
            fixCount++;
        }
        
        // Image count
        if (row[imgIdx]) {
            let imgs = row[imgIdx].split(';');
            if (imgs.length > 15) {
                highImageCount++;
                row[imgIdx] = imgs.slice(0, 15).join(';');
                fixCount++;
            }
        } else {
            missingImageCount++;
        }
        
        if (row[nameIdx] && row[nameIdx].length > 80) {
            longNameCount++;
            row[nameIdx] = row[nameIdx].substring(0, 80);
            fixCount++;
        }
        
        if (row[descIdx] && row[descIdx].length > 8000) {
            longDescCount++;
            row[descIdx] = row[descIdx].substring(0, 8000);
            fixCount++;
        }
        
        // Verify unique option names
        let optNames = new Set();
        for (let j = 1; j <= 6; j++) {
            let optNameCol = headers.indexOf('productOptionName' + j);
            let oName = row[optNameCol];
            if (oName) {
                let nameLower = oName.trim().toLowerCase();
                if (optNames.has(nameLower)) {
                    optionsInvalidCount++;
                    // Found a duplicate option name in the same product!
                    row[optNameCol] = oName.trim() + " " + j; // make it unique
                    fixCount++;
                }
                optNames.add(nameLower);
            }
        }
    }
}

console.log("Stats on products:");
console.log("- >15 images:", highImageCount);
console.log("- Long names:", longNameCount);
console.log("- Long desc:", longDescCount);
console.log("- Options invalid/dupe:", optionsInvalidCount);
console.log("- Missing images:", missingImageCount);

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

let outputCSV = '';
for (let line of data) {
    outputCSV += toCSV(line) + '\r\n';
}

fs.writeFileSync(filePath, outputCSV, 'utf-8');
console.log('Applied fixes. Total rows mutated (including discounts):', fixCount);
