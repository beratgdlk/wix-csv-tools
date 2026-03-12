const fs = require('fs');
const { parseCSVFile } = require('../utils/csv');

module.exports = {
    name: "Compare Dropped Products (Original vs New)",
    description: "Compares an originally uploaded CSV with a newly exported CSV to identify dropped products, image length limits, and SKU/Option errors.",
    run: async (inquirer) => {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'origPath',
                message: 'Enter the ORIGINAL (uploaded/large) CSV file path:',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            },
            {
                type: 'input',
                name: 'newPath',
                message: 'Enter the NEW (exported/filtered) CSV file path:',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            }
        ]);

        console.log(`\nParsing files...`);
        const origData = parseCSVFile(answers.origPath);
        const newData = parseCSVFile(answers.newPath);

        const oHi = origData[0].indexOf('handleId');
        const oIi = origData[0].indexOf('productImageUrl');
        const nHi = newData[0].indexOf('handleId');
        const nIi = newData[0].indexOf('productImageUrl');

        if (oHi === -1 || oIi === -1 || nHi === -1 || nIi === -1) {
            console.log("Error: Missing handleId or productImageUrl columns in one or both files.");
            return;
        }

        // Map original handles and their row/image count
        let origMap = {};
        for (let i = 1; i < origData.length; i++) {
            let row = origData[i];
            if (row.length <= oHi || !row[oHi]) continue;
            let imgStr = row[oIi] || '';
            origMap[row[oHi]] = {
                imageStr: imgStr,
                imgCount: imgStr ? imgStr.split(';').filter(x => x).length : 0,
                row: row
            };
        }

        // Map new handles that successfully have products
        let newSet = new Set();
        for (let i = 1; i < newData.length; i++) {
            let row = newData[i];
            if (row.length > nHi && row[nHi]) {
                newSet.add(row[nHi]);
            }
        }

        let dropped = [];
        let kept = [];

        for (let h in origMap) {
            if (!newSet.has(h)) {
                dropped.push(h);
            } else {
                kept.push(h);
            }
        }

        console.log(`\n=== Comparison Results ===`);
        console.log(`Total Original Products: ${Object.keys(origMap).length}`);
        console.log(`Kept in New CSV:         ${kept.length}`);
        console.log(`Dropped from New CSV:    ${dropped.length}`);

        if (dropped.length > 0) {
            // Further analysis on dropped
            let originallyOver15 = 0;
            let droppedAndOver15 = 0;
            let droppedLengths = [];
            
            for (let h in origMap) {
                let count = origMap[h].imgCount;
                if (count > 15) {
                    originallyOver15++;
                    if (!newSet.has(h)) droppedAndOver15++;
                }
                if (!newSet.has(h)) {
                    droppedLengths.push(origMap[h].imageStr.length);
                }
            }

            console.log(`\n--- Dropped Cause Analysis ---`);
            console.log(`Original products with >15 images: ${originallyOver15}`);
            console.log(`Dropped products with >15 images:  ${droppedAndOver15} (out of ${dropped.length} dropped)`);
            
            droppedLengths.sort((a, b) => a - b);
            let avgLen = Math.round(droppedLengths.reduce((a, b) => a + b, 0) / droppedLengths.length);
            console.log(`Dropped Image String Lengths:      Min: ${droppedLengths[0]}, Max: ${droppedLengths[droppedLengths.length - 1]}, Avg: ${avgLen}`);

            console.log(`\nSample Drops:`);
            dropped.slice(0, 5).forEach(d => console.log(`- ${d} (Images: ${origMap[d].imgCount})`));
        }

        console.log('==========================\n');
    }
};
