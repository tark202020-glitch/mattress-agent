import { describe, it, expect } from 'vitest';
import { synthesizeFoamDims, type ItemMeta } from '../importDims';

const products = [{ product_code: 'MAT-001-LK', width_mm: 1800, depth_mm: 2000 }];
const meta: ItemMeta[] = [
    { item_no: 'FM-003', category: '폼', attributes: { thickness: 70 } },
    { item_no: 'CV-001', category: '커버', attributes: null },
    { item_no: 'PK-001', category: '포장', attributes: { boxSpec: 'Box: 2100×310×310' } },
];

describe('synthesizeFoamDims', () => {
    it('두께가 있는 레벨2 폼 줄에 상품 폭·깊이로 치수와 규격을 만든다', () => {
        const lines = [{ product_code: 'MAT-001-LK', item_no: 'FM-003', level: 2, quantity: 1, dims: null, spec_text: null }];
        expect(synthesizeFoamDims(lines, products, meta)[0]).toMatchObject({
            dims: [{ w: 1800, d: 2000, h: 70, qty: 1 }], spec_text: '1800×2000×70',
        });
    });
    it('소요량을 qty로 쓴다', () => {
        const lines = [{ product_code: 'MAT-001-LK', item_no: 'FM-003', level: 2, quantity: 4, dims: null, spec_text: null }];
        expect(synthesizeFoamDims(lines, products, meta)[0].dims).toEqual([{ w: 1800, d: 2000, h: 70, qty: 4 }]);
    });
    it('두께 없는 품목·레벨1·이미 치수가 있는 줄·모르는 상품은 그대로 둔다', () => {
        const kept = [
            { product_code: 'MAT-001-LK', item_no: 'PK-001', level: 2, quantity: 1, dims: null, spec_text: null },
            { product_code: 'MAT-001-LK', item_no: 'CV-001', level: 2, quantity: 1, dims: null, spec_text: null },
            { product_code: 'MAT-001-LK', item_no: 'FM-003', level: 1, quantity: 1, dims: null, spec_text: null },
            { product_code: 'MAT-001-LK', item_no: 'FM-003', level: 2, quantity: 1, dims: [{ w: 1, d: 2, h: 3, qty: 1 }], spec_text: '기존' },
            { product_code: 'MAT-999-LK', item_no: 'FM-003', level: 2, quantity: 1, dims: null, spec_text: null },
        ];
        expect(synthesizeFoamDims(kept, products, meta)).toEqual(kept);
    });
});
