'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bomApi, errMsg } from '../../../lib/bom/client';
import type { QuoteResult, PricedLine } from '../../../lib/bom/types';
import { Card, Table, Badge, Btn, Spinner, ErrorBox, PageTitle, fmtWon, C } from '../../_components/ui';
import QuoteDialog from './QuoteDialog';
import { useDesignStore, type DesignState } from '../../../lib/store';

export interface BomLineRow { product_code: string; item_no: string; level: number; parent_item_no: string | null; quantity: number; required: string; alt_item_no: string | null; spec_text: string | null; note: string | null; source: string; items: { name: string; unit: string; category: string; revision: string } | null }
export interface ProductRow { product_code: string; model_code: string; name: string; family: string | null; status: string; size_preset_id: string; width_mm: number; depth_mm: number; is_dual: boolean; delivery_option: string | null; design_snapshot: unknown; note: string | null; cover_split_count: number }
export interface ProductDetail { product: ProductRow; lines: BomLineRow[]; tree: (BomLineRow & { children: BomLineRow[] })[] }
type Quote = QuoteResult & { lines: (PricedLine & { name: string })[] };

/** 위자드 스냅샷(lightSnapshot으로 이미지·텍스처가 빠진 상태)에 기본값을 채워 loadFromPreset에 넘길 상태로 복원한다 */
const EMPTY_TEX = { top: null, front: null, side: null };
export function restoreSnapshot(snap: Record<string, unknown>, p: ProductRow): Omit<DesignState, 'currentStep'> {
    return {
        ...(snap as unknown as Omit<DesignState, 'currentStep'>),
        title: p.name, sizePresetId: p.size_preset_id, customWidth: p.width_mm, customDepth: p.depth_mm, isDual: p.is_dual,
        customCoverImages: {}, upperCoverTextures: EMPTY_TEX, lowerCoverTextures: EMPTY_TEX, upperCoverCoords: null, lowerCoverCoords: null,
        coverExtractSourceImage: { upper: null, lower: null }, defaultTextures: useDesignStore.getState().defaultTextures,
    };
}

export default function ProductDetailPage() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const [detail, setDetail] = useState<ProductDetail | null>(null);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [quoteOpen, setQuoteOpen] = useState(false);

    const load = useCallback(() => {
        setError(null); setQuoteError(null);
        bomApi<ProductDetail>(`/products/${code}`).then(setDetail).catch(e => setError(errMsg(e)));
        bomApi<Quote>(`/products/${code}/quote`).then(setQuote).catch(e => setQuoteError(errMsg(e)));
    }, [code]);
    useEffect(load, [load]);

    const onDelete = async () => {
        if (!detail || !confirm(`${detail.product.product_code} 상품과 BOM을 삭제합니다. 계속할까요?`)) return;
        try { await bomApi(`/products/${code}`, { method: 'DELETE' }); router.push('/bom/products'); } catch (e) { setError(errMsg(e)); }
    };

    if (error && !detail) return <ErrorBox error={error} />;
    if (!detail) return <Spinner />;
    const p = detail.product;
    const priced = new Map(quote?.lines.map(l => [l.item_no, l]) ?? []);

    return (
        <>
            <PageTitle title={`${p.product_code} · ${p.name}`} desc={`모델 ${p.model_code} · ${p.size_preset_id} ${p.width_mm}×${p.depth_mm} · ${p.is_dual ? 'Dual' : 'Single'} · 상태 ${p.status}`}
                right={<>
                    <Btn variant="ghost" onClick={() => router.push('/bom/products')}>← 목록</Btn>
                    <Btn variant="danger" onClick={onDelete}>삭제</Btn>
                </>} />
            <ErrorBox error={error} />
            {p.note && <Card style={{ marginBottom: 16, borderColor: '#fcd34d', background: '#fffbeb' }}><span style={{ fontSize: 12, color: '#92400e' }}>⚠ {p.note}</span></Card>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                <Card>
                    <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>BOM 트리</h3>
                    <Table<BomLineRow> rowKey={l => l.item_no} rows={detail.tree.flatMap(n => [n, ...n.children])}
                        columns={[
                            { key: 'item_no', header: '품번', width: 110, render: l => <span style={{ paddingLeft: l.level === 2 ? 18 : 0, fontWeight: l.level === 1 ? 800 : 500 }}>{l.level === 2 && '└ '}{l.item_no}</span> },
                            { key: 'name', header: '품명', render: l => l.items?.name ?? <Badge tone="danger">품목 없음</Badge> },
                            { key: 'quantity', header: '수량', width: 60, align: 'right', render: l => `${l.quantity}${l.items?.unit && l.items.unit !== '-' ? ' ' + l.items.unit : ''}` },
                            { key: 'spec_text', header: '규격', render: l => l.spec_text ?? '' },
                            { key: 'required', header: '구분', width: 60, render: l => l.level === 1 ? '' : <Badge tone={l.required === '옵션' ? 'warn' : 'muted'}>{l.required}</Badge> },
                            { key: 'price', header: '단가(승인 AVL)', width: 150, align: 'right', render: l => {
                                if (l.level === 1) return '';
                                const q = priced.get(l.item_no);
                                if (!q) return '-';
                                return q.warning ? <Badge tone="warn">{q.warning}</Badge> : <span>{fmtWon(q.total)} <span style={{ color: C.sub, fontSize: 10 }}>{q.vendor_code}</span></span>;
                            } },
                        ]} />
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card>
                        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>견적 합계 (이 사이즈)</h3>
                        {quoteError ? <ErrorBox error={`견적 계산 실패: ${quoteError}`} /> : !quote ? <Spinner /> : <>
                            <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{fmtWon(quote.total)}</div>
                            <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>배송: {quote.delivery.option ?? '-'} {fmtWon(quote.delivery.price)}</div>
                            <div style={{ marginTop: 8 }}>{quote.incomplete ? <Badge tone="warn">불완전 견적 — 경고 {quote.warnings.length}건</Badge> : <Badge tone="ok">단가 전부 승인됨</Badge>}</div>
                            {quote.warnings.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 11, color: '#b45309' }}>{quote.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
                        </>}
                    </Card>
                    <Card>
                        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>문서 / 작업</h3>
                        <div id="product-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* T5: 개발요청서 버튼이 여기에 붙는다 */}
                            <Btn onClick={() => {
                                const snap = p.design_snapshot as Record<string, unknown> | null;
                                if (!snap || !('coreId' in snap)) { alert('이 상품에는 위자드 스냅샷이 없습니다 (엑셀로 가져온 상품).'); return; }
                                useDesignStore.getState().loadFromPreset(restoreSnapshot(snap, p));
                                router.push('/builder');
                            }}>🧭 위자드로 열기</Btn>
                            <Btn variant="primary" onClick={() => setQuoteOpen(true)}>📊 견적서 (모델 전체 사이즈)</Btn>
                        </div>
                    </Card>
                </div>
            </div>
            {quoteOpen && <QuoteDialog modelCode={p.model_code} title={p.name} onClose={() => setQuoteOpen(false)} />}
        </>
    );
}
