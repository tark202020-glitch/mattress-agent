import { describe, it, expect } from 'vitest';
import { buildBom, topFoamHeight } from '../bomBuilder';
import type { BomDesignInput, SizeSpec } from '../types';

const premium: BomDesignInput = {
    isDual: false,
    topFoamEnabled: true, topFoamOptionId: 'TOP_70_2L',
    guardFoamEnabled: true, guardFoamThickness: 80, guardFoamHardness: '미디엄',
    bottomFoamEnabled: true, bottomFoamThickness: 30, bottomFoamHardness: '미디엄',
    coreId: 'V4_TPU', coverId: 'GENTLE_BREED', controllerId: 'IOT',
    sensorId: 'SENSOR_BAND_M', packagingId: 'ROLL',
};
const LK: SizeSpec = { size_preset_id: 'LK', width_mm: 1800, depth_mm: 2000 };

const find = (lines: ReturnType<typeof buildBom>['lines'], no: string) => lines.find(l => l.item_no === no)!;

describe('bomBuilder: 기획안 5.3 예시', () => {
    const { lines, unmapped } = buildBom(premium, LK);

    it('상단폼 높이 파싱', () => {
        expect(topFoamHeight('TOP_70_2L')).toBe(70);
        expect(topFoamHeight(null)).toBe(0);
    });
    it('레벨1 어셈블리 7개가 레벨2보다 먼저 온다', () => {
        const l1 = lines.filter(l => l.level === 1).map(l => l.item_no);
        expect(l1).toEqual(['FM-000', 'ST-000', 'CV-000', 'CT-000', 'SN-000', 'PK-000', 'SW-000']);
        const firstL2 = lines.findIndex(l => l.level === 2);
        expect(lines.slice(0, firstL2).every(l => l.level === 1)).toBe(true);
    });
    it('폼: 상단·가드·하단 치수', () => {
        expect(find(lines, 'FM-003')).toMatchObject({ parent_item_no: 'FM-000', quantity: 1, spec_text: '1800×2000×70' });
        const guard = find(lines, 'FM-014');
        expect(guard.quantity).toBe(4);
        expect(guard.dims).toEqual([
            { label: 'D', w: 80, d: 1840, h: 200, qty: 2 },
            { label: 'W', w: 80, d: 1800, h: 200, qty: 2 },
        ]);
        expect(guard.spec_text).toBe('D: 80×1840×200 ×2 / W: 80×1800×200 ×2');
        expect(find(lines, 'FM-021').spec_text).toBe('1800×2000×30');
    });
    it('스트링은 코어 치수, 커버는 총 높이', () => {
        expect(find(lines, 'ST-002')).toMatchObject({ quantity: 1, spec_text: '1640×1840×200' });
        expect(find(lines, 'CV-005')).toMatchObject({ quantity: 1, spec_text: '1800×2000×300' });
        expect(find(lines, 'CV-020').quantity).toBe(1);
        expect(find(lines, 'CV-021').quantity).toBe(1);
    });
    it('컨트롤러 본체 + 부속품, 에어호스는 컨트롤러 수 × 2', () => {
        expect(find(lines, 'CT-003').quantity).toBe(1);
        expect(find(lines, 'CT-010').quantity).toBe(1);
        expect(find(lines, 'CT-011').quantity).toBe(2);
        expect(find(lines, 'CT-012').quantity).toBe(1);
        expect(find(lines, 'CT-014').quantity).toBe(1);
        expect(lines.find(l => l.item_no === 'CT-013')).toBeUndefined(); // IoT Stick은 IOT_STICK 선택 시만
    });
    it('센서·포장·SW', () => {
        expect(find(lines, 'SN-002').quantity).toBe(1);
        expect(find(lines, 'PK-001')).toMatchObject({ alt_item_no: 'PK-002', dims: [{ w: 1800, d: 2000, h: 0, qty: 1 }] });
        expect(find(lines, 'PK-010').quantity).toBe(1);
        expect(find(lines, 'PK-011').quantity).toBe(1);
        expect(find(lines, 'SW-001').parent_item_no).toBe('SW-000');
        expect(find(lines, 'SW-003').quantity).toBe(1);
    });
    it('모든 줄은 wizard 소스, 미매핑 없음', () => {
        expect(lines.every(l => l.source === 'wizard')).toBe(true);
        expect(unmapped).toEqual([]);
    });
});

describe('bomBuilder: 변형', () => {
    it('Dual이면 스트링·컨트롤러·센서 ×2, 가드폼 5개, 에어호스 4개', () => {
        const { lines } = buildBom({ ...premium, isDual: true }, LK);
        expect(find(lines, 'ST-002').quantity).toBe(2);
        expect(find(lines, 'ST-002').spec_text).toBe('780×1840×200');
        expect(find(lines, 'FM-014').quantity).toBe(5);
        expect(find(lines, 'CT-003').quantity).toBe(2);
        expect(find(lines, 'CT-011').quantity).toBe(4);
        expect(find(lines, 'SN-002').quantity).toBe(2);
    });
    it('Basic 구조(폼 없음)는 FM-000 어셈블리도 없다', () => {
        const basic: BomDesignInput = { ...premium, topFoamEnabled: false, guardFoamEnabled: false, bottomFoamEnabled: false, controllerId: 'NUMBERING' };
        const { lines } = buildBom(basic, LK);
        expect(lines.find(l => l.item_no === 'FM-000')).toBeUndefined();
        expect(find(lines, 'ST-002').spec_text).toBe('1800×2000×200');
        expect(find(lines, 'CV-005').spec_text).toBe('1800×2000×200');
        expect(lines.find(l => l.item_no === 'SW-000')).toBeUndefined(); // Numbering은 SW 세트 없음
    });
    it('IOT_STICK 선택 시 CT-013 포함', () => {
        const { lines } = buildBom({ ...premium, controllerId: 'IOT_STICK' }, LK);
        expect(find(lines, 'CT-004').quantity).toBe(1);
        expect(find(lines, 'CT-013').quantity).toBe(1);
    });
    it('커스텀 옵션은 unmapped로 보고하고 줄은 만들지 않는다', () => {
        const { lines, unmapped } = buildBom({ ...premium, coverId: 'CUSTOM_COVER_1' }, LK);
        expect(lines.filter(l => l.level === 2 && /^CV-00\d$/.test(l.item_no))).toEqual([]);
        expect(unmapped).toEqual([{ step: '커버', optionKey: 'CUSTOM_COVER_1' }]);
        // 라벨은 커버 어셈블리 아래 그대로 남는다
        expect(find(lines, 'CV-020').parent_item_no).toBe('CV-000');
    });
    it('선택이 없는 단계는 어셈블리를 만들지 않는다', () => {
        const { lines } = buildBom({ ...premium, sensorId: null, packagingId: null }, LK);
        expect(lines.find(l => l.item_no === 'SN-000')).toBeUndefined();
        expect(lines.find(l => l.item_no === 'PK-000')).toBeUndefined();
    });
});
