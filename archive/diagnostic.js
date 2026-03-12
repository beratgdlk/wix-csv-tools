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

const data = parseCSV(content);
const headers = data[0];

// Strip BOM if present
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) {
    headers[0] = headers[0].substring(1);
}

const typeIdx = headers.indexOf('fieldType');
const handleIdx = headers.indexOf('handleId');

// Find all productOptionDescription headers
const optDescIndices = [];
for (let i = 1; i <= 6; i++) {
    const idx = headers.indexOf(`productOptionDescription${i}`);
    if (idx !== -1) optDescIndices.push(idx);
}

let products = {};
let variants = [];

// Collect products
for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    let t = row[typeIdx], h = row[handleIdx];
    if (t === 'Product') {
        products[h] = { row: i, options: [] };
        for (let idx of optDescIndices) {
            let val = row[idx];
            if (val) {
                products[h].options.push(val.split(';'));
            } else {
                products[h].options.push([]);
            }
        }
    } else if (t === 'Variant') {
        let opts = [];
        for (let idx of optDescIndices) {
            opts.push(row[idx] || "");
        }
        variants.push({ row: i, handle: h, options: opts });
    }
}

let fixCount = 0;

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    let t = row[typeIdx], h = row[handleIdx];
    
    if (t === 'Variant') {
        let p = products[h];
        if (!p) continue;
        
        for (let k = 0; k < optDescIndices.length; k++) {
            let idx = optDescIndices[k];
            let vVal = row[idx];
            if (!vVal) continue;
            
            let pOpts = p.options[k];
            if (!pOpts || pOpts.length===0) continue;
            
            let exactMatch = pOpts.includes(vVal);
            if (!exactMatch) {
                // Find a trimmed match
                let trimmedMatch = pOpts.find(po => po.trim() === vVal.trim());
                if (trimmedMatch) {
                    row[idx] = trimmedMatch;
                    fixCount++;
                } else {
                    // Find a loose match
                    let looseMatch = pOpts.find(po => po.trim().toLowerCase() === vVal.trim().toLowerCase());
                    if (looseMatch) {
                        row[idx] = looseMatch;
                        fixCount++;
                    }
                }
            }
        }
    }
}

function toCSV(rowArray) {
    return rowArray.map(cell => {
        if (cell === undefined || cell === null) cell = '';
        cell = cell.replace(/"/g, '""');
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
console.log('Fixed ' + fixCount + ' variant option mismatches and overwrote the original file ' + filePath);
