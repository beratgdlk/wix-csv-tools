const fs = require('fs');
const readline = require('readline');

async function analyzeCsv(filePath, label) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let productRows = 0;
    let variantRows = 0;
    const uniqueProducts = new Set();
    let handleIdx = -1;
    let typeIdx = -1;
    let first = true;

    for await (let line of rl) {
        if (first) {
            line = line.replace(/^\uFEFF/, '');
            const h = line.split(',');
            handleIdx = h.indexOf('handleId');
            typeIdx = h.indexOf('fieldType');
            first = false;
            continue;
        }
        const p = line.split(',');
        const type = p[typeIdx] ? p[typeIdx].trim().replace(/^"|"$/g, '') : '';
        const handle = p[handleIdx] ? p[handleIdx].trim().replace(/^"|"$/g, '') : '';

        if (type === 'Product') {
            productRows++;
            if (handle) uniqueProducts.add(handle);
        } else if (type === 'Variant') {
            variantRows++;
        }
    }
    console.log(`--- ${label} ---`);
    console.log(`Total Products (Major Rows): ${productRows}`);
    console.log(`Total Variants (Sub Rows): ${variantRows}`);
    console.log(`Total Unique Handles: ${uniqueProducts.size}`);
    console.log(`Total Lines Analyzed: ${productRows + variantRows + 1}`);
}

async function run() {
    await analyzeCsv('c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv', 'BALI FILE');
    await analyzeCsv('c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products.csv', 'SOURCE FILE');
}

run().catch(console.error);
