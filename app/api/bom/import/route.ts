// 엑셀 템플릿 가져오기. FK 순서: employees → vendors → items → products → bom_lines → avl → npi_status → ecn
import { NextResponse } from 'next/server';
import { requireUser } from '../_lib/auth';
import { parseTemplate } from '../../../lib/bom/excelIO';

export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'file(xlsx)이 필요합니다.' }, { status: 400 });
    const sizeId = String(form.get('size_preset_id') ?? 'LK');

    let b;
    try { b = parseTemplate(Buffer.from(await file.arrayBuffer()), { size_preset_id: sizeId }); }
    catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

    const sb = auth.supabase;
    const counts: Record<string, number> = {};
    const log = [...b.log];
    const step = async (name: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
        const { error } = await fn();
        if (error) throw new Error(`${name}: ${error.message}`);
    };

    try {
        await step('code_values', () => sb.from('code_values').upsert(b.code_values, { onConflict: 'code_type,value' }));
        await step('employees', () => sb.from('employees').upsert(b.employees, { onConflict: 'employee_id' }));
        await step('vendors', () => sb.from('vendors').upsert(b.vendors, { onConflict: 'vendor_code' }));

        // 위자드 매핑 품목(wizard_option_key 있음)은 이름을 덮어쓰지 않는다
        const { data: mapped } = await sb.from('items').select('item_no').not('wizard_option_key', 'is', null);
        const keep = new Set((mapped ?? []).map(m => m.item_no));
        const newItems = b.items.filter(i => !keep.has(i.item_no as string));
        for (const i of b.items) if (keep.has(i.item_no as string)) log.push(`품목 ${i.item_no}: 기존 위자드 품목 유지 (템플릿 품명 "${i.name}" 무시)`);
        await step('items', () => sb.from('items').upsert(newItems, { onConflict: 'item_no' }));
        counts.items = newItems.length;

        await step('products', () => sb.from('products').upsert(b.products, { onConflict: 'product_code' }));
        // BOM은 상품 단위로 교체 (레벨1 → 레벨2 순서 유지)
        for (const code of [...new Set(b.bom_lines.map(l => l.product_code as string))]) {
            await step('bom_lines(delete)', () => sb.from('bom_lines').delete().eq('product_code', code));
            const lines = b.bom_lines.filter(l => l.product_code === code);
            await step('bom_lines(level1)', () => sb.from('bom_lines').insert(lines.filter(l => l.level === 1)));
            await step('bom_lines(level2)', () => sb.from('bom_lines').insert(lines.filter(l => l.level !== 1)));
        }
        await step('avl', () => sb.from('avl').upsert(b.avl, { onConflict: 'item_no,vendor_code' }));
        await step('npi_status', () => sb.from('npi_status').upsert(b.npi_status, { onConflict: 'product_code,item_no' }));
        await step('ecn', () => sb.from('ecn').upsert(b.ecn, { onConflict: 'ecn_no' }));
        await step('ecn_products', () => sb.from('ecn_products').upsert(b.ecn_products, { onConflict: 'ecn_no,product_code' }));
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message, log }, { status: 400 });
    }
    for (const k of ['employees', 'vendors', 'products', 'bom_lines', 'avl', 'npi_status', 'ecn'] as const) counts[k] = b[k].length;
    return NextResponse.json({ log, counts });
}
