'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import { SIZE_PRESETS, DUAL_MIN_WIDTH } from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge, type FieldDef } from '../AddOptionModal';

export default function StepSize() {
    const {
        sizePresetId, customWidth, customDepth, isDual,
        setSizePreset, setCustomDimensions, setIsDual,
    } = useDesignStore();

    const { sizes: customSizes, addSize, removeSize, _hydrate } = useCustomOptionsStore();
    const [showAdd, setShowAdd] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { _hydrate(); setMounted(true); }, []);

    const regions = ['국내', '해외'] as const;
    const canDual = customWidth >= DUAL_MIN_WIDTH;

    if (!canDual && isDual) setIsDual(false);

    const allSizes = [...SIZE_PRESETS, ...customSizes];

    const addFields: FieldDef[] = [
        { key: 'label', label: '사이즈 이름', type: 'text', placeholder: '예: XL 킹' },
        { key: 'region', label: '지역', type: 'select', options: [{ value: '국내', label: '🇰🇷 국내' }, { value: '해외', label: '🌏 해외' }] },
        { key: 'width', label: '가로 W (mm)', type: 'number', placeholder: '1500' },
        { key: 'depth', label: '세로 D (mm)', type: 'number', placeholder: '2000' },
    ];

    const handleAdd = (vals: Record<string, string>) => {
        const id = `CUSTOM_${Date.now()}`;
        addSize({
            id,
            label: vals.label,
            region: vals.region as '국내' | '해외',
            width: Number(vals.width),
            depth: Number(vals.depth),
        });
    };

    const isCustom = (id: string) => customSizes.some(s => s.id === id);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* 사이즈 프리셋 */}
            {regions.map((region) => (
                <div key={region}>
                    <p style={{
                        fontSize: 13, fontWeight: 700, color: '#94a3b8',
                        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        {region === '국내' ? '🇰🇷' : '🌏'} {region} 규격
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 12,
                    }}>
                        {allSizes.filter(s => s.region === region).map((preset) => {
                            const isSelected = sizePresetId === preset.id;
                            const custom = isCustom(preset.id);
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => setSizePreset(preset.id, preset.width, preset.depth)}
                                    className="card"
                                    style={{
                                        padding: '12px 8px',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        ...(isSelected ? {
                                            borderColor: '#4f46e5',
                                            background: 'rgba(79, 70, 229, 0.05)',
                                            boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.15)',
                                        } : {}),
                                    }}
                                >
                                    {custom && <DeleteBadge onClick={() => removeSize(preset.id)} />}
                                    <div style={{
                                        fontWeight: 700, fontSize: 13,
                                        color: isSelected ? '#4f46e5' : '#0f172a',
                                    }}>
                                        {preset.label}
                                    </div>
                                    <div style={{
                                        fontSize: 11, marginTop: 4, opacity: 0.6,
                                        color: isSelected ? '#4f46e5' : '#94a3b8',
                                    }}>
                                        {preset.width} × {preset.depth}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* "+" 버튼 */}
            <AddButton onClick={() => setShowAdd(true)} label="새 사이즈 추가" />

            {/* 직접 입력 */}
            {customWidth > 0 && (
                <div className="animate-in">
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>
                        치수 직접 수정 (mm)
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>가로 (W)</label>
                            <input type="number" value={customWidth}
                                onChange={(e) => setCustomDimensions(Number(e.target.value), customDepth)}
                                style={{
                                    width: '100%', padding: '10px 12px', fontSize: 14,
                                    border: '1px solid #e2e8f0', borderRadius: 8,
                                    background: '#f8fafc', color: '#0f172a', outline: 'none',
                                }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>세로 (D)</label>
                            <input type="number" value={customDepth}
                                onChange={(e) => setCustomDimensions(customWidth, Number(e.target.value))}
                                style={{
                                    width: '100%', padding: '10px 12px', fontSize: 14,
                                    border: '1px solid #e2e8f0', borderRadius: 8,
                                    background: '#f8fafc', color: '#0f172a', outline: 'none',
                                }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Single / Dual 선택 */}
            {canDual && (
                <div className="animate-in">
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 12 }}>
                            🔀 Single / Dual 옵션{' '}
                            <span style={{ color: '#94a3b8' }}>(Q 사이즈 이상)</span>
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {[
                                { val: false, icon: '🛏️', title: 'Single Type', desc: '스트링 1개 통합형' },
                                { val: true, icon: '👫', title: 'Dual Type', desc: '스트링 2개 분리형 (좌/우)' },
                            ].map(({ val, icon, title, desc }) => {
                                const isSelected = isDual === val;
                                return (
                                    <button
                                        key={String(val)}
                                        onClick={() => setIsDual(val)}
                                        className="card"
                                        style={{
                                            flex: 1, padding: 20,
                                            cursor: 'pointer', textAlign: 'center',
                                            transition: 'all 0.2s',
                                            ...(isSelected ? {
                                                borderColor: '#7c3aed',
                                                background: 'rgba(124, 58, 237, 0.05)',
                                                boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
                                            } : {}),
                                        }}
                                    >
                                        <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                                        <div style={{
                                            fontWeight: 700, fontSize: 15,
                                            color: isSelected ? '#7c3aed' : '#0f172a',
                                        }}>
                                            {title}
                                        </div>
                                        <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>
                                            {desc}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {showAdd && (
                <AddOptionModal
                    title="새 사이즈 추가"
                    fields={addFields}
                    onSave={handleAdd}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </div>
    );
}
