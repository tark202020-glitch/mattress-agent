'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import {
    TOP_FOAM_OPTIONS,
    GUARD_FOAM_THICKNESS_OPTIONS,
    GUARD_FOAM_HARDNESS_OPTIONS,
    BOTTOM_FOAM_THICKNESS_OPTIONS,
    BOTTOM_FOAM_HARDNESS_OPTIONS,
    DUAL_MIN_WIDTH,
} from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge, type FieldDef } from '../AddOptionModal';

const selStyle = (isSelected: boolean, color: string) => isSelected ? {
    borderColor: color,
    background: `${color}0D`,
    boxShadow: `0 0 0 2px ${color}26`,
} : {};

export default function StepFoam() {
    const {
        structureType, setStructureType,
        topFoamEnabled, topFoamOptionId, setTopFoamOption, topFoamRadius, setTopFoamRadius,
        guardFoamThickness, guardFoamEnabled, guardFoamHardness, guardFoamRadius,
        setGuardFoamThickness, setGuardFoamHardness, setGuardFoamRadius,
        bottomFoamEnabled, bottomFoamThickness, bottomFoamHardness, bottomFoamRadius,
        setBottomFoamDetails, setBottomFoamRadius,
        isDual, setIsDual, customWidth
    } = useDesignStore();

    const custom = useCustomOptionsStore();
    const [mounted, setMounted] = useState(false);
    const [showAddTop, setShowAddTop] = useState(false);
    const [showAddGuardT, setShowAddGuardT] = useState(false);
    const [showAddGuardH, setShowAddGuardH] = useState(false);
    const [showAddBotT, setShowAddBotT] = useState(false);
    const [showAddBotH, setShowAddBotH] = useState(false);

    useEffect(() => { custom._hydrate(); setMounted(true); }, []);

    // Merged options
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...custom.topFoams];
    const allGuardThicknesses = [...Array.from(GUARD_FOAM_THICKNESS_OPTIONS), ...custom.guardThicknesses];
    const allGuardHardnesses = [...Array.from(GUARD_FOAM_HARDNESS_OPTIONS), ...custom.guardHardnesses];
    const allBottomThicknesses = [...Array.from(BOTTOM_FOAM_THICKNESS_OPTIONS), ...custom.bottomThicknesses];
    const allBottomHardnesses = [...Array.from(BOTTOM_FOAM_HARDNESS_OPTIONS), ...custom.bottomHardnesses];

    const isCustomTopFoam = (id: string) => custom.topFoams.some(t => t.id === id);
    const isCustomGuardT = (val: number) => custom.guardThicknesses.includes(val);
    const isCustomGuardH = (val: string) => custom.guardHardnesses.includes(val);
    const isCustomBotT = (val: number) => custom.bottomThicknesses.includes(val);
    const isCustomBotH = (val: string) => custom.bottomHardnesses.includes(val);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ── 구조 선택 ── */}
            <section>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                        border: '1.5px solid #0f172a', color: '#0f172a',
                    }}>❖</span>
                    구조 선택
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => setStructureType('basic')}
                        className="card" style={{
                            padding: '12px 8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                            ...selStyle(structureType === 'basic', '#3b82f6')
                        }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: structureType === 'basic' ? '#3b82f6' : '#1e293b' }}>Basic</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>스트링 단독</div>
                    </button>
                    <button onClick={() => setStructureType('standard')}
                        className="card" style={{
                            padding: '12px 8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                            ...selStyle(structureType === 'standard', '#3b82f6')
                        }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: structureType === 'standard' ? '#3b82f6' : '#1e293b' }}>Standard</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>상단 토퍼 포함</div>
                    </button>
                    <button onClick={() => setStructureType('premium')}
                        className="card" style={{
                            padding: '12px 8px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
                            ...selStyle(structureType === 'premium', '#3b82f6')
                        }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: structureType === 'premium' ? '#3b82f6' : '#1e293b' }}>Premium</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>풀 폼 케이스</div>
                    </button>
                </div>
                {!structureType && (
                    <div style={{ padding: '16px', borderRadius: 8, background: '#f8fafc', color: '#475569', fontSize: 13, textAlign: 'center' }}>
                        위에서 매트리스 구조를 먼저 선택해 주세요.
                    </div>
                )}
            </section>

            {structureType === 'basic' && (
                <div style={{ padding: '24px', borderRadius: 8, background: '#f8fafc', color: '#475569', fontSize: 13, textAlign: 'center' }}>
                    Basic 구조는 별도의 폼 옵션 컴포넌트 추가 구성이 없습니다.
                </div>
            )}

            {/* Single / Dual 선택 추가 (기존 사이즈창에서 이동) */}
            {(customWidth >= DUAL_MIN_WIDTH) && (
                <div className="animate-in" style={{ marginTop: 16 }}>
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 12 }}>
                            🔀 Single / Dual 옵션{' '}
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Q 사이즈 이상)</span>
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
                                            textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                            display: 'flex', alignItems: 'flex-start', gap: 14,
                                            ...(isSelected ? {
                                                borderColor: '#7c3aed',
                                                background: 'rgba(124, 58, 237, 0.05)',
                                                boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
                                            } : {}),
                                        }}
                                    >
                                        <div style={{
                                            fontSize: 24, width: 44, height: 44, borderRadius: 12,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: isSelected ? '#fff' : '#f1f5f9',
                                            boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                        }}>
                                            {icon}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? '#7c3aed' : '#0f172a', marginBottom: 4 }}>
                                                {title}
                                            </div>
                                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                                {desc}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {structureType !== 'basic' && structureType !== null && (
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />
            )}

            {/* ── 2-1: 상단폼 (Green) ── */}
            {topFoamEnabled && (
                <section>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                            border: '1.5px solid #16a34a', color: '#16a34a',
                        }}>1</span>
                        상단폼 (Top Layer)
                    </h3>
                    <div className="animate-in" style={{ paddingLeft: 16, borderLeft: '2px solid #16a34a' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 10 }}>두께 및 레이어 구성 선택</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {allTopFoams.map((opt) => (
                                <button key={opt.id} onClick={() => setTopFoamOption(opt.id)}
                                    className="card" style={{
                                        padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                                        transition: 'all 0.2s', position: 'relative',
                                        ...selStyle(topFoamOptionId === opt.id, '#16a34a'),
                                    }}>
                                    {isCustomTopFoam(opt.id) && <DeleteBadge onClick={() => custom.removeTopFoam(opt.id)} />}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: topFoamOptionId === opt.id ? '#16a34a' : '#0f172a' }}>
                                            {opt.label}
                                        </span>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{opt.thickness}mm</span>
                                    </div>
                                    <div style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>{opt.description}</div>
                                </button>
                            ))}
                            <AddButton onClick={() => setShowAddTop(true)} label="상단폼 옵션 추가" />
                        </div>
                    </div>
                </section>
            )}

            {guardFoamEnabled && <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />}

            {/* ── 2-2: 가드폼 (Orange) ── */}
            {guardFoamEnabled && (
                <section>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ea580c', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                            border: '1.5px solid #ea580c', color: '#ea580c',
                        }}>2</span>
                        가드폼 (Guard)
                        {isDual && (
                            <span style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 12,
                                background: 'rgba(234, 88, 12, 0.08)', color: '#ea580c',
                                border: '1px solid rgba(234, 88, 12, 0.2)',
                            }}>
                                Dual Mode
                            </span>
                        )}
                    </h3>

                    {/* ① 두께 */}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#ea580c', marginBottom: 10 }}>① 가드폼 두께 (Thickness)</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {allGuardThicknesses.map((t) => (
                                <button key={t} onClick={() => setGuardFoamThickness(t)}
                                    className="card" style={{
                                        flex: '1 0 auto', minWidth: 70, padding: '10px 0', cursor: 'pointer',
                                        fontSize: 13, transition: 'all 0.2s', textAlign: 'center',
                                        fontWeight: guardFoamThickness === t ? 600 : 400,
                                        color: guardFoamThickness === t ? '#ea580c' : '#475569',
                                        position: 'relative',
                                        ...selStyle(guardFoamThickness === t, '#ea580c'),
                                    }}>
                                    {isCustomGuardT(t) && <DeleteBadge onClick={() => custom.removeGuardThickness(t)} />}
                                    {t}mm
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <AddButton onClick={() => setShowAddGuardT(true)} label="두께 추가" />
                        </div>
                    </div>

                    {/* ② 경도 */}
                    <div className="animate-in" style={{ paddingLeft: 16, borderLeft: '2px solid #ea580c' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#ea580c', marginBottom: 10 }}>② 경도 (Hardness)</p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {allGuardHardnesses.map((h) => (
                                <button key={h} onClick={() => setGuardFoamHardness(h)}
                                    className="card" style={{
                                        flex: '1 0 auto', minWidth: 70, padding: '10px 0', cursor: 'pointer',
                                        fontSize: 13, transition: 'all 0.2s', textAlign: 'center',
                                        fontWeight: guardFoamHardness === h ? 600 : 400,
                                        color: guardFoamHardness === h ? '#ea580c' : '#475569',
                                        position: 'relative',
                                        ...selStyle(guardFoamHardness === h, '#ea580c'),
                                    }}>
                                    {isCustomGuardH(h) && <DeleteBadge onClick={() => custom.removeGuardHardness(h)} />}
                                    {h}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <AddButton onClick={() => setShowAddGuardH(true)} label="경도 추가" />
                        </div>
                    </div>
                </section>
            )}

            {bottomFoamEnabled && <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: 0 }} />}

            {/* ── 2-3: 하단폼 (Teal) ── */}
            {bottomFoamEnabled && (
                <section>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0d9488', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                            border: '1.5px solid #0d9488', color: '#0d9488',
                        }}>3</span>
                        하단폼 (Bottom Layer)
                    </h3>
                    <div className="animate-in" style={{ paddingLeft: 16, borderLeft: '2px solid #0d9488' }}>
                        <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', marginBottom: 10 }}>두께 (Thickness)</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {allBottomThicknesses.map((t) => (
                                    <button key={t} onClick={() => setBottomFoamDetails(t, bottomFoamHardness)}
                                        className="card" style={{
                                            flex: '1 0 auto', minWidth: 70, padding: '10px 0', cursor: 'pointer',
                                            fontSize: 13, transition: 'all 0.2s', textAlign: 'center',
                                            fontWeight: bottomFoamThickness === t ? 600 : 400,
                                            color: bottomFoamThickness === t ? '#0d9488' : '#475569',
                                            position: 'relative',
                                            ...selStyle(bottomFoamThickness === t, '#0d9488'),
                                        }}>
                                        {isCustomBotT(t) && <DeleteBadge onClick={() => custom.removeBottomThickness(t)} />}
                                        {t}mm
                                    </button>
                                ))}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <AddButton onClick={() => setShowAddBotT(true)} label="두께 추가" />
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', marginBottom: 10 }}>경도 (Hardness)</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {allBottomHardnesses.map((h) => (
                                    <button key={h} onClick={() => setBottomFoamDetails(bottomFoamThickness, h)}
                                        className="card" style={{
                                            flex: '1 0 auto', minWidth: 70, padding: '10px 0', cursor: 'pointer',
                                            fontSize: 13, transition: 'all 0.2s', textAlign: 'center',
                                            fontWeight: bottomFoamHardness === h ? 600 : 400,
                                            color: bottomFoamHardness === h ? '#0d9488' : '#475569',
                                            position: 'relative',
                                            ...selStyle(bottomFoamHardness === h, '#0d9488'),
                                        }}>
                                        {isCustomBotH(h) && <DeleteBadge onClick={() => custom.removeBottomHardness(h)} />}
                                        {h}
                                    </button>
                                ))}
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <AddButton onClick={() => setShowAddBotH(true)} label="경도 추가" />
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* 모달들 */}
            {showAddTop && (
                <AddOptionModal
                    title="상단폼 옵션 추가"
                    fields={[
                        { key: 'label', label: '라벨', type: 'text', placeholder: '예: 90mm (2Layer 4:5)' },
                        { key: 'thickness', label: '두께 (mm)', type: 'number', placeholder: '90' },
                        { key: 'layers', label: '레이어 (선택)', type: 'text', placeholder: '예: 4:5 (비율, 없으면 비워두세요)', required: false },
                        { key: 'description', label: '설명', type: 'text', placeholder: '설명 입력' },
                    ]}
                    onSave={vals => {
                        custom.addTopFoam({
                            id: `CUSTOM_TF_${Date.now()}`,
                            label: vals.label,
                            thickness: Number(vals.thickness),
                            layers: vals.layers || null,
                            description: vals.description || vals.label,
                        });
                    }}
                    onClose={() => setShowAddTop(false)}
                />
            )}
            {showAddGuardT && (
                <AddOptionModal
                    title="가드폼 두께 추가"
                    fields={[{ key: 'thickness', label: '두께 (mm)', type: 'number', placeholder: '90' }]}
                    onSave={vals => custom.addGuardThickness(Number(vals.thickness))}
                    onClose={() => setShowAddGuardT(false)}
                />
            )}
            {showAddGuardH && (
                <AddOptionModal
                    title="가드폼 경도 추가"
                    fields={[{ key: 'hardness', label: '경도명', type: 'text', placeholder: '예: 울트라하드' }]}
                    onSave={vals => custom.addGuardHardness(vals.hardness)}
                    onClose={() => setShowAddGuardH(false)}
                />
            )}
            {showAddBotT && (
                <AddOptionModal
                    title="하단폼 두께 추가"
                    fields={[{ key: 'thickness', label: '두께 (mm)', type: 'number', placeholder: '70' }]}
                    onSave={vals => custom.addBottomThickness(Number(vals.thickness))}
                    onClose={() => setShowAddBotT(false)}
                />
            )}
            {showAddBotH && (
                <AddOptionModal
                    title="하단폼 경도 추가"
                    fields={[{ key: 'hardness', label: '경도명', type: 'text', placeholder: '예: 울트라소프트' }]}
                    onSave={vals => custom.addBottomHardness(vals.hardness)}
                    onClose={() => setShowAddBotH(false)}
                />
            )}
        </div>
    );
}
