'use client';
// 위자드 9단계: BOM 미리보기 → 모델코드·상품명·사이즈 선택 → 상품 저장
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDesignStore, type DesignState } from '../../lib/store';
import { SIZE_PRESETS } from '../../lib/constants';
import { buildBom } from '../../lib/bom/bomBuilder';
import { useAvlPricing, quoteFromDesign } from '../../lib/bom/useAvlPricing';
import { bomApi, errMsg } from '../../lib/bom/client';
import type { SizeSpec } from '../../lib/bom/types';

const fmt = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;

/** 스냅샷에서 무거운 필드(AI 이미지·텍스처 data URL)를 뺀다. 복원 시 loadFromPreset이 기본값으로 채운다 */
export function lightSnapshot(s: DesignState): Omit<DesignState, 'currentStep' | 'defaultTextures' | 'customCoverImages' | 'upperCoverTextures' | 'lowerCoverTextures' | 'upperCoverCoords' | 'lowerCoverCoords' | 'coverExtractSourceImage'> {
    const { currentStep, defaultTextures, customCoverImages, upperCoverTextures, lowerCoverTextures, upperCoverCoords, lowerCoverCoords, coverExtractSourceImage, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
}

export default function StepBomConfirm() {
    const s = useDesignStore();
    const router = useRouter();
    const { rows: avl } = useAvlPricing();
    const [modelCode, setModelCode] = useState('');
    const [name, setName] = useState(s.title || '');
    const [family, setFamily] = useState('에어매트리스');

    // 사이즈 선택 목록: SIZE_PRESETS + 커스텀 사이즈 (있을 경우)
    const selectableSizes: Array<{ id: string; label: string; width: number; depth: number }> = useMemo(() => {
        const result = SIZE_PRESETS.map(p => ({ id: p.id, label: p.label, width: p.width, depth: p.depth }));
        // 현재 사이즈가 커스텀인 경우 맨 앞에 추가
        const isCustom = s.sizePresetId === null || !SIZE_PRESETS.find(p => p.id === s.sizePresetId);
        if (isCustom && s.customWidth > 0 && s.customDepth > 0) {
            const customId = `C${s.customWidth}X${s.customDepth}`;
            result.unshift({ id: customId, label: '커스텀', width: s.customWidth, depth: s.customDepth });
        }
        return result;
    }, [s.sizePresetId, s.customWidth, s.customDepth]);

    const [sizeIds, setSizeIds] = useState<string[]>(() => {
        if (s.sizePresetId) return [s.sizePresetId];
        if (s.customWidth > 0 && s.customDepth > 0) return [`C${s.customWidth}X${s.customDepth}`];
        return [];
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 현재 선택 사이즈: 커스텀이면 생성된 커스텀 ID 사용
    const currentSizeId = (() => {
        if (s.sizePresetId) return s.sizePresetId;
        if (s.customWidth > 0 && s.customDepth > 0) return `C${s.customWidth}X${s.customDepth}`;
        return 'CUSTOM';
    })();

    const currentSize: SizeSpec = { size_preset_id: currentSizeId, width_mm: s.customWidth, depth_mm: s.customDepth };
    const preview = useMemo(() => buildBom(s, currentSize), [s, currentSize.width_mm, currentSize.depth_mm]);
    const quote = avl ? quoteFromDesign(s, currentSize, avl) : null;
    const missing: string[] = [];
    if (!s.coreId) missing.push('스트링'); if (!s.coverId) missing.push('커버'); if (!s.controllerId) missing.push('컨트롤러');
    if (!s.packagingId) missing.push('포장'); if (!s.deliveryId) missing.push('배송');

    const toggleSize = (id: string) => setSizeIds(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

    const save = async () => {
        if (!name.trim()) { setError('상품명을 입력하세요.'); return; }
        if (sizeIds.length === 0) { setError('사이즈를 1개 이상 선택하세요.'); return; }
        if (modelCode && !/^[A-Z0-9]+-[A-Z0-9]+$/.test(modelCode)) { setError('모델코드 형식: MAT-001 처럼 영대문자/숫자-영대문자/숫자'); return; }
        setBusy(true); setError(null);
        try {
            const sizes: SizeSpec[] = sizeIds.map(id => { const p = selectableSizes.find(x => x.id === id)!; return { size_preset_id: p.id, width_mm: p.width, depth_mm: p.depth }; });
            const snapshot = lightSnapshot(s); // 이미지·텍스처(base64)는 제외
            const r = await bomApi<{ product_codes: string[]; model_code: string }>('/products/from-design', {
                method: 'POST', json: { model_code: modelCode || undefined, name: name.trim(), family: family || undefined, sizes, design: { ...snapshot, deliveryId: s.deliveryId }, snapshot },
            });
            router.push(`/bom/products/${r.product_codes[0]}`);
        } catch (e) { setError(errMsg(e)); setBusy(false); }
    };

    const box: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12 };
    const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' };

    return (
        <div>
            {missing.length > 0 && <div style={{ ...box, borderColor: '#fca5a5', background: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>미선택 단계: {missing.join(', ')} — 저장 전에 선택하세요.</div>}
            {preview.unmapped.length > 0 && <div style={{ ...box, borderColor: '#fcd34d', background: '#fffbeb', color: '#92400e', fontSize: 12 }}>⚠ 품번 미발급 옵션(커스텀): {preview.unmapped.map(u => `${u.step}=${u.optionKey}`).join(', ')}. BOM에서 제외되고 상품 비고에 기록됩니다.</div>}

            <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>BOM 미리보기 ({currentSize.size_preset_id} 기준 · {preview.lines.filter(l => l.level === 2).length}개 부품)</div>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}><tbody>
                    {preview.lines.map(l => (
                        <tr key={l.item_no} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 2px', fontWeight: l.level === 1 ? 800 : 500, paddingLeft: l.level === 2 ? 14 : 2, color: l.level === 1 ? '#0f172a' : '#334155' }}>{l.level === 2 && '└ '}{l.item_no}</td>
                            <td style={{ padding: '4px 2px', textAlign: 'right', color: '#64748b' }}>{l.level === 2 ? `×${l.quantity}` : ''}</td>
                            <td style={{ padding: '4px 2px', color: '#94a3b8' }}>{l.spec_text ?? ''}</td>
                        </tr>
                    ))}
                </tbody></table>
                {quote && <div style={{ marginTop: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>예상 단가 (이 사이즈)</span><b style={{ color: '#4f46e5' }}>{fmt(quote.total)}{quote.incomplete ? ' ⚠' : ''}</b></div>}
            </div>

            <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>상품으로 저장</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontSize: 12, color: '#64748b' }}>모델코드 <span style={{ color: '#94a3b8' }}>(비우면 MAT-### 자동 채번)</span><input style={input} value={modelCode} onChange={e => setModelCode(e.target.value.toUpperCase())} placeholder="MAT-001" /></label>
                    <label style={{ fontSize: 12, color: '#64748b' }}>상품명<input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="예: 에어매트리스 A" /></label>
                    <label style={{ fontSize: 12, color: '#64748b' }}>상품군<input style={input} value={family} onChange={e => setFamily(e.target.value)} /></label>
                    <div style={{ fontSize: 12, color: '#64748b' }}>사이즈 (선택한 수만큼 상품이 생성됩니다)
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {selectableSizes.map(p => {
                                const on = sizeIds.includes(p.id);
                                const isCustom = !SIZE_PRESETS.some(x => x.id === p.id);
                                return <button key={p.id} type="button" onClick={() => toggleSize(p.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 14, border: `${isCustom ? '2px dashed' : '1px solid'} ${on ? '#4f46e5' : '#e2e8f0'}`, background: on ? '#e0e7ff' : '#fff', color: on ? '#3730a3' : '#64748b', cursor: 'pointer' }}>{p.label} {p.width}×{p.depth}</button>;
                            })}
                        </div>
                    </div>
                </div>
                {error && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
                <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={save} disabled={busy || missing.length > 0}>{busy ? '저장 중…' : `상품 저장 (${sizeIds.length}개 사이즈)`}</button>
            </div>
        </div>
    );
}
