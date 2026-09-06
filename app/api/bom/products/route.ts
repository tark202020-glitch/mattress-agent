import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../_lib/auth';

/** GET /api/bom/products?model_code=MAT-001&status=개발 → model_code로 그룹 */
export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    let q = auth.supabase.from('products')
        .select('product_code, model_code, name, family, status, launch_target_date, pm_id, size_preset_id, width_mm, depth_mm, is_dual, delivery_option, created_at, updated_at')
        .order('model_code').order('width_mm');
    const model = u.searchParams.get('model_code');
    const status = u.searchParams.get('status');
    if (model) q = q.eq('model_code', model);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return dbError(error, 500);
    const groups = new Map<string, typeof data>();
    for (const p of data) {
        if (!groups.has(p.model_code)) groups.set(p.model_code, []);
        groups.get(p.model_code)!.push(p);
    }
    return NextResponse.json([...groups.entries()].map(([model_code, products]) => ({ model_code, products })));
}
