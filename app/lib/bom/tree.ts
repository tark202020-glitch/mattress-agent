// BOM 평면 줄 → 2단계 트리
export function toTree<T extends { level: number; item_no: string; parent_item_no: string | null }>(lines: T[]): (T & { children: T[] })[] {
    const roots: (T & { children: T[] })[] = [];
    const byNo = new Map<string, T & { children: T[] }>();
    for (const l of lines) if (l.level === 1) { const n = { ...l, children: [] as T[] }; roots.push(n); byNo.set(l.item_no, n); }
    for (const l of lines) if (l.level !== 1) {
        const p = l.parent_item_no ? byNo.get(l.parent_item_no) : undefined;
        if (p) p.children.push(l); else roots.push({ ...l, children: [] });
    }
    return roots;
}
