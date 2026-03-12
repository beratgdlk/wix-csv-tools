const fs = require('fs');

function parseCsvContent(content) {
    const records = [];
    let field = '';
    let record = [];
    let inQuotes = false;
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                field += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            record.push(field);
            field = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            record.push(field);
            records.push(record);
            record = [];
            field = '';
        } else {
            field += char;
        }
    }
    if (field || record.length > 0) {
        record.push(field);
        records.push(record);
    }
    return records;
}

const raw = fs.readFileSync('c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_fixed.csv', 'utf8').replace(/^\uFEFF/, '');
const data = parseCsvContent(raw);
const headers = data[0];
const pIdx = headers.indexOf('price');
const tIdx = headers.indexOf('fieldType');

console.log("Lines with 0/Missing Price:");
let count = 0;
for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const type = row[tIdx] ? row[tIdx].trim() : '';
    if (type === 'Product' || type === 'Variant') {
        const p = row[pIdx] ? row[pIdx].trim() : '';
        if (!p || p === '0' || parseFloat(p) === 0) {
            console.log(`Row ${i}: [${row[tIdx]}] Price="${row[pIdx]}" Name="${row[headers.indexOf('name')]}"`);
            count++;
            if (count > 10) break;
        }
    }
}
