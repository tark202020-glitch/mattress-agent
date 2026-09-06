import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../_lib/auth';
import { pickColumns } from '../_lib/master';

const COLS = ['item_no', 'vendor_code', 'owner_id', 'approval_status', 'lead_time_days', 'moq', 'unit_price', 'currency', 'approved_at', 'price_type', 'price_constant', 'price_base', 'price_steps', 'note'];
const SELECT = '*, items(name, category), vendors(name), employees(name)';

export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    let q = auth.supabase.from('avl').select(SELECT).order('item_no').order('vendor_code');
    const itemNo = u.searchParams.get('item_no');
    const vendor = u.searchParams.get('vendor_code');
    if (itemNo) q = q.eq('item_no', itemNo);
    if (vendor) q = q.eq('vendor_code', vendor);
    const { data, error } = await q;
    if (error) return dbError(error, 500);
    return NextResponse.json(data);
}

/** POST = upsert (item_no, vendor_code) */
export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const row = pickColumns(await req.json(), COLS);
    if (!row.item_no || !row.vendor_code) return NextResponse.json({ error: 'item_no, vendor_code는 필수입니다.' }, { status: 400 });
    if (row.price_type !== undefined && !['FIXED', 'VOLUME', 'WIDTH_STEP'].includes(String(row.price_type))) return NextResponse.json({ error: 'price_type은 FIXED/VOLUME/WIDTH_STEP' }, { status: 400 });
    if (row.price_type === 'WIDTH_STEP' && !Array.isArray(row.price_steps)) return NextResponse.json({ error: 'WIDTH_STEP은 price_steps 배열이 필요합니다.' }, { status: 400 });
    if (row.approval_status === '승인' && !row.approved_at) row.approved_at = new Date().toISOString().slice(0, 10);
    const { data, error } = await auth.supabase.from('avl').upsert(row, { onConflict: 'item_no,vendor_code' }).select(SELECT).single();
    if (error) return dbError(error);
    return NextResponse.json(data);
}

export async function DELETE(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    const itemNo = u.searchParams.get('item_no'), vendor = u.searchParams.get('vendor_code');
    if (!itemNo || !vendor) return NextResponse.json({ error: 'item_no, vendor_code 쿼리가 필요합니다.' }, { status: 400 });
    const { error } = await auth.supabase.from('avl').delete().eq('item_no', itemNo).eq('vendor_code', vendor);
    if (error) return dbError(error);
    return NextResponse.json({ ok: true });
}
