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

let mismatches = [];

for (let v of variants) {
    let p = products[v.handle];
    if (!p) {
        mismatches.push(`Row ${v.row + 1}: Missing Product for handle ${v.handle}`);
        continue;
    }
    
    for (let k = 0; k < optDescIndices.length; k++) {
        let vVal = v.options[k];
        if (!vVal) continue;
        
        let pOpts = p.options[k];
        if (!pOpts || pOpts.length===0) {
            mismatches.push(`Row ${v.row + 1}: Variant has value '${vVal}' for option ${k+1} but Product has no choices for this option.`);
            continue;
        }
        
        if (!pOpts.includes(vVal)) {
            mismatches.push(`Row ${v.row + 1}: Variant choice '${vVal}' not found in Product choices [${pOpts.join(', ')}]`);
        }
    }
}

console.log(`Total structurally broken variants: ${mismatches.length}`);
if (mismatches.length > 0) {
    console.log(mismatches.slice(0, 10).join('\n'));
}
