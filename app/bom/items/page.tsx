'use client';
import MasterTable, { type FieldDef } from '../_components/MasterTable';
import { Badge, Btn, Select } from '../_components/ui';
import { bomApi, errMsg } from '../../lib/bom/client';
import { ITEM_PREFIXES, PREFIX_CATEGORY } from '../../lib/bom/codes';
import { useState } from 'react';

interface Item { item_no: string; name: string; category: string; subcategory: string | null; item_type: string; spec: string | null; unit: string; revision: string; wizard_option_key: string | null; memo: string | null; [k: string]: unknown }

const FIELDS: FieldDef[] = [
    { key: 'item_no', label: '품번', required: true, placeholder: 'CV-008' },
    { key: 'name', label: '품명', required: true },
    { key: 'category', label: '대분류', type: 'select', options: { codeType: 'category' }, required: true },
    { key: 'subcategory', label: '중분류' },
    { key: 'item_type', label: '품목구분', type: 'select', options: { codeType: 'item_type' }, required: true },
    { key: 'unit', label: '단위', type: 'select', options: ['EA', 'SET', '-'] },
    { key: 'revision', label: '리비전' },
    { key: 'spec', label: '규격/사양', type: 'textarea' },
    { key: 'spec_url', label: '사양서/도면 링크' },
    { key: 'memo', label: '메모', type: 'textarea' },
];

/** 접두어 선택 → next-no로 자동 채번 (범위: 001~999, 어셈블리 000 제외) */
function NextNoHelper({ setDraft, draft }: { draft: Record<string, unknown>; setDraft: (d: Record<string, unknown>) => void }) {
    const [prefix, setPrefix] = useState('CV');
    const [err, setErr] = useState<string | null>(null);
    const fill = async () => {
        try {
            const r = await bomApi<{ item_no: string }>(`/items/next-no?prefix=${prefix}&start=1&end=999`);
            setDraft({ ...draft, item_no: r.item_no, category: PREFIX_CATEGORY[prefix as keyof typeof PREFIX_CATEGORY] });
        } catch (e) { setErr(errMsg(e)); }
    };
    return <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        <Select value={prefix} onChange={e => setPrefix(e.target.value)}>{ITEM_PREFIXES.map(p => <option key={p}>{p}</option>)}</Select>
        <Btn size="sm" type="button" onClick={fill}>자동 채번</Btn>{err && <span style={{ color: '#dc2626', fontSize: 11 }}>{err}</span>}
    </span>;
}

export default function ItemsPage() {
    return <MasterTable<Item> resource="items" pk="item_no" title="품목마스터" desc="품번은 접두어별 자동 채번을 권장합니다. 위자드 옵션과 연결된 품목은 배지로 표시됩니다."
        searchPlaceholder="품번·품명 검색" fields={FIELDS} defaultDraft={{ unit: 'EA', revision: 'A', item_type: '부품' }}
        pkHelper={(draft, setDraft) => <NextNoHelper draft={draft} setDraft={setDraft} />}
        columns={[
            { key: 'item_no', header: '품번', width: 100 },
            { key: 'name', header: '품명' },
            { key: 'category', header: '대분류', width: 90 },
            { key: 'subcategory', header: '중분류', width: 100, render: r => r.subcategory ?? '' },
            { key: 'item_type', header: '구분', width: 90 },
            { key: 'unit', header: '단위', width: 50 },
            { key: 'revision', header: 'Rev.', width: 60 },
            { key: 'wizard_option_key', header: '위자드', width: 120, render: r => r.wizard_option_key ? <Badge tone="info">{r.wizard_option_key}</Badge> : '' },
        ]} />;
}
