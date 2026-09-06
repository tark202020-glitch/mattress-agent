// 위자드 상태 + 사이즈 목록 → 사이즈별 상품 + BOM 원자 생성
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { buildBom } from '../../../../lib/bom/bomBuilder';
import type { BomDesignInput, SizeSpec } from '../../../../lib/bom/types';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Body {
    model_code?: string;
    name: string;
    family?: string;
    pm_id?: string;
    sizes: SizeSpec[];
    design: BomDesignInput & { deliveryId: string | null };
    snapshot: unknown;   // useDesignStore 전체 상태 (재오픈용)
}

/** MAT-### 다음 번호. 숫자 접미어만 대상으로 최대값 + 1 */
async function nextModelCode(supabase: SupabaseClient) {
    const { data } = await supabase.from('products').select('model_code').like('model_code', 'MAT-%');
    let max = 0;
    for (const row of data ?? []) {
        const m = /^MAT-(\d+)$/.exec(String(row.model_code));
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `MAT-${String(max + 1).padStart(3, '0')}`;
}

export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const body = (await req.json()) as Body;

    if (!body.name?.trim()) return NextResponse.json({ error: '상품명은 필수입니다.' }, { status: 400 });
    if (!Array.isArray(body.sizes) || body.sizes.length === 0) return NextResponse.json({ error: '사이즈를 1개 이상 선택하세요.' }, { status: 400 });
    for (const s of body.sizes) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(s.size_preset_id) || !(s.width_mm > 0) || !(s.depth_mm > 0)) {
            return NextResponse.json({ error: `사이즈 형식 오류: ${JSON.stringify(s)}` }, { status: 400 });
        }
    }
    if (body.model_code && !/^[A-Z0-9]+-[A-Z0-9]+$/.test(body.model_code)) return NextResponse.json({ error: '모델코드 형식 오류 (예: MAT-001)' }, { status: 400 });

    const model_code = body.model_code ?? await nextModelCode(auth.supabase);
    const built = body.sizes.map(s => ({ size: s, ...buildBom(body.design, s) }));
    const unmapped = built[0].unmapped;

    const p_products = built.map(({ size, lines }) => ({
        product_code: `${model_code}-${size.size_preset_id}`,
        model_code, name: body.name.trim(), family: body.family ?? null, status: '기획', pm_id: body.pm_id ?? null,
        cover_split_count: 2,
        size_preset_id: size.size_preset_id, width_mm: size.width_mm, depth_mm: size.depth_mm,
        is_dual: body.design.isDual, delivery_option: body.design.deliveryId,
        design_snapshot: body.snapshot ?? null,
        note: unmapped.length ? `품번 미발급 옵션: ${unmapped.map(u => `${u.step}=${u.optionKey}`).join(', ')}` : null,
        bom_lines: lines,
    }));

    const { data, error } = await auth.supabase.rpc('bom_create_products', { p_products });
    if (error) return dbError(error, error.code === '23505' ? 409 : 400);
    return NextResponse.json({ product_codes: data, model_code, unmapped }, { status: 201 });
}
