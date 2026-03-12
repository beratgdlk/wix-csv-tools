const fs = require('fs');

const file1 = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv';
const file2 = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';

function analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length < 2) return;
    
    // Simple CSV parser for headers
    const headers = lines[0].split(',').map(h => h.trim());
    const handleIdIdx = headers.indexOf('handleId');
    const fieldTypeIdx = headers.indexOf('fieldType');
    const imageIdx = headers.indexOf('productImageUrl');
    
    console.log(`\nAnalyzing ${filePath}`);
    console.log(`Total lines: ${lines.length}`);
    console.log(`productImageUrl column index: ${imageIdx}`);
    
    if (imageIdx === -1) {
        console.log("No productImageUrl column found.");
        return;
    }

    let productsWithImages = 0;
    let productsWithoutImages = 0;
    let variantsWithImages = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        let cols = [];
        let cur = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuotes = !inQuotes;
            } else if (line[j] === ',' && !inQuotes) {
                cols.push(cur);
                cur = '';
            } else {
                cur += line[j];
            }
        }
        cols.push(cur);
        
        const handleId = cols[handleIdIdx];
        const fieldType = cols[fieldTypeIdx];
        const image = cols[imageIdx];
        
        if (fieldType === 'Product') {
            if (image && image.trim() !== '') {
                productsWithImages++;
            } else {
                productsWithoutImages++;
                if (productsWithoutImages <= 5) {
                    console.log(`Product without image: ${handleId}`);
                }
            }
        } else if (fieldType === 'Variant') {
            if (image && image.trim() !== '') {
                variantsWithImages++;
            }
        }
    }
    console.log(`Products with images: ${productsWithImages}`);
    console.log(`Products without images: ${productsWithoutImages}`);
    console.log(`Variants with images: ${variantsWithImages}`);
}

analyzeFile(file1);
analyzeFile(file2);
