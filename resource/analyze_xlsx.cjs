const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('resource/견적포맷.xlsx');

let output = '';
const log = (s) => { output += s + '\n'; };

log('=== Sheet Names ===');
log(JSON.stringify(wb.SheetNames));

for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    log(`\n========================================`);
    log(`=== Sheet: ${name} ===`);
    log(`========================================`);
    log('Range: ' + ws['!ref']);

    if (ws['!merges']) {
        log('Merged Cells Count: ' + ws['!merges'].length);
        for (const m of ws['!merges']) {
            const s = XLSX.utils.encode_cell(m.s);
            const e = XLSX.utils.encode_cell(m.e);
            log(`  Merge: ${s}:${e}`);
        }
    }

    if (ws['!cols']) {
        log('Column Widths:');
        ws['!cols'].forEach((c, i) => {
            if (c) log(`  Col ${i} (${String.fromCharCode(65 + i)}): wch=${c.wch}, wpx=${c.wpx}`);
        });
    }

    if (ws['!rows']) {
        log('Row Heights:');
        ws['!rows'].forEach((r, i) => {
            if (r) log(`  Row ${i + 1}: hpx=${r.hpx}, hpt=${r.hpt}`);
        });
    }

    const range = XLSX.utils.decode_range(ws['!ref']);
    log(`\nCell Data (rows ${range.s.r + 1} to ${range.e.r + 1}):`);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const rowData = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[addr];
            if (cell) {
                let val = cell.v;
                if (cell.t === 'n') val = `NUM:${val}`;
                rowData.push(`${addr}=${val}`);
            }
        }
        if (rowData.length > 0) {
            log(`  Row ${R + 1}: ${rowData.join(' | ')}`);
        }
    }
}

fs.writeFileSync('resource/xlsx_analysis.txt', output, 'utf8');
console.log('Analysis written to resource/xlsx_analysis.txt');
console.log('File size:', output.length, 'bytes');
