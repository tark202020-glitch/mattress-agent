'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import { COVER_OPTIONS } from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge, type FieldDef } from '../AddOptionModal';
import CoverImageGeneratorModal from '../CoverImageGeneratorModal';
import Image from 'next/image';

const gradeLabel: Record<string, string> = {
    '저': '베이직',
    '중': '스탠다드',
    '고': '프리미엄',
    '커스텀': '커스텀',
};

const gradeColor: Record<string, string> = {
    '저': '#94a3b8',
    '중': '#3b82f6',
    '고': '#8b5cf6',
    '커스텀': '#64748b',
};

export default function StepCover() {
    const { coverId, setCover, customCoverImages, setCustomCoverImage } = useDesignStore();
    const { covers: customCovers, addCover, removeCover, _hydrate } = useCustomOptionsStore();
    const [showAdd, setShowAdd] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [imageGenTarget, setImageGenTarget] = useState<{ id: string; label: string; description: string; color: string; image?: string } | null>(null);

    useEffect(() => { _hydrate(); setMounted(true); }, []);

    const allCovers = [...COVER_OPTIONS, ...customCovers];
    const isCustom = (id: string) => customCovers.some(c => c.id === id);

    return (
        <div className="animate-in">
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
            }}>
                {allCovers.map((cover) => {
                    const isSelected = coverId === cover.id;
                    const custom = isCustom(cover.id);
                    const customImage = customCoverImages[cover.id];

                    return (
                        <button
                            key={cover.id}
                            onClick={() => setCover(cover.id)}
                            className="card"
                            style={{
                                padding: 0, textAlign: 'left',
                                transition: 'all 0.2s', position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'stretch',
                                ...(isSelected ? {
                                    borderColor: cover.color,
                                    background: `${cover.color}0D`,
                                    boxShadow: `0 0 0 3px ${cover.color}26`,
                                } : {}),
                            }}
                        >
                            {custom && <DeleteBadge onClick={() => removeCover(cover.id)} />}

                            {/* 이미지 영역 */}
                            {(customImage || cover.image) ? (
                                <div style={{
                                    width: 140, minHeight: 100,
                                    position: 'relative',
                                    flexShrink: 0,
                                    borderRight: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                }}>
                                    {customImage ? (
                                        <img
                                            src={customImage}
                                            alt={cover.label}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Image
                                            src={cover.image!}
                                            alt={cover.label}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            sizes="140px"
                                        />
                                    )}
                                    {/* AI 생성 이미지 배지 */}
                                    {customImage && (
                                        <div style={{
                                            position: 'absolute', bottom: 4, left: 4,
                                            background: 'rgba(79,70,229,0.85)', color: '#fff',
                                            fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                            borderRadius: 4, letterSpacing: 0.3,
                                        }}>
                                            AI
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{
                                    width: 140, minHeight: 100,
                                    flexShrink: 0,
                                    background: cover.color,
                                    borderRight: '1px solid #e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 12,
                                        background: 'rgba(255,255,255,0.25)',
                                        border: '2px solid rgba(255,255,255,0.3)',
                                    }} />
                                </div>
                            )}

                            {/* 텍스트 영역 */}
                            <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <div style={{
                                        fontWeight: 700, fontSize: 16,
                                        color: isSelected ? '#0f172a' : '#475569',
                                    }}>
                                        {cover.label}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {/* AI 이미지 생성 버튼 */}
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageGenTarget({
                                                    id: cover.id,
                                                    label: cover.label,
                                                    description: cover.description,
                                                    color: cover.color,
                                                    image: cover.image,
                                                });
                                            }}
                                            style={{
                                                fontSize: 10, fontWeight: 700, padding: '3px 8px',
                                                borderRadius: 6,
                                                color: '#4f46e5',
                                                background: '#eef2ff',
                                                border: '1px solid #c7d2fe',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                whiteSpace: 'nowrap',
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.target as HTMLElement).style.background = '#4f46e5';
                                                (e.target as HTMLElement).style.color = '#fff';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.target as HTMLElement).style.background = '#eef2ff';
                                                (e.target as HTMLElement).style.color = '#4f46e5';
                                            }}
                                        >
                                            🎨 AI 이미지
                                        </span>
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '3px 8px',
                                            borderRadius: 6,
                                            color: gradeColor[cover.grade] || '#64748b',
                                            background: `${gradeColor[cover.grade] || '#64748b'}10`,
                                            border: `1px solid ${gradeColor[cover.grade] || '#64748b'}20`,
                                        }}>
                                            {gradeLabel[cover.grade] || cover.grade}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                    {cover.description}
                                </div>
                            </div>

                            {isSelected && (
                                <div style={{
                                    position: 'absolute', top: 10, right: 10,
                                }}>
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: cover.color,
                                        animation: 'pulse 2s ease-in-out infinite',
                                        boxShadow: `0 0 6px ${cover.color}80`,
                                    }} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: 16 }}>
                <AddButton onClick={() => setShowAdd(true)} label="새 커버 추가" />
            </div>

            {showAdd && (
                <AddOptionModal
                    title="새 커버 추가"
                    fields={[
                        { key: 'label', label: '네이밍 (이름)', type: 'text', placeholder: '예: 아쿠아쿨 스타일' },
                        { key: 'description', label: '특징', type: 'text', placeholder: '기능성 설명' },
                        {
                            key: 'grade', label: '등급', type: 'select', options: [
                                { value: '저', label: '베이직' },
                                { value: '중', label: '스탠다드' },
                                { value: '고', label: '프리미엄' },
                            ]
                        },
                        { key: 'color', label: '대표 색상 (HEX)', type: 'text', placeholder: '#A1B2C3', required: false },
                    ]}
                    onSave={vals => {
                        addCover({
                            id: `CUSTOM_COV_${Date.now()}`,
                            label: vals.label,
                            grade: (vals.grade as '저' | '중' | '고') || '중',
                            color: vals.color || '#64748b',
                            description: vals.description,
                            coverTopThickness: 30,
                        });
                    }}
                    onClose={() => setShowAdd(false)}
                />
            )}

            {/* AI 이미지 생성 모달 */}
            {imageGenTarget && (
                <CoverImageGeneratorModal
                    coverId={imageGenTarget.id}
                    coverLabel={imageGenTarget.label}
                    coverDescription={imageGenTarget.description}
                    coverColor={imageGenTarget.color}
                    coverImage={imageGenTarget.image}
                    onSave={(imageUrl) => setCustomCoverImage(imageGenTarget.id, imageUrl)}
                    onClose={() => setImageGenTarget(null)}
                />
            )}
        </div>
    );
}

