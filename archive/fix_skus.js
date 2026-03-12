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

// Strip BOM
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) {
    headers[0] = headers[0].substring(1);
}

const typeIdx = headers.indexOf('fieldType');
const skuIdx = headers.indexOf('sku');
const handleIdx = headers.indexOf('handleId');

let skus = new Set();
let fixCount = 0;

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    
    let sku = row[skuIdx];
    let h = row[handleIdx];
    
    if (sku) {
        if (skus.has(sku)) {
            // Fix duplicate SKU by appending a unique identifier (like the handle suffix or row index)
            // Handle might be "product_7baafce9-6d4a-4163-9072-d84b4aad91ce"
            let uniqueSuffix = h ? h.split('-').pop().substring(0, 6) : i;
            let newSku = `${sku}_${uniqueSuffix}_${i}`;
            row[skuIdx] = newSku;
            skus.add(newSku);
            fixCount++;
        } else {
            skus.add(sku);
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
console.log('Fixed ' + fixCount + ' duplicate SKUs and overwrote ' + filePath);
