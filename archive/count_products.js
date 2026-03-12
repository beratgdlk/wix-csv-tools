const fs = require('fs');
const readline = require('readline');

async function countUniqueHandles() {
    const filePath = 'c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let handles = new Set();
    let isFirstLine = true;
    let handleIndex = -1;

    for await (let line of rl) {
        if (isFirstLine) {
            line = line.replace(/^\uFEFF/, '');
            const headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            handleIndex = headers.indexOf('handleId');
            isFirstLine = false;
            continue;
        }
        const parts = line.split(',');
        if (handleIndex !== -1 && parts[handleIndex]) {
            const handle = parts[handleIndex].trim().replace(/^"|"$/g, '');
            if (handle) {
                handles.add(handle);
            }
        }
    }

    console.log(`TOTAL_UNIQUE_PRODUCTS_BALI: ${handles.size}`);
}

countUniqueHandles().catch(console.error);
