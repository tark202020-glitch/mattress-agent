'use client';
// 마스터 CRUD 공용 표 + 생성/수정 모달. 옵션은 code-values에서 가져올 수 있다.
import React, { useCallback, useEffect, useState } from 'react';
import { bomApi, errMsg, ApiError } from '../../lib/bom/client';
import { Card, Table, Btn, Modal, Field, TextInput, Select, Spinner, ErrorBox, PageTitle, type Column } from './ui';

export interface FieldDef { key: string; label: string; type?: 'text' | 'number' | 'select' | 'textarea'; options?: string[] | { codeType: string }; required?: boolean; readonlyOnEdit?: boolean; placeholder?: string }
type Row = Record<string, unknown>;

interface Props<T extends Row> {
    resource: 'items' | 'vendors' | 'employees'; pk: string; title: string; desc?: string;
    fields: FieldDef[]; columns: Column<T>[]; searchPlaceholder?: string;
    /** 생성 모달에서 pk 필드 옆에 붙는 버튼(예: 자동 채번) */
    pkHelper?: (draft: Row, setDraft: (d: Row) => void) => React.ReactNode;
    defaultDraft?: Row;
}

export default function MasterTable<T extends Row>({ resource, pk, title, desc, fields, columns, searchPlaceholder = '검색', pkHelper, defaultDraft = {} }: Props<T>) {
    const [rows, setRows] = useState<T[] | null>(null);
    const [q, setQ] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ mode: 'create' | 'edit'; draft: Row } | null>(null);
    const [codes, setCodes] = useState<Record<string, string[]>>({});
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        bomApi<T[]>(`/${resource}${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows).catch(e => setError(errMsg(e)));
    }, [resource, q]);
    useEffect(load, [load]);

    // select 옵션 중 code-values 참조 로드
    useEffect(() => {
        const types = fields.flatMap(f => (f.options && !Array.isArray(f.options) ? [f.options.codeType] : []));
        Promise.all([...new Set(types)].map(t => bomApi<{ value: string }[]>(`/code-values?code_type=${t}`).then(v => [t, v.map(x => x.value)] as const)))
            .then(pairs => setCodes(Object.fromEntries(pairs))).catch(() => { /* 옵션 없이 텍스트 입력으로 대체 */ });
    }, [fields]);

    const submit = async () => {
        if (!editing) return;
        const d = editing.draft;
        for (const f of fields) if (f.required && (d[f.key] === undefined || d[f.key] === '')) { setError(`${f.label}은(는) 필수입니다.`); return; }
        setBusy(true); setError(null);
        try {
            if (editing.mode === 'create') await bomApi(`/${resource}`, { method: 'POST', json: d });
            else await bomApi(`/${resource}/${encodeURIComponent(String(d[pk]))}`, { method: 'PATCH', json: d });
            setEditing(null); load();
        } catch (e) { setError(e instanceof ApiError && e.status === 409 ? '이미 존재하는 코드입니다.' : errMsg(e)); }
        finally { setBusy(false); }
    };

    const remove = async (row: T) => {
        if (!confirm(`${String(row[pk])} 을(를) 삭제할까요?`)) return;
        try { await bomApi(`/${resource}/${encodeURIComponent(String(row[pk]))}`, { method: 'DELETE' }); load(); }
        catch (e) { setError(e instanceof ApiError && e.status === 409 ? '다른 데이터가 참조하고 있어 삭제할 수 없습니다.' : errMsg(e)); }
    };

    const renderField = (f: FieldDef) => {
        const d = editing!.draft;
        const val = (d[f.key] ?? '') as string | number;
        const set = (v: unknown) => setEditing(e => e && ({ ...e, draft: { ...e.draft, [f.key]: v } }));
        const ro = editing!.mode === 'edit' && (f.key === pk || f.readonlyOnEdit);
        const opts = Array.isArray(f.options) ? f.options : f.options ? codes[f.options.codeType] : undefined;
        return (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {f.type === 'select' && opts ? (
                        <Select value={String(val)} onChange={e => set(e.target.value)} disabled={ro} style={{ flex: 1 }}><option value="">선택</option>{opts.map(o => <option key={o}>{o}</option>)}</Select>
                    ) : f.type === 'textarea' ? (
                        <textarea value={String(val)} onChange={e => set(e.target.value)} rows={3} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                    ) : (
                        <TextInput type={f.type === 'number' ? 'number' : 'text'} value={String(val)} placeholder={f.placeholder} disabled={ro} onChange={e => set(f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} style={{ flex: 1 }} />
                    )}
                    {f.key === pk && editing!.mode === 'create' && pkHelper?.(d, nd => setEditing(e => e && ({ ...e, draft: nd })))}
                </div>
            </Field>
        );
    };

    return (
        <>
            <PageTitle title={title} desc={desc} right={<>
                <TextInput placeholder={searchPlaceholder} value={q} onChange={e => setQ(e.target.value)} style={{ width: 220 }} />
                <Btn variant="primary" onClick={() => setEditing({ mode: 'create', draft: { ...defaultDraft } })}>+ 추가</Btn>
            </>} />
            <ErrorBox error={error} />
            <Card>
                {!rows ? <Spinner /> : (
                    <Table<T> rowKey={r => String(r[pk])} rows={rows} columns={[...columns, {
                        key: '_actions', header: '', width: 120, align: 'right', render: r => (
                            <span style={{ display: 'inline-flex', gap: 6 }}>
                                <Btn size="sm" onClick={() => setEditing({ mode: 'edit', draft: { ...r } })}>수정</Btn>
                                <Btn size="sm" variant="danger" onClick={() => remove(r)}>삭제</Btn>
                            </span>) }]} />
                )}
            </Card>
            {editing && (
                <Modal title={editing.mode === 'create' ? `${title} 추가` : `${title} 수정 — ${String(editing.draft[pk])}`} onClose={() => setEditing(null)} width={560}>
                    <div style={{ display: 'grid', gap: 12 }}>{fields.map(renderField)}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Btn variant="ghost" onClick={() => setEditing(null)}>취소</Btn>
                        <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}
