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
let priceIdx = headers.indexOf('price');
let invIdx = headers.indexOf('inventory');
let visIdx = headers.indexOf('visible');
let disModeIdx = headers.indexOf('discountMode');
let disValIdx = headers.indexOf('discountValue');
let surIdx = headers.indexOf('surcharge');
let collectIdx = headers.indexOf('collection');

let errors = [];
let errorProducts = new Set();
let handlesWithVariants = new Set();
let variantDataByHandle = {};

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    
    let t = row[typeIdx];
    let h = row[handleIdx];
    
    if (t === 'Product') {
        let price = row[priceIdx];
        if (!price || isNaN(parseFloat(price))) {
            errors.push(`Row ${i+1}: Invalid or missing price "${price}" for handle ${h}`);
            errorProducts.add(h);
        }
        
        let inv = row[invIdx];
        if (inv && inv !== 'InStock' && inv !== 'OutOfStock' && isNaN(parseInt(inv))) {
            errors.push(`Row ${i+1}: Invalid inventory "${inv}"`);
            errorProducts.add(h);
        }
        
        let vis = row[visIdx];
        if (vis !== 'true' && vis !== 'false' && vis !== '') {
            errors.push(`Row ${i+1}: Invalid visible "${vis}"`);
            errorProducts.add(h);
        }
        
        let dm = row[disModeIdx];
        if (dm && dm !== 'PERCENT' && dm !== 'AMOUNT') {
            errors.push(`Row ${i+1}: Invalid discountMode "${dm}"`);
            errorProducts.add(h);
        }

        let dv = row[disValIdx];
        if (dv && isNaN(parseFloat(dv))) {
            errors.push(`Row ${i+1}: Invalid discountValue "${dv}"`);
            errorProducts.add(h);
        }
    } else if (t === 'Variant') {
        handlesWithVariants.add(h);
        if (!variantDataByHandle[h]) variantDataByHandle[h] = [];
        variantDataByHandle[h].push({row: i+1});
        
        let sur = row[surIdx];
        if (sur && isNaN(parseFloat(sur))) {
            errors.push(`Row ${i+1}: Invalid surcharge "${sur}" for variant of handle ${h}`);
            errorProducts.add(h);
        }
    }
}

// Another Wix rule: A user cannot create more than 300 variants per product.
for (let h in variantDataByHandle) {
    if (variantDataByHandle[h].length > 300) {
        errors.push(`Product ${h} has > 300 variants`);
        errorProducts.add(h);
    }
}

console.log('Total specific errors:', errors.length);
console.log('Total products affected:', errorProducts.size);
if (errors.length > 0) {
    console.log(errors.slice(0, 15).join('\n'));
}

