const fs = require('fs');

const filePath = 'c:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';
const content = fs.readFileSync(filePath, 'utf-8');

function parseCSV(text) {
    const lines = [];
    let currentLine = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        let nextChar = text[i+1];
        
        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentCell += '"';
                    i++; // skip next
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentLine.push(currentCell);
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                currentLine.push(currentCell);
                lines.push(currentLine);
                currentLine = [];
                currentCell = '';
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell !== '' || currentLine.length > 0) {
        currentLine.push(currentCell);
        lines.push(currentLine);
    }
    return lines;
}

const data = parseCSV(content);
const headers = data[0];

const handleIdx = headers.indexOf('handleId');
const typeIdx = headers.indexOf('fieldType');
const optNameIdx = [
    headers.indexOf('productOptionName1'),
    headers.indexOf('productOptionName2'),
    headers.indexOf('productOptionName3'),
    headers.indexOf('productOptionName4'),
    headers.indexOf('productOptionName5'),
    headers.indexOf('productOptionName6'),
];
const optDescIdx = [
    headers.indexOf('productOptionDescription1'),
    headers.indexOf('productOptionDescription2'),
    headers.indexOf('productOptionDescription3'),
    headers.indexOf('productOptionDescription4'),
    headers.indexOf('productOptionDescription5'),
    headers.indexOf('productOptionDescription6'),
];

let products = {};
let variants = [];
let errors = [];

for (let i = 1; i < data.length; i++) {
    let row = data[i];
    if (!row || row.length < typeIdx) continue;
    
    let handle = row[handleIdx];
    let type = row[typeIdx];
    
    if (type === 'Product') {
        let opts = [];
        for (let j = 0; j < 6; j++) {
            let name = row[optNameIdx[j]];
            let desc = row[optDescIdx[j]];
            if (name) {
                opts.push({ name: name, choices: desc ? desc.split(';').map(c => c.trim()) : [] });
            }
        }
        products[handle] = { rowIdx: i, options: opts, rawChoices: row[optDescIdx[0]] };
    } else if (type === 'Variant') {
        let opts = [];
        for (let j = 0; j < 6; j++) {
            // Variant defines its option differently? Usually just descriptions matches.
            let desc = row[optDescIdx[j]];
            if (desc) {
                opts.push(desc.trim());
            }
        }
        variants.push({ rowIdx: i, handle: handle, options: opts, rowData: row });
    }
}

let toFix = [];

// Validate variants
for (let v of variants) {
    let handle = v.handle;
    let p = products[handle];
    if (!p) {
        errors.push(`Row ${v.rowIdx + 1}: Variant has handle '${handle}' but no corresponding Product found.`);
        continue;
    }
    
    for (let i = 0; i < v.options.length; i++) {
        let vOpt = v.options[i];
        if (!p.options[i]) {
            errors.push(`Row ${v.rowIdx + 1}: Variant defines option ${i+1} as '${vOpt}' but Product '${handle}' doesn't have option ${i+1}.`);
        } else {
            let choiceFound = p.options[i].choices.some(c => c === vOpt);
            if (!choiceFound) {
                errors.push(`Row ${v.rowIdx + 1}: Variant option '${vOpt}' not found in Product choices [${p.options[i].choices.join(', ')}] for '${p.options[i].name}'.`);
                
                // Keep track of mismatches to see if it's systematic
                toFix.push({
                    rowIdx: v.rowIdx,
                    handle: handle,
                    variantOpt: vOpt,
                    productChoices: p.options[i].choices
                });
            }
        }
    }
}

if (errors.length === 0) {
    console.log("SUCCESS: No structural or option matching errors found!");
} else {
    console.log("FOUND " + errors.length + " errors regarding options.");
    errors.slice(0, 20).forEach(e => console.log(e));
    if (toFix.length > 0) {
        console.log("\nSample of variants with choice mismatches:");
        console.log(toFix.slice(0, 5));
    }
}
