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
        expect(b.items.length).toBe(22);
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
    it('BOM 19줄, 레벨1이 앞에 온다, 대체품번 유지', () => {
        const bom1 = b.bom_lines.filter(l => l.product_code === 'MAT-001-LK');
        expect(bom1.length).toBe(19);
        expect(bom1.slice(0, 4).every(l => l.level === 1)).toBe(true);
        expect(bom1.find(l => l.item_no === 'PK-001')?.alt_item_no).toBe('PK-002');
    });
    it('등록일이 비면 created_at 키를 만들지 않는다', () => {
        expect(b.items.every(i => !('created_at' in i))).toBe(true);
        expect(b.ecn.every(e => 'ecn_date' in e)).toBe(true); // 템플릿 ECN에는 일자가 있다
    });
    it('템플릿 일반 커버 CV-001~003과 참조 행을 제외한다', () => {
        expect(b.items.filter(i => /^CV-00[1-3]$/.test(i.item_no as string))).toEqual([]);
        expect(b.bom_lines.some(l => ['CV-001', 'CV-002'].includes(l.item_no as string))).toBe(false);
        expect(b.bom_lines.some(l => ['CV-001', 'CV-002'].includes(l.parent_item_no as string))).toBe(false);
        expect(b.avl.some(a => ['CV-001', 'CV-002'].includes(a.item_no as string))).toBe(false);
        expect(b.npi_status.some(n => ['CV-001', 'CV-002'].includes(n.item_no as string))).toBe(false);
        expect(b.log).toContain('템플릿 일반 커버 품목 CV-001(커버1 (상판)) 제외: BOM 1 / AVL 1 / NPI 1 행 삭제 — 커버 분리수는 products.cover_split_count로 관리');
        expect(b.log.some(m => m.includes('CV-003') && m.includes('cover_split_count'))).toBe(true);
        expect(b.ecn_products.every(p => b.ecn.some(e => e.ecn_no === p.ecn_no))).toBe(true);
    });
    it('ECN과 영향 상품', () => {
        expect(b.ecn[0]).toMatchObject({ ecn_no: 'ECN-2026-001', item_no: 'CT-001', rev_from: 'A', rev_to: 'B', status: '승인' });
        expect(b.ecn_products).toEqual([{ ecn_no: 'ECN-2026-001', product_code: 'MAT-001-LK' }]);
    });
    it('변환 로그를 남긴다', () => {
        expect(b.log.some(m => m.includes('CT-003') && m.includes('CT-011'))).toBe(true);
    });
});

describe('코드표 왕복', () => {
    it('내보낸 코드표(영문 헤더)를 다시 읽으면 코드값이 보존된다', async () => {
        const b = parseTemplate(buf, { size_preset_id: 'LK' });
        const out = await buildExportWorkbook({ ...b, progress: [] });
        const b2 = parseTemplate(out, { size_preset_id: 'LK' });
        expect(b2.code_values.length).toBe(b.code_values.length);
        expect(b2.code_values).toEqual(expect.arrayContaining([{ code_type: 'dev_stage', value: 'EVT', sort_order: 1 }]));
    });
});

describe('buildExportWorkbook', () => {
    it('시트 10개를 만들고 헤더가 템플릿과 같다', async () => {
        const b = parseTemplate(buf, { size_preset_id: 'LK' });
        const out = await buildExportWorkbook({ ...b, progress: [] });
        const wb = XLSX.read(out, { type: 'buffer' });
        expect(wb.SheetNames).toEqual(['상품마스터', '품목마스터', 'BOM', '협력사마스터', '담당자마스터', 'AVL', 'NPI진행현황', '상품별완성률', 'ECN변경이력', '코드표']);
        const bom = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['BOM'], { header: 1 });
        expect(bom[0]).toEqual(['상품코드', '레벨', '상위품번', '품번', '품명', '소요량', '단위', '필수여부', '대체품번', '비고', '규격', '치수', '출처']);
        expect(bom.length).toBe(20);
    });
});

describe('엑셀 왕복 (가져오기 → 내보내기 → 다시 가져오기)', () => {
    it('상품코드·BOM 줄·AVL 단가 필드가 그대로 보존된다', async () => {
        const b = parseTemplate(buf, { size_preset_id: 'LK' });
        // 템플릿 AVL은 전부 FIXED라, VOLUME/WIDTH_STEP 왕복을 확인하려고 두 행을 바꿔 둔다
        b.avl[0].price_type = 'VOLUME';
        b.avl[0].price_constant = 0.0003266;
        b.avl[0].price_base = 1500;
        b.avl[1].price_type = 'WIDTH_STEP';
        b.avl[1].price_steps = [{ maxWidth: 1500, price: 8500, boxSpec: 'Box: 1800×310×310' }, { maxWidth: 99999, price: 13000 }];
        // 위자드 산출 줄(치수·규격·출처)이 있는 상태를 만든다
        const line = b.bom_lines.find(l => l.item_no === 'CT-011')!;
        line.spec_text = '1800×2000×80';
        line.dims = [{ w: 1800, d: 2000, h: 80, qty: 2 }];
        line.source = 'wizard';
        // 우리 export 재가져오기 보호: 시드 컨트롤러(CT-002)는 품명이 템플릿과 달라 재번호되면 안 된다
        b.items.push({
            item_no: 'CT-002', name: 'Controller 1.6', category: '컨트롤러', subcategory: '본체',
            item_type: '부품', unit: 'EA', revision: 'A',
        });
        b.bom_lines.push({
            product_code: 'MAT-001-LK', level: 2, parent_item_no: 'CT-000', item_no: 'CT-002',
            quantity: 1, required: '필수', alt_item_no: null, note: null, spec_text: null, dims: null, source: 'manual',
        });

        const out = await buildExportWorkbook({ ...b, progress: [] });
        const b2 = parseTemplate(out, { size_preset_id: 'LK' });

        // 사이즈 접미어가 두 번 붙지 않는다
        expect(b2.products.map(p => p.product_code)).toEqual(['MAT-001-LK', 'MAT-002-LK']);
        expect(b2.products.map(p => p.product_code)).toEqual(b.products.map(p => p.product_code));
        expect(b2.products.map(p => p.model_code)).toEqual(['MAT-001', 'MAT-002']);

        const key = (l: Record<string, unknown>) => ({
            product_code: l.product_code, item_no: l.item_no, parent_item_no: l.parent_item_no,
            quantity: l.quantity, alt_item_no: l.alt_item_no, spec_text: l.spec_text, dims: l.dims, source: l.source,
        });
        expect(b2.bom_lines.map(key)).toEqual(b.bom_lines.map(key));
        expect(b2.avl).toEqual(b.avl);

        // 시드 컨트롤러 CT-002는 품명이 템플릿 원본('어댑터')과 달라 재번호되지 않고 그대로 유지된다
        expect(b2.items.find(i => i.item_no === 'CT-002')).toMatchObject({ name: 'Controller 1.6' });
        expect(b2.items.filter(i => i.item_no === 'CT-010').length).toBe(1);
        expect(b2.bom_lines.some(l => l.item_no === 'CT-002' && l.parent_item_no === 'CT-000' && l.product_code === 'MAT-001-LK')).toBe(true);
    });
});

describe('TEMPLATE_LEGACY: 품명이 템플릿 원본과 일치할 때만 재번호한다', () => {
    const baseData = { employees: [], vendors: [], products: [], bom_lines: [], avl: [], npi_status: [], ecn: [], ecn_products: [], code_values: [], progress: [] };
    it('CT-003 품명이 우리 시드 컨트롤러(IoT Controller)면 재번호하지 않는다', async () => {
        const out = await buildExportWorkbook({
            ...baseData,
            items: [{ item_no: 'CT-003', name: 'IoT Controller', category: '컨트롤러', subcategory: '본체', item_type: '부품', unit: 'EA', revision: 'A' }],
        });
        const b = parseTemplate(out, { size_preset_id: 'LK' });
        expect(b.items.find(i => i.item_no === 'CT-003')).toMatchObject({ name: 'IoT Controller' });
        expect(b.items.find(i => i.item_no === 'CT-011')).toBeUndefined();
    });
    it('CT-003 품명이 템플릿 원본(에어호스)이면 CT-011로 재번호한다', async () => {
        const out = await buildExportWorkbook({
            ...baseData,
            items: [{ item_no: 'CT-003', name: '에어호스', category: '컨트롤러', subcategory: '본체', item_type: '부품', unit: 'EA', revision: 'A' }],
        });
        const b = parseTemplate(out, { size_preset_id: 'LK' });
        expect(b.items.find(i => i.item_no === 'CT-011')).toMatchObject({ name: '에어호스' });
        expect(b.items.find(i => i.item_no === 'CT-003')).toBeUndefined();
    });
});
