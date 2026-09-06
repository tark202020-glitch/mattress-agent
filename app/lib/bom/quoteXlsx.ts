// 견적포맷.xlsx 템플릿 채우기 (기존 /api/quote/generate와 동일한 셀 배치)
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

export interface QuoteTemplateInput {
    coverName: string;
    title: string;
    specsList: string[];
    sizeData: { label: string; w: number; d: number; h: number; price: number }[];
}

export async function fillQuoteTemplate(input: QuoteTemplateInput): Promise<Buffer> {
    const filePath = path.join(process.cwd(), 'resource', '견적포맷.xlsx');
    if (!fs.existsSync(filePath)) throw new Error('견적포맷.xlsx 파일을 찾을 수 없습니다.');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    const startRow = 33;
    input.sizeData.forEach((s, i) => {
        const row = ws.getRow(startRow + i);
        // B(2) 분류, C(3) 모델명, D(4) 구성, E(5) 규격, F(6) D, G(7) W, H(8) H, I(9) 공급가
        row.getCell(5).value = s.label;
        row.getCell(6).value = s.d;
        row.getCell(7).value = s.w;
        row.getCell(8).value = s.h;
        row.getCell(9).value = s.price;
        row.getCell(9).numFmt = '#,##0';
        row.commit();
    });
    const c2 = ws.getCell(startRow, 2); c2.value = input.coverName; c2.alignment = { vertical: 'middle', horizontal: 'center' };
    const c3 = ws.getCell(startRow, 3); c3.value = input.title || 'MDT-000'; c3.alignment = { vertical: 'middle', horizontal: 'center' };
    const c4 = ws.getCell(startRow, 4); c4.value = input.specsList.join('\n'); c4.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
}
