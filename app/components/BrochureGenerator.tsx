import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDesignStore } from '../lib/store';
import { convertStateToBrochureData } from '../lib/brochureUtils';
import { BrochureData } from '../types/brochure';
import BrochurePreview from './brochure/BrochurePreview';
import { COVER_OPTIONS, DESIGNER_COVER_OPTIONS } from '../lib/constants';
import { usePathname } from 'next/navigation';

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
        scene: 'Warm bedroom scene. Empty dark platform bed base. Arranged on top: two white pillows, one light beige pillow, and a rust-orange square accent pillow. A tan fringed throw blanket draped across the lower right. Fluffy beige shag area rug. Left: dark wood side table with a white device. Right: modern black floor lamp with three circular discs. Background wall features pinkish-mauve wainscoting on the lower half and pale yellow above. Warm lighting with soft shadows. High-end interior design aesthetic.'
    },
    {
        id: 'clean_studio', label: '깔끔한 스튜디오', emoji: '✨', color: '#4338ca', bgColor: '#eef2ff',
        scene: 'A modern bedroom scene. An empty light grey-blue upholstered platform bed frame with a padded headboard and small black cylindrical legs. Arranged on the frame (where the mattress would be) are two large light blue-grey pillows in the back, and two textured, light pink lumbar pillows in the front. A modern gold and frosted glass spherical pendant lamp hangs in the top left corner. A section of a fluffy, textured cream and grey patterned area rug is visible on the floor in the bottom right corner. The background is a seamless light grey wall and white floor. Soft, bright studio lighting casting gentle shadows. High-end interior design aesthetic.'
    },
    {
        id: 'wood_luxury', label: '고급스러운 원목', emoji: '🏨', color: '#78350f', bgColor: '#fef9ee',
        scene: 'A minimalist bedroom scene with an empty, low-profile upholstered bed frame in a light beige fabric. The frame has a tall, padded headboard against which two large, plain white pillows are leaning. To the left of the bed is a round, sculptural side table made of light wood, holding a small white rounded rectangular object. The background features a light beige wall with subtle vertical paneling details and a large, semi-transparent screen on the right. The floor is made of light wood planks. Soft, warm natural light streams in from the left, casting a shadow of a plant on the wall.'
    },
    {
        id: 'warm_grey', label: '웜 그레이톤', emoji: '🤍', color: '#374151', bgColor: '#f3f4f6',
        scene: 'A modern bedroom scene. An empty grey upholstered bed frame with a tufted headboard and small black legs. Arranged on the frame are two white pillows, one grey accent pillow, and a brown knit throw blanket. To the left, a small wooden side table holds a white rectangular object. To the right, a chrome and glass side table holds a white rectangular object. Further right, a wooden shelving unit with black legs holds a bowl, books, and a dry branch decoration. A glass pendant lamp hangs from the top right. A white scale is visible on the floor in the bottom left corner. The background is a seamless white wall and light grey floor. Soft, even studio lighting. High-end interior design aesthetic.'
    },
    {
        id: 'cool_tone', label: '차가운 쿨톤', emoji: '❄️', color: '#1e40af', bgColor: '#eff6ff',
        scene: 'A modern, minimalist studio bedroom scene. An empty black leather Barcelona daybed frame with chrome legs sits in the center. Arranged on the frame are two large white pillows, a blue rectangular accent pillow, and a light grey blanket. To the left, a glass and chrome side table holds a black and white striped ceramic vase and stacked books. To the right, another glass and chrome side table holds a white rectangular object. A tall, thin chrome floor lamp stands behind the right side of the bed frame. A light grey area rug covers the white floor beneath the frame. The background is a seamless white wall. Soft, even studio lighting. High-end interior design aesthetic.'
    },
    {
        id: 'white_isolated', label: '매트리스만 (흰색 배경)', emoji: '🛏️', color: '#0f172a', bgColor: '#f1f5f9',
        scene: 'Isolated product shot of a mattress cover on an invisible frame. Pure, seamless white background. No props, no furniture, no shadows except subtle drop shadow beneath the mattress. Studio lighting. Clean, minimal, commercial photography aesthetic.'
    },
];

/* ── 카메라 앵글 ── */
const CAMERA_ANGLES = [
    {
        id: 'front', label: '정면', emoji: '🖼️', color: '#0f766e', bgColor: '#f0fdf4',
        scene: 'Straight-on view directly facing the front of the mattress. Eye-level perspective. Symmetrical composition.'
    },
    {
        id: 'perspective', label: '퍼스펙티브', emoji: '📐', color: '#6b21a8', bgColor: '#faf5ff',
        scene: '3/4 angled perspective view from the corner, showing the top and side of the mattress clearly.'
    },
];

interface GeneratedImage {
    imageUrl: string;
    base64: string;
}

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

/* ── 이미지 리사이징 헬퍼 ── */
async function resizeImageBase64(base64: string, maxWidth = 800, maxHeight = 800): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = () => resolve(base64);
        img.src = `data:image/jpeg;base64,${base64}`;
    });
}

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

interface BrochureGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function BrochureGenerator({ isOpen, onClose }: BrochureGeneratorProps) {
    const designState = useDesignStore();
    const pathname = usePathname();
    const isDesigner = pathname === '/designer';
    const activeCovers = isDesigner ? DESIGNER_COVER_OPTIONS : COVER_OPTIONS;
    const cover = activeCovers.find(c => c.id === designState.coverId) || activeCovers[0];
    const coverId = cover.id;
    const coverLabel = cover.label;
    const coverColor = cover.color;
    const coverImage = cover.image;

    const [mounted, setMounted] = useState(false);

    // Flow state
    const [step, setStep] = useState<'setup' | 'preview'>('setup');
    const [brochureData, setBrochureData] = useState<BrochureData | null>(null);

    // Generation UI state
    const [scenePrompt, setScenePrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [anglePrompt, setAnglePrompt] = useState('');
    const [cameraAngle, setCameraAngle] = useState<string | null>(null);
    const [userMattressPrompt, setUserMattressPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [round, setRound] = useState(0);

    // Generation core state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [selectedAsRef, setSelectedAsRef] = useState<GeneratedImage | null>(null);

    // Ref Images
    const [originalRefImages, setOriginalRefImages] = useState<string[]>([]);
    const [refImageLoading, setRefImageLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Selection state (max 5)
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    const subjectDesc = SUBJECT_DESC[coverId] || 'a premium mattress cover';

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            const initData = convertStateToBrochureData(designState);
            setBrochureData(initData);
            setStep('setup');
            setSelectedImages([]);
            setGeneratedImages([]);
            setScenePrompt(MOOD_PRESETS[1].scene); // 기본 Clean Studio
            setSelectedPreset('clean_studio');
            setAnglePrompt(CAMERA_ANGLES[0].scene);
            setCameraAngle('front');
            setRound(0);

            if (coverImage) {
                setRefImageLoading(true);
                loadCoverImages(coverId, coverImage)
                    .then((imgs) => { setOriginalRefImages(imgs); setRefImageLoading(false); })
                    .catch(() => setRefImageLoading(false));
            }
        }
    }, [isOpen, designState, coverId, coverImage]);

    // ── 자동 프롬프트 생성 (첫 진입 또는 새 이미지 업로드 시) ──
    useEffect(() => {
        if (originalRefImages.length > 0 && userMattressPrompt === '') {
            const fetchPrompt = async () => {
                try {
                    const analyzeRes = await fetch('/api/analyze-image-prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageBase64: originalRefImages[0] })
                    });
                    if (analyzeRes.ok) {
                        const data = await analyzeRes.json();
                        if (data.description) {
                            setUserMattressPrompt(data.description);
                        }
                    }
                } catch (err) {
                    console.error('Failed to auto-generate prompt from image', err);
                }
            };
            fetchPrompt();
        }
    }, [originalRefImages, coverId]); // coverId가 바뀌어 init 될 때 작동

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setRefImageLoading(true);
        const newImages: string[] = [];
        let loadedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                const resized = await resizeImageBase64(base64);
                newImages.push(resized);
                loadedCount++;
                if (loadedCount === files.length) {
                    setOriginalRefImages(prev => [...prev, ...newImages]);
                    setRefImageLoading(false);

                    // 새로 업로드한 이미지로 프롬프트 자동 갱신
                    try {
                        const analyzeRes = await fetch('/api/analyze-image-prompt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ imageBase64: newImages[0] })
                        });
                        if (analyzeRes.ok) {
                            const data = await analyzeRes.json();
                            if (data.description) {
                                setUserMattressPrompt(data.description);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to auto-generate prompt from image', err);
                    }
                }
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen || !mounted || !brochureData) return null;

    const handlePresetSelect = (p: typeof MOOD_PRESETS[0]) => {
        if (selectedPreset === p.id) { setSelectedPreset(null); setScenePrompt(''); }
        else { setSelectedPreset(p.id); setScenePrompt(p.scene); }
    };

    const handleAngleSelect = (a: typeof CAMERA_ANGLES[0]) => {
        if (cameraAngle === a.id) { setCameraAngle(null); setAnglePrompt(''); }
        else { setCameraAngle(a.id); setAnglePrompt(a.scene); }
    };

    function getRefImages(): string[] {
        const maxImages = (aspectRatio === '1:1') ? 4 : 2;
        const refs: string[] = [];
        for (const img of originalRefImages) {
            if (refs.length < maxImages) refs.push(img);
        }
        if (selectedAsRef && refs.length < maxImages) {
            refs.push(selectedAsRef.base64);
        }
        return refs;
    }

    function buildPrompt(): string {
        const scene = scenePrompt.trim() || 'in a modern bedroom with neutral tones, photorealistic 4K';
        const angle = anglePrompt.trim();
        const extra = userMattressPrompt.trim();
        let prompt = scene;
        if (angle) prompt += `. ${angle}`;
        if (extra) prompt += `. Mattress details: ${extra}`;
        return prompt;
    }

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setGeneratedImages([]);
        setSelectedIndex(null);
        setSelectedAsRef(null);

        try {
            const maxRefImages = (aspectRatio === '1:1') ? 4 : 2;
            const baseRefs = originalRefImages.slice(0, maxRefImages);

            const body: any = {
                prompt: buildPrompt(),
                coverLabel: coverLabel,
                aspectRatio: aspectRatio,
            };
            if (baseRefs.length > 0) {
                body.referenceImages = baseRefs;
                body.subjectDescription = subjectDesc;
            }

            // 2장 생성
            const requests = Array.from({ length: 2 }, () =>
                fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }).then(res => res.json())
            );

            const results = await Promise.all(requests);

            const allImages: GeneratedImage[] = [];
            for (const data of results) {
                if (data.images && data.images.length > 0) {
                    allImages.push(...data.images);
                }
            }

            if (allImages.length > 0) {
                setGeneratedImages(allImages.slice(0, 2));
                setRound((r) => r + 1);
            } else {
                const firstError = results.find(d => d.error);
                setError(firstError?.error || '이미지 생성에 실패했습니다.');
            }
        } catch (err: any) {
            setError(err.message || '네트워크 오류');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAsRef = () => {
        if (selectedIndex === null) return;
        const selected = generatedImages[selectedIndex];
        setSelectedAsRef(selected);
        setGeneratedImages([]);
        setSelectedIndex(null);
    };

    const handleAddToBrochure = () => {
        if (selectedIndex === null) return;
        const selected = generatedImages[selectedIndex];
        if (selectedImages.length >= 5) {
            alert('최대 5장까지만 선택할 수 있습니다.');
            return;
        }
        setSelectedImages(prev => [...prev, selected.imageUrl]);
        setSelectedIndex(null);
    };

    const handleFinishSelection = () => {
        if (selectedImages.length !== 5) return;

        setBrochureData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                images: {
                    page1_main: selectedImages[0],
                    page1_sub: selectedImages[1],
                    page2_layer: selectedImages[2],
                    page2_detail: selectedImages[3],
                    page2_extra: selectedImages[4],
                }
            };
        });
        setStep('preview');
    };

    /* ── 다운로드 헬퍼 ── */
    const downloadImage = (imageUrl: string, filename: string) => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        a.click();
    };

    const renderSetupUI = () => (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        }}>
            {/* ══════════════════════════════════════
                LEFT PANEL — 설정/입력 (CoverImageGenerator와 유사)
            ══════════════════════════════════════ */}
            <div style={{
                width: 420, flexShrink: 0,
                background: '#fff',
                display: 'flex', flexDirection: 'column',
                borderRight: '1px solid #e2e8f0',
                boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '18px 20px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    color: '#fff',
                }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>📖 브로셔 이미지 생성</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            브로셔에 삽입될 5장의 이미지를 만들어주세요.
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                        fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {/* 스크롤 가능한 본문 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

                    {/* 참고 이미지 */}
                    <div style={{ marginBottom: 12, padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                                {refImageLoading ? '⏳ 로딩...' : '📷 커스텀 참고 이미지 (선택사항)'}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {originalRefImages.length > 0 && (
                                    <button
                                        onClick={() => setOriginalRefImages([])}
                                        style={{ fontSize: 10, padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        전체 삭제
                                    </button>
                                )}
                                <label style={{ fontSize: 10, padding: '4px 8px', background: '#fff', color: '#166534', border: '1px solid #86efac', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>
                                    + 이미지 추가
                                    <input
                                        type="file"
                                        accept="image/jpeg, image/png, image/webp"
                                        multiple
                                        style={{ display: 'none' }}
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            </div>
                        </div>

                        {originalRefImages.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {originalRefImages.map((b64: string, idx: number) => (
                                    <div key={`orig-${idx}`} style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #86efac', position: 'relative' }}>
                                        <img src={`data:image/jpeg;base64,${b64}`} alt="원본" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => setOriginalRefImages(prev => prev.filter((_, i) => i !== idx))}
                                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                        >✕</button>
                                        <span style={{ position: 'absolute', bottom: 1, left: 1, fontSize: 7, fontWeight: 700, color: '#fff', background: '#166534', padding: '0 3px', borderRadius: 2 }}>원본</span>
                                    </div>
                                ))}
                                {selectedAsRef && (
                                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #7c3aed', position: 'relative' }}>
                                        <img src={selectedAsRef.imageUrl} alt="선택" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <span style={{ position: 'absolute', bottom: 1, left: 1, fontSize: 7, fontWeight: 700, color: '#fff', background: '#7c3aed', padding: '0 3px', borderRadius: 2 }}>선택</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <span style={{ fontSize: 10, color: '#64748b' }}>{getRefImages().length}장 사용</span>
                    </div>

                    {/* 배경/분위기 */}
                    <div style={{ marginBottom: 10, padding: 10, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5 }}>🎬 배경/분위기</div>
                        <textarea
                            value={scenePrompt}
                            onChange={(e) => { setScenePrompt(e.target.value); setSelectedPreset(null); }}
                            rows={2}
                            placeholder="예: in a warm modern bedroom with oak furniture, photorealistic 4K"
                            style={{ width: '100%', padding: 7, border: '1px solid #bae6fd', borderRadius: 7, fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                        />
                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {MOOD_PRESETS.map((p) => {
                                const active = selectedPreset === p.id;
                                return (
                                    <button key={p.id} onClick={() => handlePresetSelect(p)} style={{
                                        display: 'flex', alignItems: 'center', gap: 3,
                                        padding: '3px 7px', borderRadius: 6,
                                        border: `1.5px solid ${active ? p.color : '#e2e8f0'}`,
                                        background: active ? p.bgColor : '#fff',
                                        color: active ? p.color : '#64748b',
                                        fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                    }}>
                                        <span style={{ fontSize: 11 }}>{p.emoji}</span>{p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 카메라 앵글 */}
                    <div style={{ marginBottom: 10, padding: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5 }}>🎥 카메라 앵글</div>
                        <textarea
                            value={anglePrompt}
                            onChange={(e) => { setAnglePrompt(e.target.value); setCameraAngle(null); }}
                            rows={2}
                            placeholder="예: Straight-on view directly facing the front"
                            style={{ width: '100%', padding: 7, border: '1px solid #ddd6fe', borderRadius: 7, fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                        />
                        <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {CAMERA_ANGLES.map((a) => {
                                const active = cameraAngle === a.id;
                                return (
                                    <button key={a.id} onClick={() => handleAngleSelect(a)} style={{
                                        display: 'flex', alignItems: 'center', gap: 3,
                                        padding: '3px 7px', borderRadius: 6,
                                        border: `1.5px solid ${active ? a.color : '#e2e8f0'}`,
                                        background: active ? a.bgColor : '#fff',
                                        color: active ? a.color : '#64748b',
                                        fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                    }}>
                                        <span style={{ fontSize: 11 }}>{a.emoji}</span>{a.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 매트리스 추가 설명 */}
                    <div style={{ marginBottom: 10, padding: 10, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                            🛏️ 매트리스 추가 설명 <span style={{ fontWeight: 400, color: '#a16207' }}>(선택사항)</span>
                        </div>
                        <textarea
                            value={userMattressPrompt} onChange={(e) => setUserMattressPrompt(e.target.value)} rows={2}
                            placeholder="예: with thick pillow-top quilting and blue piping"
                            style={{ width: '100%', padding: 7, border: '1px solid #fde68a', borderRadius: 7, fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', background: '#fffbeb' }}
                        />
                        {userMattressPrompt.trim() && <div style={{ marginTop: 5, fontSize: 10, color: '#78350f' }}>🔍 최종 프롬프트: <em style={{ color: '#4f46e5' }}>"{buildPrompt()}"</em></div>}
                    </div>

                    {/* 비율 선택 */}
                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginRight: 2 }}>📐 비율:</span>
                        {(['1:1', '3:4', '4:3', '16:9', '9:16'] as const).map((ratio) => {
                            const active = aspectRatio === ratio;
                            const dims: Record<string, { w: number; h: number }> = {
                                '1:1': { w: 16, h: 16 },
                                '3:4': { w: 12, h: 16 },
                                '4:3': { w: 16, h: 12 },
                                '16:9': { w: 18, h: 10 },
                                '9:16': { w: 10, h: 18 },
                            };
                            const d = dims[ratio];
                            return (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)} style={{
                                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 7,
                                    border: `1.5px solid ${active ? '#4f46e5' : '#e2e8f0'}`,
                                    background: active ? '#eef2ff' : '#fff',
                                    color: active ? '#4f46e5' : '#64748b',
                                    fontSize: 10, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                }}>
                                    <div style={{ width: d.w, height: d.h, border: `1.5px solid ${active ? '#4f46e5' : '#94a3b8'}`, borderRadius: 2 }} />
                                    {ratio}
                                </button>
                            );
                        })}
                    </div>

                    {/* 생성 버튼 */}
                    <button onClick={handleGenerate} disabled={loading || refImageLoading} style={{
                        width: '100%', padding: '12px',
                        background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: 12, boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
                    }}>
                        {loading ? '⏳ 2장 생성 중... (약 10~25초)' : round === 0 ? '🎯 2장 생성하기' : `🔄 다시 2장 생성하기 (라운드 ${round + 1})`}
                    </button>
                    {error && <div style={{ padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, marginBottom: 10, fontSize: 11, color: '#991b1b', wordBreak: 'break-all' }}>❌ {error}</div>}
                </div>
            </div>

            {/* ══════════════════════════════════════
                RIGHT PANEL — 이미지 미리보기 & 장바구니
            ══════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
                {/* 우측 상단 헤더 */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        {loading ? '⏳ 생성 중...' : generatedImages.length > 0 ? `📸 생성 결과 ${generatedImages.length}장 — 클릭하여 선택` : '🖼️ 이미지 미리보기'}
                    </span>
                    {generatedImages.length > 0 && selectedIndex !== null && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleSelectAsRef} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                🔄 참고 이미지로 등록 &amp; 재생성
                            </button>
                            <button onClick={handleAddToBrochure} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                ✅ 이 이미지를 브로셔에 사용하기
                            </button>
                        </div>
                    )}
                </div>

                {/* 이미지 표시 영역 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                    {loading && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <div style={{ width: 56, height: 56, border: '4px solid #1e293b', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>AI가 이미지를 생성하고 있습니다...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {!loading && generatedImages.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: aspectRatio === '9:16' ? '1fr 1fr' : aspectRatio === '16:9' ? '1fr' : '1fr 1fr',
                            gap: 12,
                        }}>
                            {generatedImages.map((img: GeneratedImage, idx: number) => {
                                const isSelected = selectedIndex === idx;
                                return (
                                    <div key={idx} onClick={() => setSelectedIndex(idx)} style={{
                                        position: 'relative', borderRadius: 12, overflow: 'hidden',
                                        border: isSelected ? '3px solid #10b981' : '2px solid #1e293b',
                                        boxShadow: isSelected ? '0 0 0 3px rgba(16,185,129,0.3)' : 'none',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: '#1e293b',
                                    }}>
                                        <img src={img.imageUrl} alt={`생성 ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                        {isSelected && (
                                            <div style={{ position: 'absolute', top: 10, left: 10, background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6 }}>
                                                ✓ 선택됨
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5 }}>
                                            #{idx + 1}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); downloadImage(img.imageUrl, `${coverLabel}_Brochure_${idx + 1}.png`); }}
                                            style={{
                                                position: 'absolute', bottom: 10, right: 10,
                                                background: 'rgba(14,165,233,0.9)', color: '#fff',
                                                border: 'none', borderRadius: 6, padding: '4px 10px',
                                                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                            }}
                                        >⬇️ 다운로드</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && generatedImages.length === 0 && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#334155' }}>
                            <div style={{ fontSize: 64 }}>🛏️</div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>좌측에서 설정 후 생성 버튼을 클릭하세요</p>
                            <p style={{ fontSize: 12, color: '#475569' }}>선택된 이미지는 아래 슬롯에 저장됩니다. 총 5장을 채워주세요.</p>
                        </div>
                    )}
                </div>

                {/* 하단 5장 선택 장바구니 구역 */}
                <div style={{ padding: '20px', borderTop: '1px solid #1e293b', background: '#090e17' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>브로셔 이미지 선택된 목록 ({selectedImages.length}/5)</span>
                        <button
                            onClick={handleFinishSelection}
                            disabled={selectedImages.length !== 5}
                            style={{
                                padding: '10px 20px', borderRadius: 8,
                                background: selectedImages.length === 5 ? '#10b981' : '#334155',
                                color: selectedImages.length === 5 ? '#fff' : '#64748b',
                                border: 'none', fontWeight: 800, fontSize: 13,
                                cursor: selectedImages.length === 5 ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s', boxShadow: selectedImages.length === 5 ? '0 4px 14px rgba(16,185,129,0.3)' : 'none'
                            }}>
                            브로셔 디자인 확인하기 ➔
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {Array.from({ length: 5 }).map((_, i) => {
                            const img = selectedImages[i];
                            return (
                                <div key={i} style={{
                                    width: 72, height: 72, borderRadius: 8, border: '2px dashed #475569',
                                    background: img ? `url(${img}) center/cover` : '#1e293b',
                                    position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {!img && <span style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>{i + 1}</span>}
                                    {img && (
                                        <button onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))} style={{
                                            position: 'absolute', top: 4, right: 4,
                                            background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                                            borderRadius: '50%', width: 20, height: 20, fontSize: 12,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0
                                        }}>✕</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(
        <>
            {step === 'setup' && renderSetupUI()}
            {step === 'preview' && (
                <BrochurePreview
                    data={brochureData!}
                    onUpdatePrompts={() => { }}
                    onClose={onClose}
                    onBack={() => setStep('setup')}
                />
            )}
        </>,
        document.body
    );
}
