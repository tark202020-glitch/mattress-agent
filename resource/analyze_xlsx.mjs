import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const buf = readFileSync('resource/견적포맷.xlsx');
const wb = XLSX.read(buf);

console.log('=== Sheet Names ===');
console.log(wb.SheetNames);

for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    console.log(`\n=== Sheet: ${name} ===`);
    console.log('Range:', ws['!ref']);

    // merged cells
    if (ws['!merges']) {
        console.log('Merged Cells:', JSON.stringify(ws['!merges'].slice(0, 30)));
    }

    // column widths
    if (ws['!cols']) {
        console.log('Column Widths:', JSON.stringify(ws['!cols']));
    }

    // row heights
    if (ws['!rows']) {
        console.log('Row Heights:', JSON.stringify(ws['!rows'].slice(0, 30)));
    }

    // Print all cell values with their addresses
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= Math.min(range.e.r, 60); ++R) {
        const rowData = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[addr];
            if (cell) {
                rowData.push(`${addr}=${JSON.stringify(cell.v)}(t:${cell.t})`);
            }
        }
        if (rowData.length > 0) {
            console.log(`Row ${R + 1}: ${rowData.join(' | ')}`);
        }
    }
}
