import { describe, it, expect } from 'vitest';
import { itemNoForOption, guardKey, bottomKey, ASSEMBLY, AUTO_PARTS, OPTION_ITEM_MAP, PREFIX_CATEGORY } from '../codes';

describe('codes: 옵션 → 품번 매핑', () => {
    it('상단폼 4종은 FM-001~004', () => {
        expect(itemNoForOption('TOP_50')).toBe('FM-001');
        expect(itemNoForOption('TOP_80_2L')).toBe('FM-004');
    });
    it('가드폼 두께×경도 조합은 FM-010~015', () => {
        expect(guardKey(70, '소프트')).toBe('GUARD_70_소프트');
        expect(itemNoForOption(guardKey(70, '소프트'))).toBe('FM-010');
        expect(itemNoForOption(guardKey(80, '미디엄'))).toBe('FM-014');
        expect(itemNoForOption(guardKey(80, '하드'))).toBe('FM-015');
    });
    it('하단폼 두께×경도 조합은 FM-020~025', () => {
        expect(itemNoForOption(bottomKey(30, '미디엄'))).toBe('FM-021');
        expect(itemNoForOption(bottomKey(50, '하드'))).toBe('FM-025');
    });
    it('스트링·커버·컨트롤러·센서·포장', () => {
        expect(itemNoForOption('V4_TPU')).toBe('ST-002');
        expect(itemNoForOption('GENTLE_BREED')).toBe('CV-005');
        expect(itemNoForOption('ALL_CARE')).toBe('CV-007');
        expect(itemNoForOption('IOT')).toBe('CT-003');
        expect(itemNoForOption('SENSOR_BAND_M')).toBe('SN-002');
        expect(itemNoForOption('FOLD_3')).toBe('PK-002');
    });
    it('모르는 옵션은 null', () => {
        expect(itemNoForOption('CUSTOM_XYZ')).toBeNull();
    });
    it('어셈블리·자동 부품·접두어 카테고리', () => {
        expect(ASSEMBLY.FM).toBe('FM-000');
        expect(AUTO_PARTS.ADAPTER).toBe('CT-010');
        expect(AUTO_PARTS.IOT_STICK).toBe('CT-013');
        expect(PREFIX_CATEGORY.SN).toBe('센서');
        // 모든 매핑 품번은 패턴을 만족한다
        for (const no of Object.values(OPTION_ITEM_MAP)) {
            expect(no).toMatch(/^(CV|FM|ST|CT|SN|PK|SW)-\d{3}$/);
        }
    });
});
