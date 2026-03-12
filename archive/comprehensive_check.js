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
const nameIdx = headers.indexOf('name');
const skuIdx = headers.indexOf('sku');

let errors = [];
let skus = new Set();
let handles = new Set();
let variantCount = {};

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= typeIdx) continue;
    
    let t = row[typeIdx];
    let h = row[handleIdx];
    let sku = row[skuIdx];
    
    if (!h) {
        errors.push(`Row ${i+1}: Missing handleId`);
    }
    
    if (t !== 'Product' && t !== 'Variant') {
        errors.push(`Row ${i+1}: Invalid fieldType '${t}'`);
    }
    
    if (t === 'Product') {
        let name = row[nameIdx];
        if (!name) {
            errors.push(`Row ${i+1}: Product missing name`);
        }
        handles.add(h);
        variantCount[h] = 0;
    } else if (t === 'Variant') {
        if (!handles.has(h)) {
            errors.push(`Row ${i+1}: Variant appears before Product or Product is missing for handle '${h}'`);
        } else {
            variantCount[h]++;
        }
    }
    
    if (sku) {
        if (skus.has(sku)) {
            errors.push(`Row ${i+1}: Duplicate SKU '${sku}'`);
        } else {
            skus.add(sku);
        }
    }
    
    // Check product options consistency
    for (let j = 1; j <= 6; j++) {
        let oName = row[headers.indexOf(`productOptionName${j}`)];
        let oType = row[headers.indexOf(`productOptionType${j}`)];
        let oDesc = row[headers.indexOf(`productOptionDescription${j}`)];
        
        if (t === 'Product') {
            if (oName || oType || oDesc) {
                if (!oName || !oType || !oDesc) {
                    errors.push(`Row ${i+1}: Product option ${j} is incomplete (needs Name, Type, and Description); found Name='${oName}', Type='${oType}', Desc='${oDesc}'`);
                }
            }
        }
    }
}

for (let h in variantCount) {
    if (variantCount[h] > 300) {
        errors.push(`Product '${h}' has more than 300 variants (${variantCount[h]})`);
    }
}

console.log(`Found ${errors.length} structural errors.`);
if (errors.length > 0) {
    console.log(errors.slice(0, 20).join('\n'));
}
