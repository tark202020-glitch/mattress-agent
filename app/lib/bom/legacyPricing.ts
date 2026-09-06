// ============================================================
// 현행 DEFAULT_PRICING_DATA → AVL 행 (협력사 V-000 기준단가)
// 시드 SQL 생성과 동치 테스트가 공유한다.
// ============================================================
import { DEFAULT_PRICING_DATA } from '../pricingData';
import { AUTO_PARTS, HARDNESS, guardKey, bottomKey, itemNoForOption } from './codes';
import type { AvlPriceRow } from './types';

export const LEGACY_VENDOR = 'V-000';
export const LEGACY_APPROVED_AT = '2026-01-01';

/** pricingStore.calculateSummary에 하드코딩돼 있던 폭 구간 단가 */
export const WIDTH_STEPS: Record<string, { maxWidth: number; price: number; boxSpec: string }[]> = {
    ROLL: [
        { maxWidth: 1100, price: 7000, boxSpec: 'Box: 1400×310×310' },
        { maxWidth: 1500, price: 8500, boxSpec: 'Box: 1800×310×310' },
        { maxWidth: 99999, price: 13000, boxSpec: 'Box: 2100×310×310' },
    ],
    FOLD_3: [
        { maxWidth: 1499, price: 12000, boxSpec: 'Box: 1100×410×410' },
        { maxWidth: 1700, price: 15000, boxSpec: 'Box: 1100×470×470' },
        { maxWidth: 99999, price: 18000, boxSpec: 'Box: 1200×550×550' },
    ],
};

function row(item_no: string, partial: Partial<AvlPriceRow>): AvlPriceRow {
    return {
        item_no, vendor_code: LEGACY_VENDOR, approval_status: '승인', approved_at: LEGACY_APPROVED_AT,
        price_type: 'FIXED', unit_price: 0, price_constant: 0, price_base: 0, price_steps: null, ...partial,
    };
}

export function legacyAvlRows(): AvlPriceRow[] {
    const out: AvlPriceRow[] = [];
    for (const cat of DEFAULT_PRICING_DATA) {
        if (cat.id === 'delivery') continue; // 배송은 BOM 밖
        for (const it of cat.items) {
            // 가드폼/하단폼: 두께 1개 → 경도 3개 품번으로 전개
            const keys: string[] =
                cat.id === 'foam_guard' ? HARDNESS.map(h => guardKey(parseInt(it.optionId.split('_')[1]), h)) :
                cat.id === 'foam_bottom' ? HARDNESS.map(h => bottomKey(parseInt(it.optionId.split('_')[1]), h)) :
                [it.optionId];
            for (const k of keys) {
                const no = itemNoForOption(k);
                if (!no) continue;
                if (it.formulaType === 'VOLUME') out.push(row(no, { price_type: 'VOLUME', price_constant: it.constant, price_base: it.basePrice }));
                else if (it.formulaType === 'WIDTH_STEP') out.push(row(no, { price_type: 'WIDTH_STEP', price_steps: WIDTH_STEPS[it.optionId] }));
                else out.push(row(no, { price_type: 'FIXED', unit_price: it.basePrice }));
            }
        }
    }
    // 자동 부품(라벨·어댑터·호스·매뉴얼·박스·비닐·SW)은 현행 단가표에 없으므로 0원 승인
    for (const no of Object.values(AUTO_PARTS)) out.push(row(no, { price_type: 'FIXED', unit_price: 0 }));
    return out;
}
