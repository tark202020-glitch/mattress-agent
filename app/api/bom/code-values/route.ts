// 코드표 조회 (기획안 4장). ?code_type=dev_stage 로 종류 한정
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../_lib/auth';

export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const codeType = new URL(req.url).searchParams.get('code_type');
    let query = auth.supabase.from('code_values').select('*').eq('active', true).order('code_type').order('sort_order');
    if (codeType) query = query.eq('code_type', codeType);
    const { data, error } = await query;
    if (error) return dbError(error, 500);
    return NextResponse.json(data);
}
