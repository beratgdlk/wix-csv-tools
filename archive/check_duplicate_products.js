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
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) {
    headers[0] = headers[0].substring(1);
}

let typeIdx = headers.indexOf('fieldType');
let handleIdx = headers.indexOf('handleId');

let products = new Set();
let duplicateProducts = [];

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    
    let t = row[typeIdx];
    let h = row[handleIdx];
    
    if (t === 'Product') {
        if (products.has(h)) {
            duplicateProducts.push({row: i+1, handle: h});
        } else {
            products.add(h);
        }
    }
}

console.log(`Total unique products: ${products.size}`);
console.log(`Total Product rows: ${products.size + duplicateProducts.length}`);
console.log(`Total duplicate Product rows: ${duplicateProducts.length}`);

if (duplicateProducts.length > 0) {
    console.log('Sample duplicates:', duplicateProducts.slice(0, 10));
}
