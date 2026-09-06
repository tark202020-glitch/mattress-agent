import { NextResponse } from 'next/server';
import { requireUser } from '../_lib/auth';
import { buildExportWorkbook } from '../../../lib/bom/excelIO';

export async function GET() {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const sb = auth.supabase;
    const pull = async (table: string, order: string) => {
        const { data, error } = await sb.from(table).select('*').order(order);
        if (error) throw new Error(`${table}: ${error.message}`);
        return data;
    };
    try {
        const [employees, vendors, items, products, bom_lines, avl, npi_status, ecn, ecn_products, code_values, progress] = await Promise.all([
            pull('employees', 'employee_id'), pull('vendors', 'vendor_code'), pull('items', 'item_no'), pull('products', 'product_code'),
            sb.from('bom_lines').select('*').order('product_code').order('level').order('item_no').then(r => { if (r.error) throw new Error(r.error.message); return r.data; }),
            pull('avl', 'item_no'), pull('npi_status', 'product_code'), pull('ecn', 'ecn_no'), pull('ecn_products', 'ecn_no'),
            sb.from('code_values').select('*').order('code_type').order('sort_order').then(r => { if (r.error) throw new Error(r.error.message); return r.data; }),
            pull('v_product_progress', 'product_code'),
        ]);
        const buf = await buildExportWorkbook({ employees, vendors, items, products, bom_lines, avl, npi_status, ecn, ecn_products, code_values, progress });
        const stamp = new Date().toISOString().slice(0, 10);
        return new NextResponse(new Uint8Array(buf), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="BOM_export_${stamp}.xlsx"`,
            },
        });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
