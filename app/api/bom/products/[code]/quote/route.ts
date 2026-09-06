import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../../_lib/auth';
import { priceBom } from '../../../../../lib/bom/pricing';
import type { AvlPriceRow, BomLine } from '../../../../../lib/bom/types';

type Ctx = { params: Promise<{ code: string }> };

/** 상품 1개의 BOM을 AVL 승인 단가로 계산 */
export async function GET(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const { data: product, error: e1 } = await auth.supabase.from('products').select('product_code, width_mm, delivery_option').eq('product_code', code).maybeSingle();
    if (e1) return dbError(e1, 500);
    if (!product) return NextResponse.json({ error: '없는 상품입니다.' }, { status: 404 });
    const { data: lines, error: e2 } = await auth.supabase.from('bom_lines').select('*, items(name)').eq('product_code', code).order('level').order('item_no');
    if (e2) return dbError(e2, 500);
    const itemNos = lines.map(l => l.item_no);
    const { data: avl, error: e3 } = await auth.supabase.from('avl').select('item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps').in('item_no', itemNos);
    if (e3) return dbError(e3, 500);
    const result = priceBom(lines as BomLine[], avl as AvlPriceRow[], product);
    const nameOf = new Map(lines.map(l => [l.item_no, (l.items as { name: string } | null)?.name ?? '']));
    return NextResponse.json({ ...result, lines: result.lines.map(l => ({ ...l, name: nameOf.get(l.item_no) ?? '' })) });
}
