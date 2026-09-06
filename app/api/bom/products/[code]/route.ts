import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { pickColumns } from '../../_lib/master';
import { toTree } from '../../../../lib/bom/tree';

type Ctx = { params: Promise<{ code: string }> };
const BOM_SELECT = 'product_code, item_no, level, parent_item_no, quantity, required, alt_item_no, spec_text, dims, note, source, items(name, unit, category, revision)';

export async function GET(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const { data: product, error: e1 } = await auth.supabase.from('products').select('*').eq('product_code', code).maybeSingle();
    if (e1) return dbError(e1, 500);
    if (!product) return NextResponse.json({ error: '없는 상품입니다.' }, { status: 404 });
    const { data: lines, error: e2 } = await auth.supabase.from('bom_lines').select(BOM_SELECT).eq('product_code', code).order('level').order('item_no');
    if (e2) return dbError(e2, 500);
    return NextResponse.json({ product, lines, tree: toTree(lines) });
}

export async function PATCH(req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const row = pickColumns(await req.json(), ['name', 'family', 'status', 'launch_target_date', 'pm_id', 'cover_split_count', 'delivery_option', 'note']);
    const { data, error } = await auth.supabase.from('products').update(row).eq('product_code', code).select().maybeSingle();
    if (error) return dbError(error);
    if (!data) return NextResponse.json({ error: '없는 상품입니다.' }, { status: 404 });
    return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const { error } = await auth.supabase.from('products').delete().eq('product_code', code); // bom_lines는 cascade
    if (error) return dbError(error);
    return NextResponse.json({ ok: true });
}
