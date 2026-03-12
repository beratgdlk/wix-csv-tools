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

// Map column names to indices
let cols = {};
headers.forEach((h, i) => cols[h] = i);

let errors = [];
let errorProducts = new Set();
let variantCounts = {};

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length <= cols['fieldType']) continue;
    
    let t = row[cols['fieldType']];
    let h = row[cols['handleId']];
    
    if (t === 'Product') {
        variantCounts[h] = 0;
        
        // 1. Check Handle Length (Max 80)
        // Wait, Wix handle limits: must be unique, max 80 characters.
        // The user's handles are "product_7baafce9-6d4a-4163-9072-d84b4aad91ce" -> 44 chars. OK.
        
        // 2. Check Name Limit (Max 80 characters)
        let name = row[cols['name']];
        if (name && name.length > 80) {
            errors.push(`Row ${i+1}: Name length > 80 ("${name.substring(0, 20)}...")`);
            errorProducts.add(h);
        }
        
        // 3. Price
        let price = row[cols['price']];
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
            errors.push(`Row ${i+1}: Invalid price ${price}`);
            errorProducts.add(h);
        }
        
        // 4. Description Length (Max 8000)
        let desc = row[cols['description']];
        if (desc && desc.length > 8000) {
            errors.push(`Row ${i+1}: Description > 8000 chars`);
            errorProducts.add(h);
        }
        
        // 5. Weight
        let weight = row[cols['weight']];
        if (weight && isNaN(parseFloat(weight))) {
            errors.push(`Row ${i+1}: Invalid weight`);
            errorProducts.add(h);
        }
        
        // 6. DiscountValue
        let dv = row[cols['discountValue']];
        let dm = row[cols['discountMode']];
        if (dv) {
            let v = parseFloat(dv);
            if (isNaN(v)) {
                errors.push(`Row ${i+1}: Invalid discountValue`);
                errorProducts.add(h);
            } else if (dm === 'PERCENT' && (v < 1 || v > 99)) {
                errors.push(`Row ${i+1}: Discount PERCENT must be 1-99 (${v})`);
                errorProducts.add(h);
            }
        }
        
        // 7. Options
        for (let j = 1; j <= 6; j++) {
            let oName = row[cols[`productOptionName${j}`]];
            let oType = row[cols[`productOptionType${j}`]];
            let oDesc = row[cols[`productOptionDescription${j}`]];
            
            if (oName || oType || oDesc) {
                if (!oName || !oType || !oDesc) {
                    errors.push(`Row ${i+1}: Incomplete option ${j}`);
                    errorProducts.add(h);
                }
                if (oType && oType !== 'DROP_DOWN' && oType !== 'COLOR') {
                    errors.push(`Row ${i+1}: Invalid option type '${oType}'`);
                    errorProducts.add(h);
                }
                if (oName && oName.length > 50) {
                    errors.push(`Row ${i+1}: Option name > 50 chars`);
                    errorProducts.add(h);
                }
            }
        }
        
        // 8. Ribbon Limit (Max 20 chars)
        let ribbon = row[cols['ribbon']];
        if (ribbon && ribbon.length > 20) {
            errors.push(`Row ${i+1}: Ribbon > 20 chars ("${ribbon}")`);
            errorProducts.add(h);
        }
        
        // 9. Custom Text Fields
        let customField1 = row[cols['customTextField1']];
        let customCharLimit1 = row[cols['customTextCharLimit1']];
        if (customField1 && (!customCharLimit1 || isNaN(parseInt(customCharLimit1)))) {
            errors.push(`Row ${i+1}: Custom text requires valid char limit`);
            errorProducts.add(h);
        }

    } else if (t === 'Variant') {
        variantCounts[h] = (variantCounts[h] || 0) + 1;
        
        // Weight
        let weight = row[cols['weight']];
        if (weight && isNaN(parseFloat(weight))) {
            errors.push(`Row ${i+1} (Variant): Invalid weight`);
            errorProducts.add(h);
        }
    }
}

console.log('Total specific errors:', errors.length);
console.log('Total products rejected:', errorProducts.size);
if (errors.length > 0) {
    console.log(errors.slice(0, 20).join('\n'));
}

fs.writeFileSync('errors_detailed.json', JSON.stringify(errors, null, 2));

