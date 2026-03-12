const fs = require('fs');

const analysis = JSON.parse(fs.readFileSync('C:\\Users\\ROG Zephyrus\\.gemini\\antigravity\\scratch\\image_analysis.json', 'utf8'));
const droppedHandles = new Set(analysis.droppedSamples.map(d => d.handle)); // only has 10 samples though!

// Let's get the full dropped list by comparing again properly.
function getDroppedHandles() {
    const orig = fs.readFileSync('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv', 'utf8');
    const newF = fs.readFileSync('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv', 'utf8');
    
    function p(t) {
        let lines=[], curLine=[], curCell='', inQ=false;
        for(let i=0; i<t.length; i++) {
            let c=t[i], n=t[i+1];
            if(inQ) {
                if(c==='"') { if(n==='"'){curCell+='"';i++;} else inQ=false; }
                else curCell+=c;
            } else {
                if(c==='"') inQ=true;
                else if(c===',') { curLine.push(curCell);curCell=''; }
                else if(c==='\n'||c==='\r') { curLine.push(curCell);lines.push(curLine);curLine=[];curCell=''; if(c==='\r'&&n==='\n')i++; }
                else curCell+=c;
            }
        }
        if(curCell||curLine.length) { curLine.push(curCell);lines.push(curLine); }
        if(lines[0][0]&&lines[0][0].charCodeAt(0)===0xFEFF) lines[0][0]=lines[0][0].substring(1);
        return lines;
    }
    
    let oData = p(orig);
    let nData = p(newF);
    
    let oHi = oData[0].indexOf('handleId');
    let oIi = oData[0].indexOf('productImageUrl');
    let nHi = nData[0].indexOf('handleId');
    let nIi = nData[0].indexOf('productImageUrl');
    
    let oMap = {}, nMap = {};
    for(let i=1; i<oData.length; i++) if(oData[i][oHi] && oData[i][oIi]) oMap[oData[i][oHi]] = oData[i][oIi];
    for(let i=1; i<nData.length; i++) if(nData[i][nHi] && nData[i][nIi]) nMap[nData[i][nHi]] = nData[i][nIi];
    
    let dropped = new Set();
    for(let h in oMap) if(!nMap[h]) dropped.add(h);
    return dropped;
}

const droppedSet = getDroppedHandles();
console.log(`Successfully identified ${droppedSet.size} dropped products.`);

// Now read the originally unmodified file `catalog_products_merged.csv`
const mergedF = fs.readFileSync('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_merged.csv', 'utf8');
// wait, we need to parse it
let lines=[], curLine=[], curCell='', inQ=false;
for(let i=0; i<mergedF.length; i++) {
    let c=mergedF[i], n=mergedF[i+1];
    if(inQ) {
        if(c==='"') { if(n==='"'){curCell+='"';i++;} else inQ=false; }
        else curCell+=c;
    } else {
        if(c==='"') inQ=true;
        else if(c===',') { curLine.push(curCell);curCell=''; }
        else if(c==='\n'||c==='\r') { curLine.push(curCell);lines.push(curLine);curLine=[];curCell=''; if(c==='\r'&&n==='\n')i++; }
        else curCell+=c;
    }
}
if(curCell||curLine.length) { curLine.push(curCell);lines.push(curLine); }
if(lines[0][0]&&lines[0][0].charCodeAt(0)===0xFEFF) lines[0][0]=lines[0][0].substring(1);

const mHi = lines[0].indexOf('handleId');
const mTi = lines[0].indexOf('fieldType');
const mIi = lines[0].indexOf('productImageUrl');

let originallyOver15 = 0;
let droppedAndOriginallyOver15 = 0;
let keptAndOriginallyOver15 = 0;

for(let i=1; i<lines.length; i++) {
    let row = lines[i];
    if(row.length <= mHi) continue;
    let type = row[mTi];
    let handle = row[mHi];
    let img = row[mIi];
    
    if (type === 'Product' && img) {
        let imgs = img.split(';').filter(x=>x);
        if (imgs.length > 15) {
            originallyOver15++;
            if (droppedSet.has(handle)) {
                droppedAndOriginallyOver15++;
            } else {
                // Was it kept? (does it exist in the new CSV and has image?)
                keptAndOriginallyOver15++; // This might just mean the product isn't dropped, but maybe it was deleted altogether? but let's assume it was kept
            }
        }
    }
}

console.log(`Products originally > 15 images: ${originallyOver15}`);
console.log(`Dropped products that originally had > 15 images: ${droppedAndOriginallyOver15} / ${droppedSet.size}`);
console.log(`Kept products that originally had > 15 images: ${keptAndOriginallyOver15}`);

// What about the remaining dropped products?
let droppedButNotOver15 = droppedSet.size - droppedAndOriginallyOver15;
console.log(`Dropped products that originally had <= 15 images: ${droppedButNotOver15}`);

