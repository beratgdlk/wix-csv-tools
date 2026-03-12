const fs = require('fs');
const { parseCSVFile, writeCSVFile } = require('../utils/csv');

module.exports = {
    name: "General Limits & Rules Fixer",
    description: "Fixes common Wix errors: truncates >15 images, truncates long names/descriptions, removes zero discounts, repairs duplicate SKUs / Option names.",
    run: async (inquirer) => {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'inputPath',
                message: 'Enter the path of the CSV file to fix:',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            },
            {
                type: 'input',
                name: 'outputPath',
                message: 'Enter the output path for the fixed CSV:',
                default: answers => answers.inputPath.replace('.csv', '_fixed.csv')
            }
        ]);

        console.log(`\nProcessing ${answers.inputPath}...`);
        const data = parseCSVFile(answers.inputPath);
        if (data.length < 2) {
            console.log("File is empty or contains only headers.");
            return;
        }

        const headers = data[0];
        let cols = {};
        headers.forEach((h, i) => cols[h.trim()] = i);

        let fixCount = 0;
        let stats = {
            discounts: 0,
            imageLimits: 0,
            longNames: 0,
            longDesc: 0,
            duplicateOptionNames: 0,
            duplicateSkus: 0
        };

        let skus = new Set();

        for (let i = 1; i < data.length; i++) {
            let row = data[i];
            if (!row || row.length <= cols['fieldType']) continue;
            
            let t = row[cols['fieldType']];
            let h = row[cols['handleId']];
            
            // SKU Duplicate check (applies to both Products and Variants)
            let skuIdx = cols['sku'];
            let sku = row[skuIdx];
            if (sku) {
                if (skus.has(sku)) {
                    let uniqueSuffix = h ? h.split('-').pop().substring(0, 6) : i;
                    row[skuIdx] = `${sku}_${uniqueSuffix}_${i}`;
                    skus.add(row[skuIdx]);
                    stats.duplicateSkus++;
                    fixCount++;
                } else {
                    skus.add(sku);
                }
            }

            if (t === 'Product') {
                // Fix discount
                let disValIdx = cols['discountValue'];
                if (row[disValIdx] === '0.0' || row[disValIdx] === '0') {
                    row[disValIdx] = '';
                    row[cols['discountMode']] = '';
                    stats.discounts++;
                    fixCount++;
                }
                
                // Image count > 15
                let imgIdx = cols['productImageUrl'];
                if (row[imgIdx]) {
                    let imgs = row[imgIdx].split(';');
                    if (imgs.length > 15) {
                        row[imgIdx] = imgs.slice(0, 15).join(';');
                        stats.imageLimits++;
                        fixCount++;
                    }
                }
                
                // Truncate Name > 80
                let nameIdx = cols['name'];
                if (row[nameIdx] && row[nameIdx].length > 80) {
                    row[nameIdx] = row[nameIdx].substring(0, 80);
                    stats.longNames++;
                    fixCount++;
                }
                
                // Truncate Description > 8000
                let descIdx = cols['description'];
                if (row[descIdx] && row[descIdx].length > 8000) {
                    row[descIdx] = row[descIdx].substring(0, 8000);
                    stats.longDesc++;
                    fixCount++;
                }
                
                // Verify unique option names within the product
                let optNames = new Set();
                for (let j = 1; j <= 6; j++) {
                    let optNameCol = cols[`productOptionName${j}`];
                    let oName = row[optNameCol];
                    if (oName) {
                        let nameLower = oName.trim().toLowerCase();
                        if (optNames.has(nameLower)) {
                            row[optNameCol] = oName.trim() + " " + j;
                            stats.duplicateOptionNames++;
                            fixCount++;
                        }
                        optNames.add(nameLower);
                    }
                }
            }
        }

        writeCSVFile(answers.outputPath, data);
        console.log(`\n=== Fixing Complete ===`);
        console.log(`Saved output to: ${answers.outputPath}`);
        console.log(`Total rows mutated: ${fixCount}`);
        console.log(`Breakdown:`);
        console.log(`- Zero Discounts Removed:    ${stats.discounts}`);
        console.log(`- Image Lists Truncated:     ${stats.imageLimits}`);
        console.log(`- Long Names Truncated:      ${stats.longNames}`);
        console.log(`- Long Descriptions Cut:     ${stats.longDesc}`);
        console.log(`- Duplicate Option Names:    ${stats.duplicateOptionNames}`);
        console.log(`- Duplicate SKUs Renamed:    ${stats.duplicateSkus}`);
        console.log('=======================\n');
    }
};
