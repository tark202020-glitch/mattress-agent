// 견적서 "구성" 문구: BOM 레벨2 줄을 대분류 순서로 요약
const CATEGORY_ORDER = ['폼', '스트링', '커버', '컨트롤러', '센서', '포장', 'APP'];

export const SIZE_LABEL: Record<string, string> = {
    SS: 'SS', Q_KR: 'Q', K_KR: 'K', LK: 'LK', TW: 'T', FU: 'F', Q_US: 'Q', K_US: 'K', CK: 'CK',
};

export interface SpecLineInput {
    level: number; item_no: string; quantity: number; spec_text: string | null;
    items: { name: string; category: string } | null;
}

export function specLines(lines: SpecLineInput[]): string[] {
    const byCat = new Map<string, string[]>();
    for (const l of lines) {
        if (l.level !== 2 || !l.items) continue;
        const qty = l.quantity > 1 ? ` ×${l.quantity}` : '';
        // 치수는 스트링(코어)만 표기. 폼·커버는 사이즈별로 달라 생략
        const spec = l.items.category === '스트링' && l.spec_text ? ` (${l.spec_text})` : '';
        if (!byCat.has(l.items.category)) byCat.set(l.items.category, []);
        byCat.get(l.items.category)!.push(`${l.items.name}${qty}${spec}`);
    }
    return CATEGORY_ORDER.filter(c => byCat.has(c)).map(c => `- ${c}: ${byCat.get(c)!.join(', ')}`);
}
