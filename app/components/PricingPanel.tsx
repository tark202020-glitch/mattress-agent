'use client';
// 설계 현황 아래 실시간 견적 — DB AVL 승인 단가 기준 (기존 localStorage 단가표 대체)
import React from 'react';
import { useDesignStore } from '../lib/store';
import { useAvlPricing, quoteFromDesign } from '../lib/bom/useAvlPricing';

const fmt = (n: number) => (n === 0 ? '-' : `₩${Math.round(n).toLocaleString('ko-KR')}`);

export default function PricingPanel() {
    const s = useDesignStore();
    const { rows, error } = useAvlPricing();

    const box: React.CSSProperties = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: 12 };
    if (error) return <div style={{ ...box, color: '#dc2626', fontSize: 12 }}>단가 조회 실패: {error}</div>;
    if (!rows) return <div style={{ ...box, color: '#94a3b8', fontSize: 12 }}>단가 불러오는 중…</div>;

    const q = quoteFromDesign(s, { size_preset_id: s.sizePresetId ?? 'CUSTOM', width_mm: s.customWidth, depth_mm: s.customDepth }, rows);
    const shown = q.lines.filter(l => l.total > 0 || l.warning);

    return (
        <div style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>💰 예상 단가 (AVL 승인 단가)</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>{fmt(q.total)}</span>
            </div>
            {q.unmapped.length > 0 && <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8 }}>품번 미발급 옵션: {q.unmapped.map(u => `${u.step}(${u.optionKey})`).join(', ')} — 단가에 포함되지 않음</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                    {shown.map(l => (
                        <tr key={l.item_no} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 4px', color: '#64748b', width: 80 }}>{l.item_no}</td>
                            <td style={{ padding: '6px 4px', color: '#0f172a' }}>{l.quantity > 1 ? `×${l.quantity}` : ''}</td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', color: l.warning ? '#b45309' : '#0f172a', fontWeight: 600 }}>{l.warning ?? fmt(l.total)}</td>
                        </tr>
                    ))}
                    {q.delivery.price > 0 && <tr><td style={{ padding: '6px 4px', color: '#64748b' }}>배송</td><td /><td style={{ padding: '6px 4px', textAlign: 'right' }}>{fmt(q.delivery.price)}</td></tr>}
                </tbody>
            </table>
            {q.incomplete && <div style={{ fontSize: 11, color: '#b45309', marginTop: 8 }}>⚠ 일부 부품에 승인 단가가 없어 합계가 불완전합니다. AVL 탭에서 단가를 승인하세요.</div>}
        </div>
    );
}
