'use client';
// AVL 행을 한 번 받아 두고, 위자드 상태를 그 자리에서 견적으로 계산하는 훅
import { useCallback, useEffect, useState } from 'react';
import { bomApi, errMsg } from './client';
import { buildBom } from './bomBuilder';
import { priceBom } from './pricing';
import type { AvlPriceRow, BomDesignInput, QuoteResult, SizeSpec } from './types';

let cache: AvlPriceRow[] | null = null;
let inflight: Promise<AvlPriceRow[]> | null = null;

async function loadRows(force = false): Promise<AvlPriceRow[]> {
    if (cache && !force) return cache;
    if (!inflight) {
        inflight = bomApi<AvlPriceRow[]>('/avl').then(r => { cache = r; inflight = null; return r; }).catch(e => { inflight = null; throw e; });
    }
    return inflight;
}

export function useAvlPricing() {
    const [rows, setRows] = useState<AvlPriceRow[] | null>(cache);
    const [error, setError] = useState<string | null>(null);
    const reload = useCallback((force = true) => { loadRows(force).then(setRows).catch(e => setError(errMsg(e))); }, []);
    useEffect(() => { if (!cache) reload(false); }, [reload]);
    return { rows, error, reload };
}

/** 위자드 상태 + 사이즈 → 견적 (저장 전 미리보기용). 배송은 deliveryId로 */
export function quoteFromDesign(design: BomDesignInput & { deliveryId: string | null }, size: SizeSpec, avlRows: AvlPriceRow[]): QuoteResult & { unmapped: { step: string; optionKey: string }[] } {
    const { lines, unmapped } = buildBom(design, size);
    return { ...priceBom(lines, avlRows, { width_mm: size.width_mm, delivery_option: design.deliveryId }), unmapped };
}

/** AVL 편집 후 호출: 다음 사용 시 다시 받는다 */
export function invalidateAvlCache() { cache = null; }
