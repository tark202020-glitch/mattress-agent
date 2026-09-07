'use client';
// 모델(model_code) 전체 사이즈 견적서 xlsx 생성 — 조건(노무·재료·판매·마진 %) 입력 후 서버에서 생성·Storage 저장
import { useEffect, useMemo, useState } from 'react';
import { bomApi, errMsg } from '../../../lib/bom/client';
import { Modal, Field, TextInput, Btn, ErrorBox, Table, fmtWon, C } from '../../_components/ui';

interface Condition { laborRate: number; materialRate: number; salesRate: number; marginRate: number }
interface SizeCost { product_code: string; label: string; cost: number; incomplete: boolean }
interface Props { modelCode: string; title: string; onClose: () => void }

export default function QuoteDialog({ modelCode, title, onClose }: Props) {
    const [cond, setCond] = useState<Condition>({ laborRate: 0, materialRate: 0, salesRate: 0, marginRate: 0 });
    const [costs, setCosts] = useState<SizeCost[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ url: string | null; file_path: string; warnings: string[] } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const groups = await bomApi<{ model_code: string; products: { product_code: string; size_preset_id: string }[] }[]>(`/products?model_code=${encodeURIComponent(modelCode)}`);
                const prods = groups[0]?.products ?? [];
                const quotes = await Promise.all(prods.map(p => bomApi<{ total: number; incomplete: boolean }>(`/products/${p.product_code}/quote`)));
                setCosts(prods.map((p, i) => ({ product_code: p.product_code, label: p.size_preset_id, cost: quotes[i].total, incomplete: quotes[i].incomplete })));
            } catch (e) { setError(errMsg(e)); }
        })();
    }, [modelCode]);

    const finalOf = useMemo(() => (cost: number) => Math.round(cost * (1 + (cond.laborRate + cond.materialRate + cond.salesRate) / 100) * (1 + cond.marginRate / 100)), [cond]);
    const set = (k: keyof Condition) => (e: React.ChangeEvent<HTMLInputElement>) => setCond(c => ({ ...c, [k]: parseFloat(e.target.value) || 0 }));

    const generate = async () => {
        setBusy(true); setError(null);
        try {
            const r = await bomApi<{ url: string | null; file_path: string; warnings: string[] }>('/documents/quote', { method: 'POST', json: { model_code: modelCode, title, condition: cond } });
            setResult(r);
            if (r.url) window.open(r.url, '_blank');
        } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };

    return (
        <Modal title={`📊 견적서 생성 — ${modelCode}`} onClose={onClose}>
            <p style={{ fontSize: 12, color: C.sub, margin: '0 0 12px' }}>모델의 모든 사이즈가 한 장에 들어갑니다. 원가는 AVL 승인 단가 기준이며 아래 비율을 적용한 금액이 견적서에 기록됩니다.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                <Field label="노무비율 %"><TextInput type="number" value={cond.laborRate} onChange={set('laborRate')} /></Field>
                <Field label="재료비율 %"><TextInput type="number" value={cond.materialRate} onChange={set('materialRate')} /></Field>
                <Field label="판매비율 %"><TextInput type="number" value={cond.salesRate} onChange={set('salesRate')} /></Field>
                <Field label="마진율 %"><TextInput type="number" value={cond.marginRate} onChange={set('marginRate')} /></Field>
            </div>
            <ErrorBox error={error} />
            {costs && <Table<SizeCost> rowKey={c => c.product_code} rows={costs} columns={[
                { key: 'label', header: '사이즈' }, { key: 'product_code', header: '상품코드' },
                { key: 'cost', header: '원가', align: 'right', render: c => fmtWon(c.cost) },
                { key: 'final', header: '견적가', align: 'right', render: c => <b>{fmtWon(finalOf(c.cost))}</b> },
                { key: 'incomplete', header: '', render: c => c.incomplete ? <span style={{ color: '#b45309', fontSize: 11 }}>⚠ 불완전</span> : '' },
            ]} />}
            {result && <div style={{ marginTop: 12, fontSize: 12, color: C.green }}>저장됨: {result.file_path} {result.url && <a href={result.url} target="_blank" rel="noreferrer" style={{ color: C.primary, marginLeft: 8 }}>다시 열기</a>}{result.warnings.length > 0 && <div style={{ color: '#b45309', marginTop: 4 }}>경고 {result.warnings.length}건이 포함되어 있습니다.</div>}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn variant="ghost" onClick={onClose}>닫기</Btn>
                <Btn variant="primary" onClick={generate} disabled={busy || !costs}>{busy ? '생성 중…' : '견적서 xlsx 생성'}</Btn>
            </div>
        </Modal>
    );
}
