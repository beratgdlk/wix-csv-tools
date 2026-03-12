const fs = require('fs');
const { parseCSVFile } = require('../utils/csv');

module.exports = {
    name: "Comprehensive Validate Wix CSV",
    description: "Validates a Wix CSV for structure, column limits, missing data, and product/variant option consistency.",
    run: async (inquirer) => {
        const { filePath } = await inquirer.prompt([
            {
                type: 'input',
                name: 'filePath',
                message: 'Enter the path of the CSV file to validate:',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            }
        ]);

        console.log(`\nValidating ${filePath}...`);
        const data = parseCSVFile(filePath);
        if (data.length < 2) {
            console.log("File is empty or contains only headers.");
            return;
        }

        const headers = data[0].map(h => h.trim());
        let cols = {};
        headers.forEach((h, i) => cols[h] = i);

        let errors = [];
        let errorProducts = new Set();
        let skus = new Set();
        let handles = new Set();
        let variantCount = {};
        let products = {}; // Store product options for variant matching

        for (let i = 1; i < data.length; i++) {
            let row = data[i];
            // Skip totally empty rows
            if (!row || row.length === 0 || (!row[0] && row.length === 1)) continue;

            let t = row[cols['fieldType']];
            let h = row[cols['handleId']];
            let sku = row[cols['sku']];
            let name = row[cols['name']];

            if (!h) {
                errors.push(`Row ${i+1}: Missing handleId`);
                continue; // Can't validate much without a handle
            }

            if (t !== 'Product' && t !== 'Variant') {
                errors.push(`Row ${i+1} (${h}): Invalid fieldType '${t}'`);
                errorProducts.add(h);
            }

            // SKU validation
            if (sku) {
                if (skus.has(sku)) {
                    errors.push(`Row ${i+1} (${h}): Duplicate SKU '${sku}'`);
                    errorProducts.add(h);
                } else {
                    skus.add(sku);
                }
            }

            if (t === 'Product') {
                handles.add(h);
                variantCount[h] = 0;
                
                if (!name) {
                    errors.push(`Row ${i+1} (${h}): Product missing name`);
                    errorProducts.add(h);
                } else if (name.length > 80) {
                    errors.push(`Row ${i+1} (${h}): Name length > 80 chars`);
                    errorProducts.add(h);
                }

                let price = row[cols['price']];
                if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
                    errors.push(`Row ${i+1} (${h}): Invalid price '${price}'`);
                    errorProducts.add(h);
                }

                let desc = row[cols['description']];
                if (desc && desc.length > 8000) {
                    errors.push(`Row ${i+1} (${h}): Description length > 8000 chars`);
                    errorProducts.add(h);
                }

                let ribbon = row[cols['ribbon']];
                if (ribbon && ribbon.length > 20) {
                    errors.push(`Row ${i+1} (${h}): Ribbon length > 20 chars`);
                    errorProducts.add(h);
                }

                let dv = row[cols['discountValue']];
                let dm = row[cols['discountMode']];
                if (dv) {
                    let v = parseFloat(dv);
                    if (isNaN(v)) {
                        errors.push(`Row ${i+1} (${h}): Invalid discountValue`);
                        errorProducts.add(h);
                    } else if (dm === 'PERCENT' && (v < 1 || v > 99)) {
                        errors.push(`Row ${i+1} (${h}): Discount PERCENT must be 1-99 (${v})`);
                        errorProducts.add(h);
                    }
                }

                // Parse Options for this Product
                let opts = [];
                for (let j = 1; j <= 6; j++) {
                    let oName = row[cols[`productOptionName${j}`]];
                    let oType = row[cols[`productOptionType${j}`]];
                    let oDesc = row[cols[`productOptionDescription${j}`]];
                    
                    if (oName || oType || oDesc) {
                        if (!oName || !oType || !oDesc) {
                            errors.push(`Row ${i+1} (${h}): Incomplete option ${j}. Needs Name, Type, and Description.`);
                            errorProducts.add(h);
                        }
                        if (oType && oType !== 'DROP_DOWN' && oType !== 'COLOR') {
                            errors.push(`Row ${i+1} (${h}): Invalid option type '${oType}'`);
                            errorProducts.add(h);
                        }
                        if (oName && oName.length > 50) {
                            errors.push(`Row ${i+1} (${h}): Option name > 50 chars`);
                            errorProducts.add(h);
                        }
                        if (oName) {
                            opts.push({ 
                                name: oName, 
                                choices: oDesc ? oDesc.split(';').map(c => c.trim()) : [] 
                            });
                        }
                    } else {
                        opts.push(null);
                    }
                }
                products[h] = { options: opts };

            } else if (t === 'Variant') {
                if (!handles.has(h)) {
                    errors.push(`Row ${i+1} (${h}): Variant appears before Product or Product is missing`);
                    errorProducts.add(h);
                } else {
                    variantCount[h]++;
                    
                    // Validate variant choices against product options
                    let p = products[h];
                    if (p) {
                        for (let j = 1; j <= 6; j++) {
                            let val = row[cols[`productOptionDescription${j}`]];
                            if (val) {
                                val = val.trim();
                                let pOpt = p.options[j-1];
                                if (!pOpt) {
                                    errors.push(`Row ${i+1} (${h}): Variant defines option ${j} ('${val}') but Product doesn't have option ${j}.`);
                                    errorProducts.add(h);
                                } else {
                                    if (!pOpt.choices.includes(val)) {
                                        errors.push(`Row ${i+1} (${h}): Variant option '${val}' not found in Product choices [${pOpt.choices.join(', ')}] for '${pOpt.name}'.`);
                                        errorProducts.add(h);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Check variant limits
        for (let h in variantCount) {
            if (variantCount[h] > 300) {
                errors.push(`Product '${h}' exceeds Wix variant limit: has ${variantCount[h]} variants (max 300).`);
                errorProducts.add(h);
            }
        }

        console.log(`\n=== Validation Results ===`);
        console.log(`Total Errors Found:      ${errors.length}`);
        console.log(`Products with Errors:    ${errorProducts.size}`);

        if (errors.length > 0) {
            console.log(`\nSample Errors (top 15):`);
            errors.slice(0, 15).forEach(e => console.log(e));
            
            const { saveLog } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'saveLog',
                    message: 'Do you want to save all errors to a log file?',
                    default: true
                }
            ]);

            if (saveLog) {
                const logPath = filePath.replace('.csv', '_errors.log');
                fs.writeFileSync(logPath, errors.join('\n'), 'utf-8');
                console.log(`Errors saved to: ${logPath}`);
            }
        } else {
            console.log("\n✅ SUCCESS: No structural or product limits errors found. The file looks good for Wix!");
        }
    }
};
