'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import { CORE_OPTIONS } from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge, type FieldDef } from '../AddOptionModal';

export default function StepCore() {
    const { coreId, setCore } = useDesignStore();
    const { cores: customCores, addCore, removeCore, _hydrate } = useCustomOptionsStore();
    const [showAdd, setShowAdd] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { _hydrate(); setMounted(true); }, []);

    const allCores = [...CORE_OPTIONS, ...customCores];
    const isCustom = (id: string) => customCores.some(c => c.id === id);

    const defaultColors = ['#4A90D9', '#7B68EE', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];

    return (
        <div className="animate-in">
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
            }}>
                {allCores.map((core) => {
                    const isSelected = coreId === core.id;
                    const custom = isCustom(core.id);
                    return (
                        <button
                            key={core.id}
                            onClick={() => setCore(core.id)}
                            className="card"
                            style={{
                                padding: 20, textAlign: 'left',
                                cursor: 'pointer', transition: 'all 0.2s',
                                position: 'relative',
                                ...(isSelected ? {
                                    borderColor: core.color,
                                    background: `${core.color}0D`,
                                    boxShadow: `0 0 0 2px ${core.color}26`,
                                } : {}),
                            }}
                        >
                            {custom && <DeleteBadge onClick={() => removeCore(core.id)} />}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, fontWeight: 700,
                                    background: `${core.color}1A`, color: core.color,
                                }}>
                                    {core.material === 'PVC' ? '🔷' : '🟣'}
                                </div>
                                <div>
                                    <div style={{
                                        fontWeight: 700, fontSize: 16,
                                        color: isSelected ? '#0f172a' : '#475569',
                                    }}>
                                        {core.label}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: core.color }}>
                                        {core.material} 소재
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                                {core.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: 12 }}>
                <AddButton onClick={() => setShowAdd(true)} label="새 스트링 옵션 추가" />
            </div>

            {showAdd && (
                <AddOptionModal
                    title="새 스트링 옵션 추가"
                    fields={[
                        { key: 'label', label: '제목', type: 'text', placeholder: '예: V5 ECO' },
                        { key: 'material', label: '소제목 (소재명)', type: 'text', placeholder: '예: ECO' },
                        { key: 'description', label: '내용 (설명)', type: 'text', placeholder: '설명을 입력하세요' },
                        { key: 'height', label: '높이 (mm)', type: 'number', placeholder: '200' },
                    ]}
                    onSave={vals => {
                        const idx = customCores.length;
                        addCore({
                            id: `CUSTOM_CORE_${Date.now()}`,
                            label: vals.label,
                            material: vals.material,
                            description: vals.description,
                            color: defaultColors[idx % defaultColors.length],
                            patternId: 'pattern-custom',
                            height: Number(vals.height) || 200,
                        });
                    }}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </div>
    );
}
