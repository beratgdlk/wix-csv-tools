const fs = require('fs');
const { parseCSVFile, writeCSVFile } = require('../utils/csv');

module.exports = {
    name: "Inject Missing Images (Full URL)",
    description: "Takes an original CSV containing all images and injects missing images into a newer exported CSV by using full static.wixstatic.com URLs.",
    run: async (inquirer) => {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'origPath',
                message: 'Enter path of ORIGINAL CSV (contains images):',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            },
            {
                type: 'input',
                name: 'newPath',
                message: 'Enter path of NEW CSV (missing images):',
                validate: input => fs.existsSync(input) ? true : 'File does not exist.'
            },
            {
                type: 'input',
                name: 'outPath',
                message: 'Enter output file path for the merged CSV:',
                default: answers => answers.newPath.replace('.csv', '_images_injected.csv')
            }
        ]);

        console.log(`\nParsing source files...`);
        const oData = parseCSVFile(answers.origPath);
        const nData = parseCSVFile(answers.newPath);

        const oHeaders = oData[0].map(h => h.trim());
        const nHeaders = nData[0].map(h => h.trim());

        const oHi = oHeaders.indexOf('handleId');
        const oIi = oHeaders.indexOf('productImageUrl');

        const nHi = nHeaders.indexOf('handleId');
        const nTi = nHeaders.indexOf('fieldType');
        const nIi = nHeaders.indexOf('productImageUrl');

        if (oHi === -1 || oIi === -1 || nHi === -1 || nIi === -1) {
            console.log("Error: Missing handleId or productImageUrl columns.");
            return;
        }

        // Helper to uniquely identify a row (Product or Variant) to ensure exact matching
        function getRowKey(row, headers) {
            let handle = row[headers.indexOf('handleId')] || '';
            let type = row[headers.indexOf('fieldType')] || '';
            let opts = [];
            for (let i = 1; i <= 6; i++) {
                opts.push(row[headers.indexOf('productOptionDescription' + i)] || '');
            }
            return `${handle}||${type}||${opts.join('||')}`;
        }

        console.log(`Mapping original images...`);
        let oMap = {};
        for (let i = 1; i < oData.length; i++) {
            let row = oData[i];
            if (row.length <= oHi) continue;
            let key = getRowKey(row, oHeaders);
            if (row[oIi] && row[oIi].trim() !== '') {
                oMap[key] = row[oIi];
            }
        }

        let productInjected = 0;
        let variantInjected = 0;

        for (let i = 1; i < nData.length; i++) {
            let row = nData[i];
            if (row.length <= nHi) continue;
            
            let key = getRowKey(row, nHeaders);
            let type = row[nTi];
            let existingImg = row[nIi];
            
            // If the image is empty in the new file, but was present in the original
            if ((!existingImg || existingImg.trim() === '') && oMap[key]) {
                let oldImgStr = oMap[key];
                // Convert internal URLs to full CDN URLs
                let imgs = oldImgStr.split(';').filter(x => x.trim() !== '');
                let newImgStr = imgs.map(img => {
                    if (img.startsWith('http://') || img.startsWith('https://')) return img;
                    return `https://static.wixstatic.com/media/${img}`;
                }).join(';');
                
                row[nIi] = newImgStr;
                
                if (type === 'Product') productInjected++;
                else if (type === 'Variant') variantInjected++;
            }
        }

        writeCSVFile(answers.outPath, nData);
        
        console.log(`\n=== Injection Complete ===`);
        console.log(`Output saved to: ${answers.outPath}`);
        console.log(`Injected full image URLs into ${productInjected} Products and ${variantInjected} Variants.`);
        console.log('==========================\n');
    }
};
