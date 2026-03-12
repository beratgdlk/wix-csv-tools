const fs = require('fs');

function checkCsvImages(filePath) {
    if(!fs.existsSync(filePath)) return null;
    let t = fs.readFileSync(filePath, 'utf8');
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
    if(lines[0] && lines[0][0]&&lines[0][0].charCodeAt(0)===0xFEFF) lines[0][0]=lines[0][0].substring(1);
    
    let hi = -1, ii = -1, ti = -1;
    if (lines[0]) {
        hi = lines[0].indexOf('handleId');
        ii = lines[0].indexOf('productImageUrl');
        ti = lines[0].indexOf('fieldType');
    }
    
    let imgCount = 0;
    let productCount = 0;
    let imageMap = {};
    for(let i=1;i<lines.length;i++) {
        if(lines[i] && lines[i][ti] === 'Product') {
            productCount++;
            if(lines[i][hi] && lines[i][ii]) {
                imgCount++;
                imageMap[lines[i][hi]] = lines[i][ii];
            }
        }
    }
    return { file: filePath.split('\\').pop(), productCount, imgCount, imageMap };
}

const stats = [
    checkCsvImages('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (5).csv'),
    checkCsvImages('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_bali.csv'),
    checkCsvImages('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products_merged.csv'),
    checkCsvImages('C:\\Users\\ROG Zephyrus\\Downloads\\catalog_products (4).csv')
];

let result = {};
for (const s of stats) {
    if (s) {
        console.log(`${s.file}: ${s.productCount} products, ${s.imgCount} products with images`);
    }
}
