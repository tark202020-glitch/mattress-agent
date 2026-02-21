import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'resource', '견적포맷.xlsx');
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found', path: filePath });
        }
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        return NextResponse.json({
            sheetName,
            data
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
