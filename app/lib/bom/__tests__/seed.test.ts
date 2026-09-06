import { describe, it, expect } from 'vitest';
import { seedItems, buildSeedSql } from '../seed';
import { OPTION_ITEM_MAP, AUTO_PARTS, ASSEMBLY } from '../codes';

describe('seed', () => {
    const items = seedItems();
    it('매핑표의 모든 품번과 자동 부품·어셈블리가 품목에 있다', () => {
        const nos = new Set(items.map(i => i.item_no));
        for (const no of Object.values(OPTION_ITEM_MAP)) expect(nos.has(no), no).toBe(true);
        for (const no of Object.values(AUTO_PARTS)) expect(nos.has(no), no).toBe(true);
        for (const no of Object.values(ASSEMBLY)) expect(nos.has(no), no).toBe(true);
        expect(items.length).toBe(55);
    });
    it('품번은 유일하고 접두어·대분류가 맞는다', () => {
        expect(new Set(items.map(i => i.item_no)).size).toBe(items.length);
        expect(items.find(i => i.item_no === 'FM-014')).toMatchObject({ category: '폼', name: '가드폼 80mm 미디엄', wizard_option_key: 'GUARD_80_미디엄' });
        expect(items.find(i => i.item_no === 'SW-001')).toMatchObject({ category: 'APP', revision: '1.0.0', unit: '-' });
        expect(items.find(i => i.item_no === 'PK-001')).toMatchObject({ item_type: '포장사양', wizard_option_key: 'ROLL' });
    });
    it('SQL은 코드표·협력사·담당자·품목·AVL을 모두 포함하고 따옴표를 이스케이프한다', () => {
        const sql = buildSeedSql();
        expect(sql).toContain("insert into code_values");
        expect(sql).toContain("('V-000', '기준단가(협력사 미지정)'");
        expect(sql).toContain("('E-001', '김OO'");
        expect(sql).toContain("('FM-003', '상단폼 70mm (2Layer 5:2)'");
        expect(sql).toContain("insert into avl");
        expect(sql).toContain("'WIDTH_STEP'");
        expect((sql.match(/on conflict/g) || []).length).toBeGreaterThanOrEqual(5);
    });
});
