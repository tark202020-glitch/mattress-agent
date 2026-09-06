'use client';
import { useCallback, useEffect, useState } from 'react';
import { bomApi, errMsg } from '../../lib/bom/client';
import { invalidateAvlCache } from '../../lib/bom/useAvlPricing';
import { Card, Table, Btn, Badge, Modal, Field, TextInput, Select, Spinner, ErrorBox, PageTitle, fmtWon, C } from '../_components/ui';

interface AvlRow { item_no: string; vendor_code: string; owner_id: string | null; approval_status: string; lead_time_days: number | null; moq: number | null; unit_price: number; currency: string; approved_at: string | null; price_type: 'FIXED' | 'VOLUME' | 'WIDTH_STEP'; price_constant: number; price_base: number; price_steps: { maxWidth: number; price: number; boxSpec?: string }[] | null; note: string | null; items: { name: string; category: string } | null; vendors: { name: string } | null; employees: { name: string } | null }
interface Item { item_no: string; name: string; category: string }
interface Vendor { vendor_code: string; name: string }
interface Employee { employee_id: string; name: string }

const TONE: Record<string, 'ok' | 'warn' | 'muted' | 'danger'> = { '승인': 'ok', '샘플평가': 'warn', '후보': 'muted', '보류': 'warn', '탈락': 'danger' };
const EMPTY: Partial<AvlRow> = { approval_status: '후보', currency: 'KRW', price_type: 'FIXED', unit_price: 0, price_constant: 0, price_base: 0, price_steps: null };

export default function AvlPage() {
    const [rows, setRows] = useState<AvlRow[] | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [filterItem, setFilterItem] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState<Partial<AvlRow> | null>(null);
    const [stepsText, setStepsText] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setRows(null);
        bomApi<AvlRow[]>(`/avl${filterItem ? `?item_no=${encodeURIComponent(filterItem)}` : ''}`).then(setRows).catch(e => setError(errMsg(e)));
    }, [filterItem]);
    useEffect(load, [load]);
    useEffect(() => {
        Promise.all([bomApi<Item[]>('/items'), bomApi<Vendor[]>('/vendors'), bomApi<Employee[]>('/employees'), bomApi<{ value: string }[]>('/code-values?code_type=approval_status')])
            .then(([i, v, e, s]) => { setItems(i); setVendors(v); setEmployees(e); setStatuses(s.map(x => x.value)); }).catch(e => setError(errMsg(e)));
    }, []);

    const open = (r?: AvlRow) => { const d = r ? { ...r } : { ...EMPTY, item_no: filterItem || '' }; setDraft(d); setStepsText(d.price_steps ? JSON.stringify(d.price_steps, null, 0) : '[{"maxWidth":1100,"price":7000,"boxSpec":"Box: 1400×310×310"},{"maxWidth":99999,"price":13000}]'); };
    const set = <K extends keyof AvlRow>(k: K, v: AvlRow[K]) => setDraft(d => d && ({ ...d, [k]: v }));

    const save = async () => {
        if (!draft?.item_no || !draft.vendor_code) { setError('품번과 협력사는 필수입니다.'); return; }
        let steps: AvlRow['price_steps'] = null;
        if (draft.price_type === 'WIDTH_STEP') { try { steps = JSON.parse(stepsText); if (!Array.isArray(steps)) throw new Error(); } catch { setError('폭 구간은 JSON 배열이어야 합니다. 예: [{"maxWidth":1100,"price":7000}]'); return; } }
        setBusy(true); setError(null);
        try {
            const { items: _i, vendors: _v, employees: _e, ...body } = draft as AvlRow; // eslint-disable-line @typescript-eslint/no-unused-vars
            await bomApi('/avl', { method: 'POST', json: { ...body, price_steps: steps, approved_at: body.approved_at || null, owner_id: body.owner_id || null, lead_time_days: body.lead_time_days ?? null, moq: body.moq ?? null } });
            invalidateAvlCache(); setDraft(null); load();
        } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };
    const remove = async (r: AvlRow) => {
        if (!confirm(`${r.item_no} / ${r.vendor_code} AVL 행을 삭제할까요?`)) return;
        try { await bomApi(`/avl?item_no=${encodeURIComponent(r.item_no)}&vendor_code=${encodeURIComponent(r.vendor_code)}`, { method: 'DELETE' }); invalidateAvlCache(); load(); } catch (e) { setError(errMsg(e)); }
    };
    const priceText = (r: AvlRow) => r.price_type === 'FIXED' ? fmtWon(r.unit_price) : r.price_type === 'VOLUME' ? `W×D×H×${r.price_constant}${r.price_base ? ` + ${fmtWon(r.price_base)}` : ''}` : `폭 구간 ${r.price_steps?.length ?? 0}단계`;

    return (
        <>
            <PageTitle title="AVL — 승인 협력사·단가" desc="견적은 품번별로 '승인' 상태이면서 승인일이 가장 최근인 행의 단가를 씁니다. 치수 부품은 단가 방식 VOLUME(부피 수식)으로 등록합니다."
                right={<>
                    <Select value={filterItem} onChange={e => setFilterItem(e.target.value)} style={{ minWidth: 260 }}><option value="">전체 품목</option>{items.map(i => <option key={i.item_no} value={i.item_no}>{i.item_no} {i.name}</option>)}</Select>
                    <Btn variant="primary" onClick={() => open()}>+ AVL 행 추가</Btn>
                </>} />
            <ErrorBox error={error} />
            <Card>{!rows ? <Spinner /> : (
                <Table<AvlRow> rowKey={r => `${r.item_no}|${r.vendor_code}`} rows={rows} columns={[
                    { key: 'item_no', header: '품번', width: 90 }, { key: 'item', header: '품명', render: r => r.items?.name ?? '' },
                    { key: 'vendor', header: '협력사', render: r => `${r.vendor_code} ${r.vendors?.name ?? ''}` },
                    { key: 'owner', header: '담당', width: 70, render: r => r.employees?.name ?? '' },
                    { key: 'approval_status', header: '승인', width: 80, render: r => <Badge tone={TONE[r.approval_status] ?? 'muted'}>{r.approval_status}</Badge> },
                    { key: 'approved_at', header: '승인일', width: 100, render: r => r.approved_at ?? '' },
                    { key: 'price', header: '단가', render: r => <span>{priceText(r)} {r.currency !== 'KRW' && <Badge tone="warn">{r.currency}</Badge>}</span> },
                    { key: 'lt', header: 'L/T·MOQ', width: 90, render: r => `${r.lead_time_days ?? '-'}일 · ${r.moq ?? '-'}` },
                    { key: '_a', header: '', width: 120, align: 'right', render: r => <span style={{ display: 'inline-flex', gap: 6 }}><Btn size="sm" onClick={() => open(r)}>수정</Btn><Btn size="sm" variant="danger" onClick={() => remove(r)}>삭제</Btn></span> },
                ]} />)}</Card>

            {draft && (
                <Modal title="AVL 행" onClose={() => setDraft(null)} width={620}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="품번 *"><Select value={draft.item_no ?? ''} onChange={e => set('item_no', e.target.value)}><option value="">선택</option>{items.map(i => <option key={i.item_no} value={i.item_no}>{i.item_no} {i.name}</option>)}</Select></Field>
                        <Field label="협력사 *"><Select value={draft.vendor_code ?? ''} onChange={e => set('vendor_code', e.target.value)}><option value="">선택</option>{vendors.map(v => <option key={v.vendor_code} value={v.vendor_code}>{v.vendor_code} {v.name}</option>)}</Select></Field>
                        <Field label="사내 담당자"><Select value={draft.owner_id ?? ''} onChange={e => set('owner_id', e.target.value || null)}><option value="">없음</option>{employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.employee_id} {e.name}</option>)}</Select></Field>
                        <Field label="승인상태"><Select value={draft.approval_status ?? '후보'} onChange={e => set('approval_status', e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</Select></Field>
                        <Field label="승인일" hint="비우면 승인 시 오늘 날짜"><TextInput type="date" value={draft.approved_at ?? ''} onChange={e => set('approved_at', e.target.value || null)} /></Field>
                        <Field label="통화" hint="KRW가 아니면 견적에서 경고 처리"><Select value={draft.currency ?? 'KRW'} onChange={e => set('currency', e.target.value)}>{['KRW', 'USD', '-'].map(c => <option key={c}>{c}</option>)}</Select></Field>
                        <Field label="리드타임(일)"><TextInput type="number" value={draft.lead_time_days ?? ''} onChange={e => set('lead_time_days', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                        <Field label="MOQ"><TextInput type="number" value={draft.moq ?? ''} onChange={e => set('moq', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                        <Field label="단가 방식"><Select value={draft.price_type ?? 'FIXED'} onChange={e => set('price_type', e.target.value as AvlRow['price_type'])}><option value="FIXED">FIXED (개당 고정)</option><option value="VOLUME">VOLUME (W×D×H×상수 + 기본금)</option><option value="WIDTH_STEP">WIDTH_STEP (폭 구간표)</option></Select></Field>
                        {draft.price_type === 'FIXED' && <Field label="단가"><TextInput type="number" value={draft.unit_price ?? 0} onChange={e => set('unit_price', Number(e.target.value))} /></Field>}
                        {draft.price_type === 'VOLUME' && <>
                            <Field label="상수" hint="예: 0.0003266"><TextInput type="number" step="0.0000001" value={draft.price_constant ?? 0} onChange={e => set('price_constant', Number(e.target.value))} /></Field>
                            <Field label="기본금"><TextInput type="number" value={draft.price_base ?? 0} onChange={e => set('price_base', Number(e.target.value))} /></Field>
                        </>}
                    </div>
                    {draft.price_type === 'WIDTH_STEP' && <Field label="폭 구간 (JSON)" hint='[{"maxWidth":1100,"price":7000,"boxSpec":"Box: 1400×310×310"}, …] 마지막은 maxWidth 99999'><textarea value={stepsText} onChange={e => setStepsText(e.target.value)} rows={4} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></Field>}
                    <Field label="비고"><TextInput value={draft.note ?? ''} onChange={e => set('note', e.target.value)} /></Field>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Btn variant="ghost" onClick={() => setDraft(null)}>취소</Btn>
                        <Btn variant="primary" onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}
