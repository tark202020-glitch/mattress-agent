import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { PriceSummary } from '../../../types/pricing';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            coverName, // e.g., Basic, Standard, Premium
            title,     // Model Name
            specsList, // Array of configuration strings
            sizeData,  // Array of { sizeLabel: string, dimensions: string, price: number }
        } = body;

        // 1. Load the template
        const filePath = path.join(process.cwd(), 'resource', '견적포맷.xlsx');
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: '견적포맷.xlsx 파일을 찾을 수 없습니다.' }, { status: 404 });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];

        // 2. Prepare the data
        const startRow = 33;
        const rowCount = sizeData.length;

        // "구성" text: join all specs with newlines
        const configText = specsList.join('\n');

        // Insert rows
        for (let i = 0; i < rowCount; i++) {
            const currentRow = startRow + i;
            const sizeInfo = sizeData[i];

            const row = worksheet.getRow(currentRow);

            // Set size details based on B33 origin:
            // B(2): 분류, C(3): 모델명, D(4): 구성, E(5): 규격, F(6): D, G(7): W, H(8): H, I(9): 공급가
            row.getCell(5).value = sizeInfo.label;
            row.getCell(6).value = sizeInfo.d;
            row.getCell(7).value = sizeInfo.w;
            row.getCell(8).value = sizeInfo.h;

            // Set price
            row.getCell(9).value = sizeInfo.price;
            row.getCell(9).numFmt = '#,##0'; // currency format

            row.commit();
        }

        // No merging, write only to the first row (startRow)
        const cellClass = worksheet.getCell(startRow, 2);
        cellClass.value = coverName || '';
        cellClass.alignment = { vertical: 'middle', horizontal: 'center' };

        const cellModel = worksheet.getCell(startRow, 3);
        cellModel.value = title || 'MDT-000';
        cellModel.alignment = { vertical: 'middle', horizontal: 'center' };

        const cellConfig = worksheet.getCell(startRow, 4);
        cellConfig.value = configText;
        cellConfig.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

        // 3. Generate output buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // 4. Return as downloadable file
        return new NextResponse(buffer, {
            headers: {
                'Content-Disposition': 'attachment; filename="quote.xlsx"',
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
        });

    } catch (error: any) {
        console.error('Error generating quote:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
