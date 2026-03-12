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
            if (record.length > 1 || (record[0] && record[0].trim() !== '')) {
                records.push(record);
            }
            record = [];
            field = '';
        } else {
            field += char;
        }
    }
    if (field || record.length > 0) {
        record.push(field);
        if (record.length > 1 || (record[0] && record[0].trim() !== '')) {
            records.push(record);
        }
    }
    return records;
}

async function verify() {
    const raw = fs.readFileSync('c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_fixed.csv', 'utf8').replace(/^\uFEFF/, '');
    const data = parseCsvContent(raw);
    const headers = data[0];
    const pIdx = headers.indexOf('price');
    const tIdx = headers.indexOf('fieldType');

    let zeroPrices = 0;
    let productsProcessed = 0;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const type = row[tIdx] ? row[tIdx].trim() : '';
        if (type === 'Product' || type === 'Variant') {
            productsProcessed++;
            const p = row[pIdx] ? row[pIdx].trim() : '';
            if (!p || p === '0' || parseFloat(p) === 0) {
                zeroPrices++;
            }
        }
    }

    console.log(`--- UNIFIED VERIFICATION ---`);
    console.log(`Total Products/Variants Found: ${productsProcessed}`);
    console.log(`Zero/Missing Prices: ${zeroPrices}`);
}

verify().catch(console.error);
