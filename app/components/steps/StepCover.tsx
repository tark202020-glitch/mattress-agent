'use client';

import { useState, useEffect } from 'react';
import { useDesignStore } from '../../lib/store';
import { COVER_OPTIONS } from '../../lib/constants';
import { useCustomOptionsStore } from '../../lib/customOptionsStore';
import AddOptionModal, { AddButton, DeleteBadge, type FieldDef } from '../AddOptionModal';
import CoverImageGeneratorModal from '../CoverImageGeneratorModal';
import TextureExtractorModal from '../TextureExtractorModal';
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
    const { coverId, setCover, customCoverImages, setCustomCoverImage, structureType,
        upperCoverTextures, lowerCoverTextures, setUpperCoverTextures, setLowerCoverTextures,
        upperCoverCoords, lowerCoverCoords, setUpperCoverCoords, setLowerCoverCoords,
        coverExtractSourceImage, setCoverExtractSourceImage
    } = useDesignStore();
    const { covers: customCovers, addCover, removeCover, _hydrate } = useCustomOptionsStore();
    const [showAdd, setShowAdd] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [imageGenTarget, setImageGenTarget] = useState<{ id: string; label: string; description: string; color: string; image?: string } | null>(null);
    const [textureExtractTarget, setTextureExtractTarget] = useState<{ id: string; label: string } | null>(null);

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
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
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

                            {/* 이미지 및 정보 컨테이너 (가로 배치) */}
                            <div style={{ display: 'flex', flexDirection: 'row', width: '100%', alignItems: 'stretch' }}>
                                {/* 이미지 영역 */}
                                {(customImage || cover.image) ? (
                                    <div style={{
                                        width: 140, minHeight: 110,
                                        position: 'relative',
                                        flexShrink: 0,
                                        borderRight: `1px solid ${isSelected ? `${cover.color}20` : '#f1f5f9'}`,
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
                                                position: 'absolute', bottom: 6, left: 6,
                                                background: 'rgba(15, 23, 42, 0.75)', color: '#fff',
                                                backdropFilter: 'blur(4px)',
                                                fontSize: 9, fontWeight: 700, padding: '3px 8px',
                                                borderRadius: 6, letterSpacing: 0.5,
                                            }}>
                                                AI GENERATED
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        width: 140, minHeight: 110,
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
                                <div style={{ flex: 1, padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <div style={{
                                            fontWeight: 800, fontSize: 17,
                                            color: isSelected ? '#0f172a' : '#334155',
                                            letterSpacing: '-0.3px',
                                        }}>
                                            {cover.label}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                                    fontSize: 11, fontWeight: 700, padding: '4px 10px',
                                                    borderRadius: 8, letterSpacing: '0.3px',
                                                    color: '#6366f1',
                                                    background: '#e0e7ff',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background = '#c7d2fe';
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.currentTarget as HTMLElement).style.background = '#e0e7ff';
                                                }}
                                            >
                                                <span style={{ fontSize: 12 }}>✨</span> AI 이미지
                                            </span>
                                            {/* 텍스처 추출 버튼 */}
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTextureExtractTarget({ id: cover.id, label: cover.label });
                                                }}
                                                style={{
                                                    fontSize: 11, fontWeight: 700, padding: '4px 10px',
                                                    borderRadius: 8, letterSpacing: '0.3px',
                                                    color: '#059669',
                                                    background: '#d1fae5',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    whiteSpace: 'nowrap',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#a7f3d0'; }}
                                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#d1fae5'; }}
                                            >
                                                <span style={{ fontSize: 12 }}>✂️</span> 텍스처 추출
                                            </span>
                                            <span style={{
                                                fontSize: 11, fontWeight: 700, color: displayGradeColor,
                                                background: `${displayGradeColor}15`, padding: '4px 8px', borderRadius: 6,
                                            }}>
                                                {displayGrade}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>
                                        {cover.description}
                                    </div>
                                </div>
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

            <div style={{ marginTop: 24 }}>
                <AddButton onClick={() => setShowAdd(true)} label="새 커버 디자인 추가하기" />
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

            {/* 텍스처 추출 모달 */}
            {textureExtractTarget && (
                <TextureExtractorModal
                    coverId={textureExtractTarget.id}
                    coverLabel={textureExtractTarget.label}
                    initialUpperTex={upperCoverTextures}
                    initialLowerTex={lowerCoverTextures}
                    initialUpperCoords={upperCoverCoords}
                    initialLowerCoords={lowerCoverCoords}
                    initialUpperSource={coverExtractSourceImage.upper}
                    initialLowerSource={coverExtractSourceImage.lower}
                    onSave={(upper, lower, upperCoords, lowerCoords, upperSource, lowerSource) => {
                        setUpperCoverTextures(upper);
                        setLowerCoverTextures(lower);
                        setUpperCoverCoords(upperCoords);
                        setLowerCoverCoords(lowerCoords);
                        setCoverExtractSourceImage('upper', upperSource);
                        setCoverExtractSourceImage('lower', lowerSource);
                    }}
                    onClose={() => setTextureExtractTarget(null)}
                />
            )}
        </div>
    );
}
