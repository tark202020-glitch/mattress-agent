import { describe, it, expect } from 'vitest';
import { toTree } from '../tree';

describe('toTree', () => {
    it('레벨1 아래에 레벨2를 붙이고 순서를 보존한다', () => {
        const t = toTree([
            { level: 1, item_no: 'FM-000', parent_item_no: null },
            { level: 1, item_no: 'ST-000', parent_item_no: null },
            { level: 2, item_no: 'ST-002', parent_item_no: 'ST-000' },
            { level: 2, item_no: 'FM-003', parent_item_no: 'FM-000' },
        ]);
        expect(t.map(n => n.item_no)).toEqual(['FM-000', 'ST-000']);
        expect(t[0].children.map(c => c.item_no)).toEqual(['FM-003']);
        expect(t[1].children.map(c => c.item_no)).toEqual(['ST-002']);
    });
    it('상위가 없는 레벨2는 루트로 올린다 (데이터 오류 가시화)', () => {
        const t = toTree([{ level: 2, item_no: 'X-001', parent_item_no: 'X-000' }]);
        expect(t[0].item_no).toBe('X-001');
    });
});
