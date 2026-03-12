const fs = require('fs');

function parseCSV(text) {
    const lines = [];
    let curLine = [];
    let curCell = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        let c = text[i], n = text[i+1];
        if (inQ) {
            if (c === '"') {
                if (n === '"') { curCell += '"'; i++; }
                else inQ = false;
            } else curCell += c;
        } else {
            if (c === '"') inQ = true;
            else if (c === ',') { curLine.push(curCell); curCell = ''; }
            else if (c === '\n' || c === '\r') {
                curLine.push(curCell); lines.push(curLine); curLine=[]; curCell='';
                if (c==='\r' && n==='\n') i++;
            } else curCell += c;
        }
    }
    if (curCell || curLine.length) { curLine.push(curCell); lines.push(curLine); }
    
    // Remove BOM from the first cell if present
    if (lines.length > 0 && lines[0][0] && lines[0][0].charCodeAt(0) === 0xFEFF) {
        lines[0][0] = lines[0][0].substring(1);
    }
    return lines;
}

function parseCSVFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseCSV(content);
}

function toCSV(rowArray) {
    return rowArray.map(cell => {
        if (cell === undefined || cell === null) cell = '';
        cell = String(cell).replace(/"/g, '""');
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
            return `"${cell}"`;
        }
        return cell;
    }).join(',');
}

function writeCSVFile(filePath, dataLines) {
    let outputCSV = '';
    for (let line of dataLines) {
        outputCSV += toCSV(line) + '\r\n';
    }
    fs.writeFileSync(filePath, outputCSV, 'utf-8');
}

module.exports = {
    parseCSV,
    parseCSVFile,
    toCSV,
    writeCSVFile
};
