'use client';

import { useState, useEffect } from 'react';
import { usePresetStore } from '../lib/presetStore';
import { useDesignStore, type DesignState } from '../lib/store';

/* ──────────────────────────────────────────────
   프리셋 저장 / 불러오기 패널
   헤더 드롭다운 형태로 표시
   ────────────────────────────────────────────── */

export default function PresetPanel() {
    const [open, setOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [showSave, setShowSave] = useState(false);
    const [mounted, setMounted] = useState(false);

    const { presets, savePreset, deletePreset, _hydrate } = usePresetStore();
    const designStore = useDesignStore();

    useEffect(() => {
        _hydrate();
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleSave = () => {
        if (!saveName.trim()) { alert('프리셋 이름을 입력해주세요.'); return; }
        const state: DesignState = {
            title: designStore.title,
            sizePresetId: designStore.sizePresetId,
            customWidth: designStore.customWidth,
            customDepth: designStore.customDepth,
            isDual: designStore.isDual,
            topFoamEnabled: designStore.topFoamEnabled,
            topFoamOptionId: designStore.topFoamOptionId,
            guardFoamThickness: designStore.guardFoamThickness,
            guardFoamEnabled: designStore.guardFoamEnabled,
            guardFoamHardness: designStore.guardFoamHardness,
            bottomFoamEnabled: designStore.bottomFoamEnabled,
            bottomFoamThickness: designStore.bottomFoamThickness,
            bottomFoamHardness: designStore.bottomFoamHardness,
            coreId: designStore.coreId,
            coverId: designStore.coverId,
            controllerId: designStore.controllerId,
            packagingId: designStore.packagingId,
            deliveryId: designStore.deliveryId,
            customCoverImages: designStore.customCoverImages,
            currentStep: designStore.currentStep,
        };
        const ok = savePreset(saveName.trim(), state);
        if (!ok) {
            alert('프리셋은 최대 20개까지 저장할 수 있습니다.');
            return;
        }
        setSaveName('');
        setShowSave(false);
    };

    const handleLoad = (id: string) => {
        const preset = presets.find(p => p.id === id);
        if (!preset) return;
        designStore.loadFromPreset(preset.state);
        setOpen(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', fontSize: 12, fontWeight: 600,
                    color: '#4f46e5', background: 'rgba(79, 70, 229, 0.06)',
                    border: '1px solid rgba(79, 70, 229, 0.15)',
                    borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s',
                }}
            >
                💾 프리셋 ({presets.length}/20)
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    width: 340, background: '#fff', borderRadius: 12,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                    border: '1px solid #e2e8f0', zIndex: 100,
                    maxHeight: 460, overflowY: 'auto',
                }}>
                    {/* 저장 섹션 */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        {showSave ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={saveName}
                                    onChange={e => setSaveName(e.target.value)}
                                    placeholder="프리셋 이름..."
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                    style={{
                                        flex: 1, padding: '7px 10px', fontSize: 12,
                                        border: '1px solid #e2e8f0', borderRadius: 6,
                                        outline: 'none', background: '#f8fafc',
                                    }}
                                />
                                <button onClick={handleSave} style={{
                                    padding: '7px 14px', fontSize: 11, fontWeight: 700,
                                    background: '#4f46e5', color: '#fff', border: 'none',
                                    borderRadius: 6, cursor: 'pointer',
                                }}>저장</button>
                                <button onClick={() => setShowSave(false)} style={{
                                    padding: '7px 10px', fontSize: 11, fontWeight: 600,
                                    background: '#f1f5f9', color: '#64748b', border: 'none',
                                    borderRadius: 6, cursor: 'pointer',
                                }}>취소</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowSave(true)} style={{
                                width: '100%', padding: '9px 0', fontSize: 13, fontWeight: 600,
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
                                border: 'none', borderRadius: 8, cursor: 'pointer',
                            }}>
                                ＋ 현재 설정 저장
                            </button>
                        )}
                    </div>

                    {/* 목록 */}
                    {presets.length === 0 ? (
                        <div style={{ padding: '20px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                            저장된 프리셋이 없습니다
                        </div>
                    ) : (
                        <div>
                            {presets.map(p => (
                                <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 16px', borderBottom: '1px solid #f8fafc',
                                    transition: 'background 0.15s', cursor: 'pointer',
                                }}
                                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    <div onClick={() => handleLoad(p.id)} style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                            {new Date(p.createdAt).toLocaleString('ko-KR')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deletePreset(p.id); }}
                                        style={{
                                            width: 26, height: 26, borderRadius: '50%', fontSize: 12,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#ef4444', background: 'rgba(239,68,68,0.06)',
                                            border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer',
                                        }}
                                        title="삭제"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
