import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { ITEM_PREFIXES } from '../../../../lib/bom/codes';

export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    const prefix = u.searchParams.get('prefix') ?? '';
    const start = parseInt(u.searchParams.get('start') ?? '1', 10);
    const end = parseInt(u.searchParams.get('end') ?? '999', 10);
    if (!(ITEM_PREFIXES as string[]).includes(prefix)) return NextResponse.json({ error: `prefix는 ${ITEM_PREFIXES.join('/')} 중 하나` }, { status: 400 });
    const { data, error } = await auth.supabase.rpc('next_item_no', { p_prefix: prefix, p_start: start, p_end: end });
    if (error) return dbError(error, 500);
    return NextResponse.json({ item_no: data });
}
