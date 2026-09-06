// ============================================================
// 엑셀로 가져온 BOM 줄의 폼 치수 합성 (기획안 6장)
// 템플릿에는 치수 칸이 없어 VOLUME 폼이 0원("치수 없음")이 된다.
// 품목의 attributes.thickness와 상품 폭·깊이로 치수를 만들어 준다. 순수 함수.
// ============================================================
type Row = Record<string, unknown>;

/** items 중 치수 합성에 쓰는 컬럼 */
export interface ItemMeta {
    item_no: string;
    category?: string | null;
    attributes?: Record<string, unknown> | null;
}

export function synthesizeFoamDims(lines: Row[], products: Row[], itemMeta: ItemMeta[]): Row[] {
    const thicknessOf = new Map<string, number>();
    for (const m of itemMeta) {
        const t = m.attributes?.thickness;
        if (typeof t === 'number' && Number.isFinite(t)) thicknessOf.set(m.item_no, t);
    }
    const sizeOf = new Map(products.map(p => [p.product_code as string, p]));

    return lines.map(l => {
        if (l.level !== 2 || l.dims) return l;
        const h = thicknessOf.get(l.item_no as string);
        const p = sizeOf.get(l.product_code as string);
        if (h === undefined || !p) return l;
        const w = Number(p.width_mm), d = Number(p.depth_mm);
        if (!w || !d) return l;
        return { ...l, dims: [{ w, d, h, qty: Number(l.quantity) || 1 }], spec_text: `${w}×${d}×${h}` };
    });
}
