const fs = require('fs');
const { parseCSVFile } = require('../utils/csv');

module.exports = {
    name: "Analyze Images Count",
    description: "Counts products and variants with and without images in a single CSV file.",
    run: async (inquirer) => {
        const { filePath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'filePath',
                message: 'Enter the path of the CSV file to analyze:',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            }
        ]);

        console.log(`\nAnalyzing ${filePath}...`);
        const lines = parseCSVFile(filePath);
        if (lines.length < 2) {
            console.log("File is empty or only contains headers.");
            return;
        }

        const headers = lines[0].map(h => h.trim());
        const handleIdIdx = headers.indexOf('handleId');
        const fieldTypeIdx = headers.indexOf('fieldType');
        const imageIdx = headers.indexOf('productImageUrl');

        console.log(`Total rows (excluding header): ${lines.length - 1}`);

        if (imageIdx === -1) {
            console.log("No 'productImageUrl' column found in this CSV.");
            return;
        }

        let productsWithImages = 0;
        let productsWithoutImages = 0;
        let variantsWithImages = 0;
        let productsWithoutImagesSamples = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i];
            // Skip empty rows
            if (!cols || cols.length === 0 || (!cols[0] && cols.length === 1)) continue;

            const handleId = cols[handleIdIdx];
            const fieldType = cols[fieldTypeIdx];
            const image = cols[imageIdx];

            if (fieldType === 'Product') {
                if (image && image.trim() !== '') {
                    productsWithImages++;
                } else {
                    productsWithoutImages++;
                    if (productsWithoutImagesSamples.length < 5) {
                        productsWithoutImagesSamples.push(handleId);
                    }
                }
            } else if (fieldType === 'Variant') {
                if (image && image.trim() !== '') {
                    variantsWithImages++;
                }
            }
        }

        console.log(`\n=== Analysis Results ===`);
        console.log(`Products WITH images:    ${productsWithImages}`);
        console.log(`Products WITHOUT images: ${productsWithoutImages}`);
        console.log(`Variants WITH images:    ${variantsWithImages}`);
        
        if (productsWithoutImagesSamples.length > 0) {
            console.log(`\nSamples of products without images:`);
            productsWithoutImagesSamples.forEach(id => console.log(`- ${id}`));
        }
        console.log('========================\n');
    }
};
