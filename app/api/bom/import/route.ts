// 엑셀 템플릿 가져오기. FK 순서: employees → vendors → items → products → bom_lines → avl → npi_status → ecn
import { NextResponse } from 'next/server';
import { requireUser } from '../_lib/auth';
import { parseTemplate } from '../../../lib/bom/excelIO';
import { synthesizeFoamDims, type ItemMeta } from '../../../lib/bom/importDims';

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
    /** 행이 있을 때만 쓰기 실행. 오류는 단계명을 붙여 throw */
    const step = async (name: string, rows: unknown[], fn: () => PromiseLike<{ error: { message: string } | null }>) => {
        if (rows.length === 0) return;
        const { error } = await fn();
        if (error) throw new Error(`${name}: ${error.message}`);
    };

    try {
        await step('code_values', b.code_values, () => sb.from('code_values').upsert(b.code_values, { onConflict: 'code_type,value', defaultToNull: false }));
        await step('employees', b.employees, () => sb.from('employees').upsert(b.employees, { onConflict: 'employee_id', defaultToNull: false }));
        await step('vendors', b.vendors, () => sb.from('vendors').upsert(b.vendors, { onConflict: 'vendor_code', defaultToNull: false }));

        // 위자드 매핑 품목(wizard_option_key 있음)은 이름을 덮어쓰지 않는다
        const { data: mapped } = await sb.from('items').select('item_no').not('wizard_option_key', 'is', null);
        const keep = new Set((mapped ?? []).map(m => m.item_no));
        const newItems = b.items.filter(i => !keep.has(i.item_no as string));
        counts.items = newItems.length;
        for (const i of b.items) if (keep.has(i.item_no as string)) log.push(`품목 ${i.item_no}: 기존 위자드 품목 유지 (템플릿 품명 "${i.name}" 무시)`);
        await step('items', newItems, () => sb.from('items').upsert(newItems, { onConflict: 'item_no', defaultToNull: false }));

        await step('products', b.products, () => sb.from('products').upsert(b.products, { onConflict: 'product_code', defaultToNull: false }));

        // 템플릿 BOM에는 치수가 없어 VOLUME 폼이 '치수 없음'으로 0원이 된다.
        // 품목의 attributes.thickness와 상품 폭·깊이로 치수를 합성한다 (나머지 줄은 그대로 두고 견적 경고로 남긴다)
        const bomItemNos = [...new Set(b.bom_lines.map(l => l.item_no as string))];
        if (bomItemNos.length) {
            const { data: meta, error } = await sb.from('items').select('item_no, subcategory, attributes').in('item_no', bomItemNos);
            if (error) throw new Error(`items(치수 합성 조회): ${error.message}`);
            b.bom_lines = synthesizeFoamDims(b.bom_lines, b.products, (meta ?? []) as ItemMeta[]);
        }

        // BOM은 상품 단위로 교체 (레벨1 → 레벨2 순서 유지)
        for (const code of [...new Set(b.bom_lines.map(l => l.product_code as string))]) {
            const lines = b.bom_lines.filter(l => l.product_code === code);
            const l1 = lines.filter(l => l.level === 1), l2 = lines.filter(l => l.level !== 1);
            await step('bom_lines(delete)', [code], () => sb.from('bom_lines').delete().eq('product_code', code));
            await step('bom_lines(level1)', l1, () => sb.from('bom_lines').insert(l1, { defaultToNull: false }));
            await step('bom_lines(level2)', l2, () => sb.from('bom_lines').insert(l2, { defaultToNull: false }));
        }
        await step('avl', b.avl, () => sb.from('avl').upsert(b.avl, { onConflict: 'item_no,vendor_code', defaultToNull: false }));
        await step('npi_status', b.npi_status, () => sb.from('npi_status').upsert(b.npi_status, { onConflict: 'product_code,item_no', defaultToNull: false }));
        await step('ecn', b.ecn, () => sb.from('ecn').upsert(b.ecn, { onConflict: 'ecn_no', defaultToNull: false }));
        await step('ecn_products', b.ecn_products, () => sb.from('ecn_products').upsert(b.ecn_products, { onConflict: 'ecn_no,product_code', defaultToNull: false }));
    } catch (e) {
        return NextResponse.json({ error: `${(e as Error).message} (이 단계 이전의 데이터는 이미 저장되었습니다. 파일을 수정한 뒤 다시 가져오면 덮어씁니다.)`, log }, { status: 400 });
    }
    for (const k of ['code_values', 'employees', 'vendors', 'products', 'bom_lines', 'avl', 'npi_status', 'ecn', 'ecn_products'] as const) counts[k] = b[k].length;
    return NextResponse.json({ log, counts });
}
