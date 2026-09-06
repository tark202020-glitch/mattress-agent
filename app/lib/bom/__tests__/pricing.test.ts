import { describe, it, expect } from 'vitest';
import { buildBom } from '../bomBuilder';
import { priceBom, pickApprovedAvl, priceLine } from '../pricing';
import { legacyAvlRows } from '../legacyPricing';
import { usePricingStore } from '../../pricingStore';
import type { BomDesignInput, SizeSpec, AvlPriceRow, BomLine } from '../types';

const premium: BomDesignInput = {
    isDual: false,
    topFoamEnabled: true, topFoamOptionId: 'TOP_70_2L',
    guardFoamEnabled: true, guardFoamThickness: 80, guardFoamHardness: '미디엄',
    bottomFoamEnabled: true, bottomFoamThickness: 30, bottomFoamHardness: '미디엄',
    coreId: 'V4_TPU', coverId: 'GENTLE_BREED', controllerId: 'IOT',
    sensorId: 'SENSOR_BAND_M', packagingId: 'ROLL',
};
const sizes: SizeSpec[] = [
    { size_preset_id: 'SS', width_mm: 1100, depth_mm: 2000 },
    { size_preset_id: 'Q_KR', width_mm: 1500, depth_mm: 2000 },
    { size_preset_id: 'LK', width_mm: 1800, depth_mm: 2000 },
    { size_preset_id: 'K_US', width_mm: 1930, depth_mm: 2030 },
];
const avl = legacyAvlRows();

/** 현행 pricingStore 입력 형태로 변환 */
function legacyInput(d: BomDesignInput, s: SizeSpec, deliveryId: string | null) {
    return {
        sizePresetId: s.size_preset_id, customWidth: s.width_mm, customDepth: s.depth_mm,
        topFoamEnabled: d.topFoamEnabled, topFoamOptionId: d.topFoamOptionId,
        guardFoamEnabled: d.guardFoamEnabled, guardFoamThickness: d.guardFoamThickness,
        bottomFoamEnabled: d.bottomFoamEnabled, bottomFoamThickness: d.bottomFoamThickness,
        isDual: d.isDual, coreId: d.coreId, coverId: d.coverId, controllerId: d.controllerId,
        sensorId: d.sensorId, packagingId: d.packagingId, deliveryId,
    };
}

describe('pricing: 현행 calculateSummary와 동치', () => {
    const variants: { name: string; d: BomDesignInput }[] = [
        { name: 'premium single', d: premium },
        { name: 'premium dual', d: { ...premium, isDual: true } },
        { name: 'standard (상단폼만)', d: { ...premium, guardFoamEnabled: false, bottomFoamEnabled: false, controllerId: 'CTRL_1_6', packagingId: 'FOLD_3' } },
        { name: 'basic', d: { ...premium, topFoamEnabled: false, guardFoamEnabled: false, bottomFoamEnabled: false, coverId: 'COMPACT', controllerId: 'NUMBERING', sensorId: null } },
    ];
    for (const v of variants) for (const s of sizes) {
        it(`${v.name} / ${s.size_preset_id}`, () => {
            const { lines } = buildBom(v.d, s);
            const result = priceBom(lines, avl, { width_mm: s.width_mm, delivery_option: 'PARCEL' });
            const legacy = usePricingStore.getState().calculateSummary(legacyInput(v.d, s, 'PARCEL'));
            expect(result.total).toBe(legacy.totalUnitPrice);
            expect(result.warnings).toEqual([]);
            expect(result.incomplete).toBe(false);
        });
    }
});

describe('pricing: 단위 규칙', () => {
    it('승인 행 중 approved_at 최신을 고른다, 승인 없으면 null', () => {
        const rows: AvlPriceRow[] = [
            { item_no: 'X', vendor_code: 'A', approval_status: '승인', approved_at: '2026-01-01', price_type: 'FIXED', unit_price: 10, price_constant: 0, price_base: 0, price_steps: null },
            { item_no: 'X', vendor_code: 'B', approval_status: '승인', approved_at: '2026-06-01', price_type: 'FIXED', unit_price: 20, price_constant: 0, price_base: 0, price_steps: null },
            { item_no: 'X', vendor_code: 'C', approval_status: '후보', approved_at: '2026-12-01', price_type: 'FIXED', unit_price: 30, price_constant: 0, price_base: 0, price_steps: null },
        ];
        expect(pickApprovedAvl(rows, 'X')?.vendor_code).toBe('B');
        expect(pickApprovedAvl(rows, 'Y')).toBeNull();
    });
    it('AVL 없는 줄은 0원 + 경고', () => {
        const line: BomLine = { item_no: 'CV-099', level: 2, parent_item_no: 'CV-000', quantity: 2, required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'manual' };
        const p = priceLine(line, null, 1500);
        expect(p).toMatchObject({ total: 0, unit_price: 0, warning: '단가 미승인' });
    });
    it('VOLUME은 dims마다 floor(w×d×h×상수)+기본금 × qty 합산', () => {
        const line: BomLine = { item_no: 'FM-014', level: 2, parent_item_no: 'FM-000', quantity: 4, required: '필수', alt_item_no: null, spec_text: null, source: 'wizard', note: null,
            dims: [{ label: 'D', w: 80, d: 1840, h: 200, qty: 2 }, { label: 'W', w: 80, d: 1800, h: 200, qty: 2 }] };
        const row: AvlPriceRow = { item_no: 'FM-014', vendor_code: 'V-000', approval_status: '승인', approved_at: null, price_type: 'VOLUME', unit_price: 0, price_constant: 0.0003266, price_base: 0, price_steps: null };
        const p = priceLine(line, row, 1800);
        expect(p.total).toBe((Math.floor(80 * 1840 * 200 * 0.0003266) + 0) * 2 + (Math.floor(80 * 1800 * 200 * 0.0003266) + 0) * 2);
        expect(p.unit_price).toBe(p.total / 4);
    });
    it('WIDTH_STEP은 상품 폭으로 구간을 고르고 박스 규격을 남긴다', () => {
        const line: BomLine = { item_no: 'PK-001', level: 2, parent_item_no: 'PK-000', quantity: 1, required: '필수', alt_item_no: 'PK-002', spec_text: null, dims: null, note: null, source: 'wizard' };
        const row = avl.find(r => r.item_no === 'PK-001')!;
        expect(priceLine(line, row, 1100)).toMatchObject({ total: 7000, spec_note: 'Box: 1400×310×310' });
        expect(priceLine(line, row, 1500)).toMatchObject({ total: 8500 });
        expect(priceLine(line, row, 1800)).toMatchObject({ total: 13000, spec_note: 'Box: 2100×310×310' });
    });
    it('VOLUME인데 치수가 없으면 0원 + 치수 없음 경고', () => {
        const line: BomLine = { item_no: 'FM-014', level: 2, parent_item_no: 'FM-000', quantity: 2, required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'manual' };
        const row: AvlPriceRow = { item_no: 'FM-014', vendor_code: 'V-000', approval_status: '승인', approved_at: null, price_type: 'VOLUME', unit_price: 0, price_constant: 0.0003266, price_base: 0, price_steps: null };
        expect(priceLine(line, row, 1800)).toMatchObject({ total: 0, unit_price: 0, warning: '치수 없음' });
    });
    it('WIDTH_STEP인데 구간이 비면 0원 + 폭 구간 없음 경고', () => {
        const line: BomLine = { item_no: 'PK-001', level: 2, parent_item_no: 'PK-000', quantity: 1, required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'manual' };
        const row: AvlPriceRow = { item_no: 'PK-001', vendor_code: 'V-000', approval_status: '승인', approved_at: null, price_type: 'WIDTH_STEP', unit_price: 0, price_constant: 0, price_base: 0, price_steps: [] };
        expect(priceLine(line, row, 1800)).toMatchObject({ total: 0, unit_price: 0, warning: '폭 구간 없음' });
    });
    it('KRW가 아닌 통화는 환산하지 않고 경고', () => {
        const line: BomLine = { item_no: 'CT-001', level: 2, parent_item_no: 'CT-000', quantity: 2, required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'manual' };
        const usd: AvlPriceRow = { item_no: 'CT-001', vendor_code: 'V-004', approval_status: '승인', approved_at: null, price_type: 'FIXED', unit_price: 30, price_constant: 0, price_base: 0, price_steps: null, currency: 'USD' };
        expect(priceLine(line, usd, 1800)).toMatchObject({ total: 0, unit_price: 0, warning: '통화 USD 환산 불가' });
        expect(priceLine(line, { ...usd, currency: 'KRW' }, 1800)).toMatchObject({ total: 60, warning: null });
        expect(priceLine(line, { ...usd, currency: undefined }, 1800)).toMatchObject({ total: 60, warning: null });
    });
    it('경고가 하나라도 있으면 incomplete = true', () => {
        const line: BomLine = { item_no: 'CV-099', level: 2, parent_item_no: 'CV-000', quantity: 1, required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'manual' };
        const r = priceBom([line], avl, { width_mm: 1800, delivery_option: null });
        expect(r.warnings).toEqual(['CV-099: 단가 미승인']);
        expect(r.incomplete).toBe(true);
    });
    it('레벨1 어셈블리는 결과 줄에 포함하지 않는다', () => {
        const { lines } = buildBom(premium, sizes[2]);
        const r = priceBom(lines, avl, { width_mm: 1800, delivery_option: null });
        expect(r.lines.every(l => !l.item_no.endsWith('-000'))).toBe(true);
    });
});
