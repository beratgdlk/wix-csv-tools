const fs = require('fs');
const getDroppedHandles = () => {
    const orig = fs.readFileSync('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv', 'utf8');
    const newF = fs.readFileSync('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv', 'utf8');
    function p(t) {
        let lines=[], curLine=[], curCell='', inQ=false;
        for(let i=0; i<t.length; i++) {
            let c=t[i], n=t[i+1];
            if(inQ) {
                if(c==='"'){if(n==='"'){curCell+='"';i++;}else inQ=false;}
                else curCell+=c;
            } else {
                if(c==='"') inQ=true;
                else if(c===','){curLine.push(curCell);curCell='';}
                else if(c==='\n'||c==='\r'){curLine.push(curCell);lines.push(curLine);curLine=[];curCell='';if(c==='\r'&&n==='\n')i++;}
                else curCell+=c;
            }
        }
        if(curCell||curLine.length){curLine.push(curCell);lines.push(curLine);}
        if(lines[0][0]&&lines[0][0].charCodeAt(0)===0xFEFF) lines[0][0]=lines[0][0].substring(1);
        return lines;
    }
    let oData=p(orig), nData=p(newF);
    let oHi=oData[0].indexOf('handleId'), oIi=oData[0].indexOf('productImageUrl');
    let nHi=nData[0].indexOf('handleId'), nIi=nData[0].indexOf('productImageUrl');
    let oMap={}, nMap={};
    for(let i=1;i<oData.length;i++) if(oData[i] && oData[i][oHi] && oData[i][oIi]) oMap[oData[i][oHi]] = oData[i][oIi];
    for(let i=1;i<nData.length;i++) if(nData[i] && nData[i][nHi] && nData[i][nIi]) nMap[nData[i][nHi]] = nData[i][nIi];
    let dropped=new Set();
    for(let h in oMap) if(!nMap[h]) dropped.add(h);
    return dropped;
};

const droppedSet = getDroppedHandles();
console.log(`Analyzing ${droppedSet.size} dropped products against errors in catalog_products_bali.csv`);

const fileP = 'C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv';
const lines = fs.readFileSync(fileP, 'utf8').split(/\r?\n/);

let headers = lines[0].split(',');
if (headers[0] && headers[0].charCodeAt(0) === 0xFEFF) headers[0] = headers[0].substring(1);

const hIdx = headers.indexOf('handleId');
const tIdx = headers.indexOf('fieldType');
const skuIdx = headers.indexOf('sku');
const opt1Name = headers.indexOf('productOptionName1');
const opt1Desc = headers.indexOf('productOptionDescription1');

let skuToHandles = {};
let productErrors = {};
let allSkus = new Set();
let duplicates = new Set();

// Just a quick manual parse for SKUs
function parseRow(line) {
    let curLine=[], curCell='', inQ=false;
    for(let i=0; i<line.length; i++) {
        let c=line[i], n=line[i+1];
        if(inQ) {
            if(c==='"'){if(n==='"'){curCell+='"';i++;}else inQ=false;}
            else curCell+=c;
        } else {
            if(c==='"') inQ=true;
            else if(c===','){curLine.push(curCell);curCell='';}
            else curCell+=c;
        }
    }
    curLine.push(curCell);
    return curLine;
}

for(let i=1; i<lines.length; i++) {
    if(!lines[i].trim()) continue;
    let row = parseRow(lines[i]);
    let h = row[hIdx], t = row[tIdx], sku = row[skuIdx];
    
    if (h) {
        if (!productErrors[h]) productErrors[h] = [];
        if (sku) {
            if (allSkus.has(sku)) {
                duplicates.add(sku);
            } else {
                allSkus.add(sku);
            }
            if (!skuToHandles[sku]) skuToHandles[sku] = [];
            skuToHandles[sku].push(h);
        }
        
        // Option desc mismatch
        let o1N = row[opt1Name];
        let o1D = row[opt1Desc];
        if (t === 'Variant') {
            // Did variants have valid options?
        }
    }
}

let droppedWithDupeSku = 0;
let keptWithDupeSku = 0;

for (let sku of duplicates) {
    for (let h of skuToHandles[sku]) {
        if (droppedSet.has(h)) droppedWithDupeSku++;
        else keptWithDupeSku++;
    }
}

console.log(`Dropped products with Duplicate SKU: ${droppedWithDupeSku}`);
console.log(`Kept products with Duplicate SKU: ${keptWithDupeSku}`);

// What about Variant Choice mismatch? Let's check mismatches.json
if (fs.existsSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\mismatches.json')) {
    let mismatches = JSON.parse(fs.readFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\mismatches.json', 'utf8'));
    let mismatchHandles = new Set(mismatches.map(m => m.handle));
    
    let droppedWithMismatch = 0;
    for (let h of mismatchHandles) if (droppedSet.has(h)) droppedWithMismatch++;
    console.log(`Dropped products with Option Mismatches: ${droppedWithMismatch} / ${droppedSet.size}`);
} else {
    console.log("mismatches.json not found, assuming options was fixed");
}
