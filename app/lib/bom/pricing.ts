// ============================================================
// BOM 줄 + AVL 행 → 견적 (기획안 6장). 순수 함수.
// 수식은 pricingStore.calculateSummary와 동일해야 한다.
// ============================================================
import type { AvlPriceRow, BomLine, PricedLine, QuoteResult } from './types';

/** 배송 옵션별 고정 단가 (현행 단가표: 전부 0) */
export const DELIVERY_PRICES: Record<string, number> = { SELF: 0, PARCEL: 0, CONTAINER: 0, PENDING: 0 };

/** 승인 행 중 approved_at 최신. null은 가장 오래된 것으로 취급 */
export function pickApprovedAvl(rows: AvlPriceRow[], itemNo: string): AvlPriceRow | null {
    const approved = rows.filter(r => r.item_no === itemNo && r.approval_status === '승인');
    if (approved.length === 0) return null;
    approved.sort((a, b) => (b.approved_at ?? '').localeCompare(a.approved_at ?? ''));
    return approved[0];
}

function volumePrice(w: number, d: number, h: number, row: AvlPriceRow): number {
    return Math.floor(w * d * h * row.price_constant) + row.price_base;
}

export function priceLine(line: BomLine, avl: AvlPriceRow | null, widthMm: number): PricedLine {
    const base: PricedLine = {
        item_no: line.item_no, quantity: line.quantity, vendor_code: null, price_type: null,
        unit_price: 0, total: 0, warning: null, spec_note: null,
    };
    if (!avl) return { ...base, warning: '단가 미승인' };
    // 환율 정보가 없으므로 원화가 아닌 단가는 계산하지 않는다
    if (avl.currency && avl.currency !== 'KRW') {
        return { ...base, vendor_code: avl.vendor_code, price_type: avl.price_type, warning: `통화 ${avl.currency} 환산 불가` };
    }

    let total = 0;
    let specNote: string | null = null;
    if (avl.price_type === 'FIXED') {
        total = avl.unit_price * line.quantity;
    } else if (avl.price_type === 'VOLUME') {
        if (!line.dims || line.dims.length === 0) return { ...base, vendor_code: avl.vendor_code, price_type: avl.price_type, warning: '치수 없음' };
        total = line.dims.reduce((sum, dm) => sum + volumePrice(dm.w, dm.d, dm.h, avl) * dm.qty, 0);
    } else {
        const steps = [...(avl.price_steps ?? [])].sort((a, b) => a.maxWidth - b.maxWidth);
        const step = steps.find(s => widthMm <= s.maxWidth) ?? steps[steps.length - 1];
        if (!step) return { ...base, vendor_code: avl.vendor_code, price_type: avl.price_type, warning: '폭 구간 없음' };
        total = step.price * line.quantity;
        specNote = step.boxSpec ?? null;
    }
    return {
        ...base, vendor_code: avl.vendor_code, price_type: avl.price_type,
        total, unit_price: line.quantity > 0 ? total / line.quantity : 0, spec_note: specNote,
    };
}

export function priceBom(
    lines: BomLine[],
    avlRows: AvlPriceRow[],
    product: { width_mm: number; delivery_option: string | null },
): QuoteResult {
    const priced = lines
        .filter(l => l.level === 2)
        .map(l => priceLine(l, pickApprovedAvl(avlRows, l.item_no), product.width_mm));
    const deliveryPrice = product.delivery_option ? (DELIVERY_PRICES[product.delivery_option] ?? 0) : 0;
    const warnings = priced.filter(p => p.warning).map(p => `${p.item_no}: ${p.warning}`);
    return {
        lines: priced,
        delivery: { option: product.delivery_option, price: deliveryPrice },
        total: priced.reduce((s, p) => s + p.total, 0) + deliveryPrice,
        warnings,
        incomplete: warnings.length > 0,
    };
}
