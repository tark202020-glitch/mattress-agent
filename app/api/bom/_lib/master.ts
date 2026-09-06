// ============================================================
// 마스터 테이블 CRUD 핸들러 팩토리 (items/vendors/employees 공용)
// ============================================================
import { NextResponse } from 'next/server';
import { requireUser, dbError } from './auth';

export interface MasterConfig {
    table: string;
    pk: string;
    columns: string[];        // 쓰기 허용 컬럼 (pk 포함)
    searchColumns?: string[]; // ?q= 검색 대상
    orderBy?: string;
    validate?: (row: Record<string, unknown>, isCreate: boolean) => string | null; // 오류 메시지 또는 null
}

export function pickColumns(body: Record<string, unknown>, columns: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const c of columns) if (body[c] !== undefined) out[c] = body[c];
    return out;
}

/** PostgREST or= 필터 구분자(쉼표·괄호)를 제거한 검색어. 비어 있으면 null */
export function sanitizeSearch(q: string | null): string | null {
    if (!q) return null;
    const s = q.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length ? s : null;
}

type Ctx = { params: Promise<{ id: string }> };

export function masterHandlers(cfg: MasterConfig) {
    const order = cfg.orderBy ?? cfg.pk;

    async function list(req: Request) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const url = new URL(req.url);
        const q = sanitizeSearch(url.searchParams.get('q'));
        let query = auth.supabase.from(cfg.table).select('*').order(order);
        // 단순 동등 필터: ?category=폼 처럼 컬럼명=값
        for (const [k, v] of url.searchParams) {
            if (k !== 'q' && cfg.columns.includes(k)) query = query.eq(k, v);
        }
        if (q && cfg.searchColumns?.length) {
            query = query.or(cfg.searchColumns.map(c => `${c}.ilike.%${q}%`).join(','));
        }
        const { data, error } = await query;
        if (error) return dbError(error, 500);
        return NextResponse.json(data);
    }

    async function create(req: Request) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const row = pickColumns(await req.json(), cfg.columns);
        if (!row[cfg.pk]) return NextResponse.json({ error: `${cfg.pk}는 필수입니다.` }, { status: 400 });
        const msg = cfg.validate?.(row, true);
        if (msg) return NextResponse.json({ error: msg }, { status: 400 });
        const { data, error } = await auth.supabase.from(cfg.table).insert(row).select().single();
        if (error) return dbError(error, error.code === '23505' ? 409 : 400);
        return NextResponse.json(data, { status: 201 });
    }

    async function get(_req: Request, { params }: Ctx) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const { id } = await params;
        const { data, error } = await auth.supabase.from(cfg.table).select('*').eq(cfg.pk, id).maybeSingle();
        if (error) return dbError(error, 500);
        if (!data) return NextResponse.json({ error: '없는 항목입니다.' }, { status: 404 });
        return NextResponse.json(data);
    }

    async function update(req: Request, { params }: Ctx) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const { id } = await params;
        const row = pickColumns(await req.json(), cfg.columns.filter(c => c !== cfg.pk));
        const msg = cfg.validate?.(row, false);
        if (msg) return NextResponse.json({ error: msg }, { status: 400 });
        const { data, error } = await auth.supabase.from(cfg.table).update(row).eq(cfg.pk, id).select().maybeSingle();
        if (error) return dbError(error);
        if (!data) return NextResponse.json({ error: '없는 항목입니다.' }, { status: 404 });
        return NextResponse.json(data);
    }

    async function remove(_req: Request, { params }: Ctx) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const { id } = await params;
        const { error } = await auth.supabase.from(cfg.table).delete().eq(cfg.pk, id);
        // 23503 = FK 위반 (참조 중)
        if (error) return dbError(error, error.code === '23503' ? 409 : 400);
        return NextResponse.json({ ok: true });
    }

    return { list, create, get, update, remove };
}
