import { describe, it, expect } from 'vitest';
import { specLines, SIZE_LABEL } from '../quoteSpecs';

describe('specLines', () => {
    it('레벨2 줄을 대분류별로 묶어 견적서 구성 문구를 만든다', () => {
        const out = specLines([
            { level: 1, item_no: 'FM-000', quantity: 1, spec_text: null, items: { name: '폼 어셈블리', category: '폼' } },
            { level: 2, item_no: 'FM-003', quantity: 1, spec_text: '1800×2000×70', items: { name: '상단폼 70mm (2Layer 5:2)', category: '폼' } },
            { level: 2, item_no: 'FM-014', quantity: 4, spec_text: 'D: …', items: { name: '가드폼 80mm 미디엄', category: '폼' } },
            { level: 2, item_no: 'ST-002', quantity: 2, spec_text: '780×1840×200', items: { name: 'V4 TPU 에어셀', category: '스트링' } },
            { level: 2, item_no: 'CV-020', quantity: 1, spec_text: null, items: { name: '로우라벨 (법정표시)', category: '커버' } },
        ]);
        expect(out).toEqual([
            '- 폼: 상단폼 70mm (2Layer 5:2), 가드폼 80mm 미디엄 ×4',
            '- 스트링: V4 TPU 에어셀 ×2 (780×1840×200)',
            '- 커버: 로우라벨 (법정표시)',
        ]);
    });
    it('사이즈 라벨', () => {
        expect(SIZE_LABEL.Q_KR).toBe('Q');
        expect(SIZE_LABEL.CK).toBe('CK');
    });
});
