'use client';

import { useState, useEffect } from 'react';

interface CoverImageGeneratorModalProps {
    coverId: string;
    coverLabel: string;
    coverDescription: string;
    coverColor: string;
    coverImage?: string;
    onSave: (imageUrl: string) => void;
    onClose: () => void;
}

/* ── 커버 ID → 파일명 베이스 매핑 ── */
const COVER_FILE_BASE: Record<string, string> = {
    'HEALING_NUMBER': '힐링넘버',
    'OAK_TWEED': '오크트위드',
    'FLAT_GRID': '플랫그리드',
    'ALL_CARE': '올케어',
    'GENTLE_BREED': '젠틀브리즈',
    'I5': 'i5',
    'COMPACT': '컴팩트',
};

/* ── Subject Description ── */
const SUBJECT_DESC: Record<string, string> = {
    'HEALING_NUMBER': 'a beige quilted mattress cover with diamond pattern stitching and fabric label',
    'OAK_TWEED': 'a brown tweed fabric mattress cover with woven texture and edge piping',
    'FLAT_GRID': 'a grey modern mattress cover with flat grid pattern and clean lines',
    'ALL_CARE': 'a light blue antimicrobial mattress cover with smooth surface and brand label',
    'GENTLE_BREED': 'a dark navy premium mattress cover with fine knit texture and gold label',
    'I5': 'a black premium mattress cover with sleek charcoal surface and metallic branding',
    'COMPACT': 'a sage green compact mattress cover with simple quilted pattern',
};

/* ── 분위기 프리셋 ── */
const MOOD_PRESETS = [
    {
        id: 'warm_brown', label: '따뜻한 실내 갈색', emoji: '🪵', color: '#92400e', bgColor: '#fef3c7',
        scene: 'Warm bedroom scene. Empty dark platform bed base. Arranged on top: two white pillows, one light beige pillow, and a rust-orange square accent pillow. A tan fringed throw blanket draped across the lower right. Fluffy beige shag area rug. Left: dark wood side table with a white device. Right: modern black floor lamp with three circular discs. Background wall features pinkish-mauve wainscoting on the lower half and pale yellow above. Warm lighting with soft shadows. 3/4 angled perspective view from the right.'
    },
    {
        id: 'clean_studio', label: '깔끔한 스튜디오', emoji: '✨', color: '#4338ca', bgColor: '#eef2ff',
        scene: 'A modern bedroom scene. An empty light grey-blue upholstered platform bed frame with a padded headboard and small black cylindrical legs. Arranged on the frame (where the mattress would be) are two large light blue-grey pillows in the back, and two textured, light pink lumbar pillows in the front. A modern gold and frosted glass spherical pendant lamp hangs in the top left corner. A section of a fluffy, textured cream and grey patterned area rug is visible on the floor in the bottom right corner. The background is a seamless light grey wall and white floor. Soft, bright studio lighting casting gentle shadows. 3/4 angled perspective view from the front-left. High-end interior design aesthetic.'
    },
    {
        id: 'wood_luxury', label: '고급스러운 원목', emoji: '🏨', color: '#78350f', bgColor: '#fef9ee',
        scene: 'A minimalist bedroom scene with an empty, low-profile upholstered bed frame in a light beige fabric. The frame has a tall, padded headboard against which two large, plain white pillows are leaning. To the left of the bed is a round, sculptural side table made of light wood, holding a small white rounded rectangular object. The background features a light beige wall with subtle vertical paneling details and a large, semi-transparent screen on the right. The floor is made of light wood planks. Soft, warm natural light streams in from the left, casting a shadow of a plant on the wall. Front straight-on perspective view at eye level.'
    },
    {
        id: 'warm_grey', label: '웜 그레이톤', emoji: '🤍', color: '#374151', bgColor: '#f3f4f6',
        scene: 'A modern bedroom scene. An empty grey upholstered bed frame with a tufted headboard and small black legs. Arranged on the frame are two white pillows, one grey accent pillow, and a brown knit throw blanket. To the left, a small wooden side table holds a white rectangular object. To the right, a chrome and glass side table holds a white rectangular object. Further right, a wooden shelving unit with black legs holds a bowl, books, and a dry branch decoration. A glass pendant lamp hangs from the top right. A white scale is visible on the floor in the bottom left corner. The background is a seamless white wall and light grey floor. Soft, even studio lighting. Front straight-on perspective view. High-end interior design aesthetic.'
    },
    {
        id: 'cool_tone', label: '차가운 쿨톤', emoji: '❄️', color: '#1e40af', bgColor: '#eff6ff',
        scene: 'A modern, minimalist studio bedroom scene. An empty black leather Barcelona daybed frame with chrome legs sits in the center. Arranged on the frame are two large white pillows, a blue rectangular accent pillow, and a light grey blanket. To the left, a glass and chrome side table holds a black and white striped ceramic vase and stacked books. To the right, another glass and chrome side table holds a white rectangular object. A tall, thin chrome floor lamp stands behind the right side of the bed frame. A light grey area rug covers the white floor beneath the frame. The background is a seamless white wall. Soft, even studio lighting. Front straight-on perspective view. High-end interior design aesthetic.'
    },
];

/* ── 생성 결과 이미지 타입 ── */
interface GeneratedImage {
    imageUrl: string;
    base64: string;
}

/* ── 이미지 → Base64 ── */
async function imagePathToBase64(imagePath: string): Promise<string | null> {
    try {
        const res = await fetch(imagePath);
        if (!res.ok) return null;
        const blob = await res.blob();
        if (blob.size < 100) return null;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(',')[1]);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

/* ── 복수 이미지 로드 ── */
async function loadCoverImages(coverId: string, basePath: string): Promise<string[]> {
    const fileBase = COVER_FILE_BASE[coverId];
    if (!fileBase) {
        const b64 = await imagePathToBase64(basePath);
        return b64 ? [b64] : [];
    }
    const candidates = [
        `/covers/${fileBase}.jpg`,
        `/covers/${fileBase}_01.jpg`,
        `/covers/${fileBase}_02.jpg`,
        `/covers/${fileBase}_03.jpg`,
        `/covers/${fileBase}_04.jpg`,
    ];
    const results = await Promise.all(candidates.map(imagePathToBase64));
    return results.filter((b): b is string => b !== null);
}

export default function CoverImageGeneratorModal({
    coverId, coverLabel, coverDescription, coverColor, coverImage, onSave, onClose,
}: CoverImageGeneratorModalProps) {

    const [scenePrompt, setScenePrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 참고 이미지 (원본 커버)
    const [originalRefImages, setOriginalRefImages] = useState<string[]>([]);
    const [refImageLoading, setRefImageLoading] = useState(false);

    // ── 반복 선택 워크플로우 상태 ──
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [selectedAsRef, setSelectedAsRef] = useState<GeneratedImage | null>(null);  // 선택 → 참고 등록
    const [round, setRound] = useState(0);  // 생성 라운드
    const [finalImage, setFinalImage] = useState<string | null>(null);  // 최종 확정 이미지
    const [aspectRatio, setAspectRatio] = useState('1:1');  // 비율 선택

    const subjectDesc = SUBJECT_DESC[coverId] || 'a premium mattress cover';

    // 커버 이미지 사전 로드
    useEffect(() => {
        if (coverImage) {
            setRefImageLoading(true);
            loadCoverImages(coverId, coverImage)
                .then((imgs) => { setOriginalRefImages(imgs); setRefImageLoading(false); })
                .catch(() => setRefImageLoading(false));
        }
    }, [coverId, coverImage]);

    const handlePresetSelect = (p: typeof MOOD_PRESETS[0]) => {
        if (selectedPreset === p.id) { setSelectedPreset(null); setScenePrompt(''); }
        else { setSelectedPreset(p.id); setScenePrompt(p.scene); }
    };

    /* ── 현재 사용할 참고 이미지 결정 ── */
    function getRefImages(): string[] {
        const maxImages = aspectRatio === '1:1' ? 4 : 2;
        const refs: string[] = [];
        // 원본 커버 이미지 전부 추가
        for (const img of originalRefImages) {
            if (refs.length < maxImages) refs.push(img);
        }
        // 이전 라운드에서 선택한 이미지 추가 (여유 있으면)
        if (selectedAsRef && refs.length < maxImages) {
            refs.push(selectedAsRef.base64);
        }
        return refs;
    }

    function buildPrompt(): string {
        const scene = scenePrompt.trim() || 'in a modern bedroom with neutral tones, photorealistic 4K';
        const refs = getRefImages();
        if (refs.length > 0) {
            return `Create an image about ${subjectDesc} [1] to match the description: ${scene}`;
        }
        return `A premium ${coverLabel} mattress ${scene}`;
    }

    /* ── 이미지 생성 ── */
    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setGeneratedImages([]);
        setSelectedIndex(null);

        try {
            const refs = getRefImages();
            const body: any = {
                prompt: buildPrompt(),
                aspectRatio: aspectRatio,
            };
            if (refs.length > 0) {
                body.referenceImages = refs;
                body.subjectDescription = subjectDesc;
            }

            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || `API Error: ${res.status}`);
                return;
            }

            if (data.images && data.images.length > 0) {
                setGeneratedImages(data.images);
                setRound((r) => r + 1);
            } else {
                setError('이미지 생성에 실패했습니다.');
            }
        } catch (err: any) {
            setError(err.message || '네트워크 오류');
        } finally {
            setLoading(false);
        }
    };

    /* ── 선택한 이미지를 참고 이미지로 등록 ── */
    const handleSelectAsRef = () => {
        if (selectedIndex === null) return;
        const selected = generatedImages[selectedIndex];
        setSelectedAsRef(selected);
        setGeneratedImages([]);
        setSelectedIndex(null);
    };

    /* ── 최종 확정 ── */
    const handleFinalSelect = () => {
        if (selectedIndex === null) return;
        const selected = generatedImages[selectedIndex];
        setFinalImage(selected.imageUrl);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 16,
                    width: 620, maxHeight: '92vh', overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: 24,
                }}
            >
                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                            🎨 AI 커버 이미지 생성
                        </h2>
                        <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                            <span style={{
                                display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                                background: coverColor, marginRight: 6, verticalAlign: 'middle',
                            }} />
                            {coverLabel} · 라운드 {round}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 30, height: 30, border: 'none', background: '#f1f5f9',
                        borderRadius: 8, fontSize: 15, cursor: 'pointer', color: '#64748b',
                    }}>✕</button>
                </div>

                {/* ── 참고 이미지 상태 ── */}
                <div style={{
                    marginBottom: 12, padding: 10,
                    background: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                        {refImageLoading ? '⏳ 로딩...' : `📷 참고 이미지:`}
                    </span>

                    {/* 원본 이미지 썸네일 */}
                    {originalRefImages.map((b64, idx) => (
                        <div key={`orig-${idx}`} style={{
                            width: 50, height: 50, borderRadius: 6, overflow: 'hidden',
                            border: '2px solid #86efac', position: 'relative',
                        }}>
                            <img src={`data:image/jpeg;base64,${b64}`} alt="원본"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{
                                position: 'absolute', top: 1, left: 2,
                                fontSize: 8, fontWeight: 700, color: '#fff',
                                background: '#166534', padding: '0 3px', borderRadius: 3,
                            }}>원본</span>
                        </div>
                    ))}

                    {/* 이전 선택 이미지 썸네일 */}
                    {selectedAsRef && (
                        <div style={{
                            width: 50, height: 50, borderRadius: 6, overflow: 'hidden',
                            border: '2px solid #7c3aed', position: 'relative',
                        }}>
                            <img src={selectedAsRef.imageUrl} alt="선택"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{
                                position: 'absolute', top: 1, left: 2,
                                fontSize: 8, fontWeight: 700, color: '#fff',
                                background: '#7c3aed', padding: '0 3px', borderRadius: 3,
                            }}>선택</span>
                        </div>
                    )}

                    <span style={{ fontSize: 10, color: '#64748b' }}>
                        {getRefImages().length}장 사용 (최대 2장)
                    </span>
                </div>

                {/* ── 장면 프롬프트 (생성 전에만 표시) ── */}
                {!finalImage && (
                    <div style={{
                        marginBottom: 12, padding: 12,
                        background: '#f0f9ff', border: '1px solid #bae6fd',
                        borderRadius: 10,
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                            🎬 배경/분위기
                        </div>
                        <textarea
                            value={scenePrompt}
                            onChange={(e) => { setScenePrompt(e.target.value); setSelectedPreset(null); }}
                            rows={2}
                            placeholder="예: in a warm modern bedroom with oak furniture, photorealistic 4K"
                            style={{
                                width: '100%', padding: 8, border: '1px solid #bae6fd',
                                borderRadius: 8, fontSize: 11, fontFamily: 'monospace',
                                resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
                            }}
                        />
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {MOOD_PRESETS.map((p) => {
                                const active = selectedPreset === p.id;
                                return (
                                    <button key={p.id} onClick={() => handlePresetSelect(p)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 3,
                                            padding: '4px 8px', borderRadius: 6,
                                            border: `1.5px solid ${active ? p.color : '#e2e8f0'}`,
                                            background: active ? p.bgColor : '#fff',
                                            color: active ? p.color : '#64748b',
                                            fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                        }}
                                    >
                                        <span style={{ fontSize: 12 }}>{p.emoji}</span>
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── 비율 선택 ── */}
                {!finalImage && (
                    <div style={{
                        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>📐 비율:</span>
                        {(['1:1', '3:4', '4:3'] as const).map((ratio) => {
                            const active = aspectRatio === ratio;
                            const dims: Record<string, { w: number; h: number }> = {
                                '1:1': { w: 16, h: 16 },
                                '3:4': { w: 12, h: 16 },
                                '4:3': { w: 16, h: 12 },
                            };
                            const d = dims[ratio];
                            return (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '5px 10px', borderRadius: 8,
                                        border: `1.5px solid ${active ? '#4f46e5' : '#e2e8f0'}`,
                                        background: active ? '#eef2ff' : '#fff',
                                        color: active ? '#4f46e5' : '#64748b',
                                        fontSize: 11, fontWeight: active ? 700 : 500,
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{
                                        width: d.w, height: d.h,
                                        border: `1.5px solid ${active ? '#4f46e5' : '#94a3b8'}`,
                                        borderRadius: 2,
                                    }} />
                                    {ratio}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── 생성 버튼 ── */}
                {!finalImage && (
                    <button
                        onClick={handleGenerate}
                        disabled={loading || refImageLoading}
                        style={{
                            width: '100%', padding: '11px',
                            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: '#fff', border: 'none', borderRadius: 10,
                            fontSize: 13, fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginBottom: 14,
                        }}
                    >
                        {loading
                            ? '⏳ 4장 생성 중... (약 15-40초)'
                            : round === 0
                                ? '🎯 4장 생성하기'
                                : `🔄 다시 4장 생성하기 (라운드 ${round + 1})`}
                    </button>
                )}

                {/* ── 에러 ── */}
                {error && (
                    <div style={{
                        padding: 8, background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: 8, marginBottom: 12, fontSize: 11, color: '#991b1b',
                        wordBreak: 'break-all',
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* ── 4장 그리드 ── */}
                {generatedImages.length > 0 && !finalImage && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                            📸 생성 결과 — 1장을 선택하세요
                        </div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                            gap: 8, marginBottom: 12,
                        }}>
                            {generatedImages.map((img, idx) => {
                                const isSelected = selectedIndex === idx;
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        style={{
                                            borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                                            border: isSelected ? '3px solid #7c3aed' : '2px solid #e2e8f0',
                                            boxShadow: isSelected ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                                            transition: 'all 0.15s',
                                            position: 'relative',
                                        }}
                                    >
                                        <img src={img.imageUrl} alt={`생성 ${idx + 1}`}
                                            style={{ width: '100%', display: 'block', aspectRatio: '1/1', objectFit: 'cover' }} />
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute', top: 6, right: 6,
                                                background: '#7c3aed', color: '#fff',
                                                fontSize: 10, fontWeight: 700,
                                                padding: '3px 8px', borderRadius: 6,
                                            }}>✓ 선택됨</div>
                                        )}
                                        <div style={{
                                            position: 'absolute', bottom: 6, left: 6,
                                            background: 'rgba(0,0,0,0.6)', color: '#fff',
                                            fontSize: 10, fontWeight: 600,
                                            padding: '2px 6px', borderRadius: 4,
                                        }}>#{idx + 1}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 선택 후 액션 버튼 */}
                        {selectedIndex !== null && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <button
                                    onClick={handleSelectAsRef}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        color: '#fff', border: 'none', borderRadius: 8,
                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    🔄 선택 → 참고 이미지로 등록 & 재생성
                                </button>
                                <button
                                    onClick={handleFinalSelect}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#fff', border: 'none', borderRadius: 8,
                                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    ✅ 이 이미지로 확정
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 최종 확정 이미지 ── */}
                {finalImage && (
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                            ✅ 최종 선택 이미지
                        </div>
                        <div style={{
                            border: '3px solid #10b981', borderRadius: 12,
                            overflow: 'hidden', marginBottom: 14,
                        }}>
                            <img src={finalImage} alt="최종" style={{ width: '100%', display: 'block' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => { setFinalImage(null); setSelectedIndex(null); }}
                                style={{
                                    flex: 1, padding: '10px',
                                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                                    borderRadius: 8, fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', color: '#475569',
                                }}
                            >
                                ← 다시 선택하기
                            </button>
                            <button
                                onClick={() => { onSave(finalImage); onClose(); }}
                                style={{
                                    flex: 1, padding: '10px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: '#fff', border: 'none', borderRadius: 8,
                                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                                }}
                            >
                                ✅ 이 이미지 적용
                            </button>
                        </div>
                    </div>
                )}

                {/* ── 닫기 버튼 (진행 중) ── */}
                {!finalImage && generatedImages.length === 0 && !loading && (
                    <div style={{ textAlign: 'right' }}>
                        <button onClick={onClose} style={{
                            padding: '8px 20px', border: '1px solid #e2e8f0',
                            background: '#fff', borderRadius: 8,
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569',
                        }}>닫기</button>
                    </div>
                )}
            </div>
        </div>
    );
}
