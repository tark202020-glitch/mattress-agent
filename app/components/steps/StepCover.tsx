'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import { COVER_OPTIONS } from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge, type FieldDef } from '../AddOptionModal';
import CoverImageGeneratorModal from '../CoverImageGeneratorModal';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

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
    const { coverId, setCover, customCoverImages, structureType,
        upperCoverTextures, lowerCoverTextures, setUpperCoverTextures, setLowerCoverTextures,
        upperCoverCoords, lowerCoverCoords, setUpperCoverCoords, setLowerCoverCoords,
        coverExtractSourceImage, setCoverExtractSourceImage
    } = useDesignStore();
    const { covers: customCovers, addCover, removeCover, _hydrate } = useCustomOptionsStore();
    const pathname = usePathname();
    const isDesigner = pathname === '/designer';
    const [showAdd, setShowAdd] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { _hydrate(); setMounted(true); }, []);

    // 커버 변경 시 해당 커버의 default 텍스처를 자동으로 불러오기
    const defaultTextures = useDesignStore(s => s.defaultTextures);
    useEffect(() => {
        if (!coverId) return;
        const coverDef = defaultTextures[coverId];
        if (coverDef) {
            // 저장된 default 텍스처가 있으면 자동 적용
            setUpperCoverTextures(coverDef.upper || { top: null, front: null, side: null });
            setLowerCoverTextures(coverDef.lower || { top: null, front: null, side: null });
            setUpperCoverCoords(coverDef.upperCoords || null);
            setLowerCoverCoords(coverDef.lowerCoords || null);
            if (coverDef.sourceImage) {
                setCoverExtractSourceImage('upper', coverDef.sourceImage.upper);
                setCoverExtractSourceImage('lower', coverDef.sourceImage.lower);
            }
        } else {
            // 저장된 default가 없으면 텍스처 초기화
            setUpperCoverTextures({ top: null, front: null, side: null });
            setLowerCoverTextures({ top: null, front: null, side: null });
            setUpperCoverCoords(null);
            setLowerCoverCoords(null);
            setCoverExtractSourceImage('upper', null);
            setCoverExtractSourceImage('lower', null);
        }
    }, [coverId]);

    const allCovers = [...COVER_OPTIONS, ...customCovers];
    const isCustom = (id: string) => customCovers.some(c => c.id === id);

    const isAllowedCover = (id: string, structType: string | null) => {
        if (isDesigner) return true; // designer 페이지에서는 structureType 무관 전체 노출
        if (id.startsWith('CUSTOM_COV_')) return true;
        if (structType === 'basic') {
            return id === 'HEALING_NUMBER' || id === 'COMPACT';
        } else if (structType === 'premium') {
            return id !== 'HEALING_NUMBER' && id !== 'COMPACT';
        }
        return true; // standard 시 전체 노출
    };

    const allowedCovers = allCovers.filter(c => isAllowedCover(c.id, structureType));

    return (
        <div className="animate-in">
            <div style={{
                display: 'grid',
                gridTemplateColumns: isDesigner ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                gap: 16,
            }}>
                {allowedCovers.map((cover) => {
                    const isSelected = coverId === cover.id;
                    const custom = isCustom(cover.id);
                    const customImage = customCoverImages[cover.id];

                    let displayGrade = gradeLabel[cover.grade] || cover.grade;
                    let displayGradeColor = gradeColor[cover.grade] || '#64748b';

                    return (
                        <button
                            key={cover.id}
                            onClick={() => setCover(cover.id)}
                            className="card"
                            style={{
                                padding: 0, textAlign: 'left',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'stretch',
                                borderRadius: 16,
                                border: '1px solid',
                                borderColor: isSelected ? cover.color : '#e2e8f0',
                                backgroundColor: isSelected ? `${cover.color}08` : '#ffffff',
                                boxShadow: isSelected
                                    ? `0 4px 12px ${cover.color}15, 0 0 0 1px ${cover.color}40`
                                    : '0 2px 8px rgba(0,0,0,0.04)',
                                transform: isSelected ? 'translateY(-2px)' : 'none',
                            }}
                            onMouseEnter={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isSelected) {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                    e.currentTarget.style.transform = 'none';
                                }
                            }}
                        >
                            {custom && <DeleteBadge onClick={() => removeCover(cover.id)} />}

                            {/* 이미지 및 정보 컨테이너 (상/하 배치) */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'stretch' }}>

                                {/* 텍스트 영역 (상단) */}
                                <div style={{ padding: '16px 16px 12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minHeight: 90 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700, color: displayGradeColor,
                                                background: `${displayGradeColor}15`, padding: '4px 8px', borderRadius: 6,
                                            }}>
                                                {displayGrade}
                                            </span>
                                        </div>
                                        <div style={{
                                            fontWeight: 800, fontSize: 16,
                                            color: isSelected ? '#0f172a' : '#334155',
                                            lineHeight: 1.2,
                                            letterSpacing: '-0.3px',
                                        }}>
                                            {cover.label}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>
                                        {cover.description}
                                    </div>
                                </div>

                                {/* 이미지 영역 (하단 - 반반 분리) */}
                                {(customImage || cover.image) ? (
                                    <div style={{
                                        width: '100%', height: 160,
                                        position: 'relative',
                                        flexShrink: 0,
                                        borderTop: `1px solid ${isSelected ? `${cover.color}20` : '#f1f5f9'}`,
                                        display: 'flex',
                                        overflow: 'hidden',
                                    }}>
                                        {customImage ? (
                                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                                <img
                                                    src={customImage}
                                                    alt={cover.label}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                <div style={{
                                                    position: 'absolute', bottom: 6, left: 6,
                                                    background: 'rgba(15, 23, 42, 0.75)', color: '#fff',
                                                    backdropFilter: 'blur(4px)',
                                                    fontSize: 9, fontWeight: 700, padding: '3px 8px',
                                                    borderRadius: 6, letterSpacing: 0.5,
                                                }}>
                                                    AI GENERATED
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ flex: 1, position: 'relative', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                                                    {cover.topImage ? (
                                                        <Image
                                                            src={cover.topImage}
                                                            alt={`${cover.label} Top`}
                                                            fill
                                                            style={{ objectFit: 'cover' }}
                                                            sizes="(max-width: 768px) 50vw, 25vw"
                                                        />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', background: cover.color }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    {cover.sideImageFront ? (
                                                        <Image
                                                            src={cover.sideImageFront}
                                                            alt={`${cover.label} Side`}
                                                            fill
                                                            style={{ objectFit: 'cover' }}
                                                            sizes="(max-width: 768px) 50vw, 25vw"
                                                        />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', background: cover.color }} />
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '100%', height: 160,
                                        flexShrink: 0,
                                        background: cover.color,
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: 'rgba(255,255,255,0.25)',
                                            border: '2px solid rgba(255,255,255,0.3)',
                                        }} />
                                    </div>
                                )}
                            </div>
                            {isSelected && (
                                <div style={{
                                    position: 'absolute', top: 14, right: 14,
                                }}>
                                    <div style={{
                                        width: 12, height: 12, borderRadius: '50%',
                                        background: cover.color,
                                        boxShadow: `0 0 0 4px ${cover.color}20`,
                                    }} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {isDesigner ? (
                <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => {
                            if (!coverId) {
                                alert('먼저 스타일을 선택해주세요.');
                                return;
                            }
                            setShowAiModal(true);
                        }}
                        style={{
                            flex: 1, padding: '16px 20px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            boxShadow: '0 4px 14px rgba(79,70,229,0.3)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                        <span style={{ fontSize: 18 }}>✨</span> AI 이미지 생성하기
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        style={{
                            flex: 1, padding: '16px 20px', borderRadius: 12, border: '1px solid #4f46e5',
                            background: '#fff',
                            color: '#4f46e5', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        ➕ 새 디자인(커스텀) 추가하기
                    </button>
                </div>
            ) : (
                <div style={{ marginTop: 16 }}>
                    <AddButton onClick={() => setShowAdd(true)} label="새 커버 디자인 추가하기" />
                </div>
            )}

            {showAiModal && coverId && (
                <CoverImageGeneratorModal
                    coverId={coverId}
                    coverLabel={allCovers.find(c => c.id === coverId)?.label || '커스텀 커버'}
                    coverDescription={allCovers.find(c => c.id === coverId)?.description || ''}
                    coverColor={allCovers.find(c => c.id === coverId)?.color || '#64748b'}
                    coverImage={allCovers.find(c => c.id === coverId)?.image}
                    onSave={(url) => {
                        useDesignStore.getState().setCustomCoverImage(coverId, url);
                    }}
                    onClose={() => setShowAiModal(false)}
                />
            )}

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

        </div>
    );
}
