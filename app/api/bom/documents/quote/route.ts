// 모델(model_code)의 사이즈 상품 전체로 견적서 xlsx 생성 → Storage 저장 → documents 기록
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { priceBom } from '../../../../lib/bom/pricing';
import { topFoamHeight } from '../../../../lib/bom/bomBuilder';
import { specLines, SIZE_LABEL } from '../../../../lib/bom/quoteSpecs';
import { fillQuoteTemplate } from '../../../../lib/bom/quoteXlsx';
import { CORE_DEFAULT_HEIGHT } from '../../../../lib/constants';
import type { AvlPriceRow, BomLine } from '../../../../lib/bom/types';

interface Condition { laborRate: number; materialRate: number; salesRate: number; marginRate: number }
interface Body { model_code: string; title?: string; condition?: Condition }

export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const body = (await req.json()) as Body;
    if (!body.model_code) return NextResponse.json({ error: 'model_code는 필수입니다.' }, { status: 400 });

    const { data: products, error: e1 } = await auth.supabase.from('products').select('*').eq('model_code', body.model_code).order('width_mm');
    if (e1) return dbError(e1, 500);
    if (!products?.length) return NextResponse.json({ error: '해당 모델의 상품이 없습니다.' }, { status: 404 });

    const codes = products.map(p => p.product_code);
    const { data: allLines, error: e2 } = await auth.supabase.from('bom_lines').select('*, items:items!bom_lines_item_no_fkey(name, category, subcategory)').in('product_code', codes).order('level').order('item_no');
    if (e2) return dbError(e2, 500);
    const { data: avl, error: e3 } = await auth.supabase.from('avl').select('item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps, currency').in('item_no', [...new Set(allLines.map(l => l.item_no))]);
    if (e3) return dbError(e3, 500);

    const cond = body.condition;
    const applyCondition = (cost: number) => {
        if (!cond) return cost;
        const subtotal = cost * (1 + (cond.laborRate + cond.materialRate + cond.salesRate) / 100);
        return Math.round(subtotal * (1 + cond.marginRate / 100));
    };

    const warnings: string[] = [];
    const sizes = products.map(p => {
        const lines = allLines.filter(l => l.product_code === p.product_code) as (BomLine & { items: { name: string; category: string; subcategory: string | null } | null })[];
        const q = priceBom(lines, avl as AvlPriceRow[], p);
        warnings.push(...q.warnings.map(w => `${p.product_code} ${w}`));
        const snap = (p.design_snapshot ?? {}) as { topFoamEnabled?: boolean; topFoamOptionId?: string | null; bottomFoamEnabled?: boolean; bottomFoamThickness?: number };
        const h = (snap.topFoamEnabled ? topFoamHeight(snap.topFoamOptionId ?? null) : 0) + CORE_DEFAULT_HEIGHT + (snap.bottomFoamEnabled ? (snap.bottomFoamThickness ?? 0) : 0);
        return { product_code: p.product_code, label: SIZE_LABEL[p.size_preset_id] ?? p.size_preset_id, w: p.width_mm, d: p.depth_mm, h, price: applyCondition(q.total), lines };
    });

    const first = sizes[0];
    const coverLine = first.lines.find(l => l.level === 2 && l.items?.subcategory === '커버');
    const title = body.title ?? products[0].name;
    const buffer = await fillQuoteTemplate({
        coverName: coverLine?.items?.name ?? '미선택',
        title,
        specsList: specLines(first.lines),
        sizeData: sizes.map(({ label, w, d, h, price }) => ({ label, w, d, h, price })),
    });

    // Storage 저장 + documents 기록
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filePath = `quote/${body.model_code}/${stamp}.xlsx`;
    const { error: e4 } = await auth.supabase.storage.from('documents').upload(filePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: false,
    });
    if (e4) return NextResponse.json({ error: `문서 저장 실패: ${e4.message}` }, { status: 500 });
    const { data: doc, error: e5 } = await auth.supabase.from('documents').insert({
        doc_type: 'quote', model_code: body.model_code, product_codes: codes, file_path: filePath,
        total_price: sizes.reduce((s, x) => s + x.price, 0), created_by: auth.user.id,
    }).select('doc_id').single();
    if (e5) return dbError(e5, 500);
    const { data: signed } = await auth.supabase.storage.from('documents').createSignedUrl(filePath, 60 * 10);
    return NextResponse.json({
        doc_id: doc.doc_id, url: signed?.signedUrl ?? null, file_path: filePath, warnings,
        sizes: sizes.map(({ product_code, label, price }) => ({ product_code, label, price })),
    }, { status: 201 });
}
