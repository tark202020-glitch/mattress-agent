import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseTemplate, RENUMBER, buildExportWorkbook } from '../excelIO';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync(path.join(process.cwd(), 'resource', 'bom_template.xlsx'));

describe('parseTemplate', () => {
    const b = parseTemplate(buf, { size_preset_id: 'LK' });
    it('마스터 4종을 읽는다', () => {
        expect(b.employees.map(e => e.employee_id)).toEqual(['E-001', 'E-002', 'E-003', 'E-004', 'E-005']);
        expect(b.vendors.length).toBe(5);
        expect(b.items.length).toBe(25);
        expect(b.products.map(p => p.product_code)).toEqual(['MAT-001-LK', 'MAT-002-LK']);
        expect(b.products[0]).toMatchObject({ model_code: 'MAT-001', size_preset_id: 'LK', width_mm: 1800, depth_mm: 2000, cover_split_count: 2, pm_id: 'E-001' });
    });
    it('재번호: 컨트롤러 부속품 CT-002~006 → CT-010~014, CV-010 → FM-002', () => {
        expect(RENUMBER['CT-003']).toBe('CT-011');
        const hose = b.bom_lines.find(l => l.item_no === 'CT-011')!;
        expect(hose).toMatchObject({ product_code: 'MAT-001-LK', parent_item_no: 'CT-000', quantity: 2, level: 2 });
        expect(b.bom_lines.find(l => l.item_no === 'CT-003')).toBeUndefined();
        expect(b.items.find(i => i.item_no === 'FM-002')).toMatchObject({ category: '폼' });
        expect(b.avl.find(a => a.item_no === 'CT-011')?.vendor_code).toBe('V-003');
        expect(b.npi_status.find(n => n.item_no === 'CT-013')).toMatchObject({ product_code: 'MAT-001-LK', stage: 'DVT', progress: 0.6 });
    });
    it('BOM 21줄, 레벨1이 앞에 온다, 대체품번 유지', () => {
        const bom1 = b.bom_lines.filter(l => l.product_code === 'MAT-001-LK');
        expect(bom1.length).toBe(21);
        expect(bom1.slice(0, 4).every(l => l.level === 1)).toBe(true);
        expect(bom1.find(l => l.item_no === 'PK-001')?.alt_item_no).toBe('PK-002');
    });
    it('ECN과 영향 상품', () => {
        expect(b.ecn[0]).toMatchObject({ ecn_no: 'ECN-2026-001', item_no: 'CT-001', rev_from: 'A', rev_to: 'B', status: '승인' });
        expect(b.ecn_products).toEqual([{ ecn_no: 'ECN-2026-001', product_code: 'MAT-001-LK' }]);
    });
    it('변환 로그를 남긴다', () => {
        expect(b.log.some(m => m.includes('CT-003') && m.includes('CT-011'))).toBe(true);
    });
});

describe('buildExportWorkbook', () => {
    it('시트 10개를 만들고 헤더가 템플릿과 같다', async () => {
        const b = parseTemplate(buf, { size_preset_id: 'LK' });
        const out = await buildExportWorkbook({ ...b, progress: [] });
        const wb = XLSX.read(out, { type: 'buffer' });
        expect(wb.SheetNames).toEqual(['상품마스터', '품목마스터', 'BOM', '협력사마스터', '담당자마스터', 'AVL', 'NPI진행현황', '상품별완성률', 'ECN변경이력', '코드표']);
        const bom = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['BOM'], { header: 1 });
        expect(bom[0]).toEqual(['상품코드', '레벨', '상위품번', '품번', '품명', '소요량', '단위', '필수여부', '대체품번', '비고']);
        expect(bom.length).toBe(22);
    });
});
