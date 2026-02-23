'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

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


/* ── 생성 결과 이미지 타입 ── */
interface GeneratedImage {
    imageUrl: string;
    base64: string;
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

/* ── 이미지 → Base64 ── */
async function imagePathToBase64(imagePath: string): Promise<string | null> {
    try {
        const res = await fetch(imagePath);
        if (!res.ok) return null;
        const blob = await res.blob();
        if (blob.size < 100) return null;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                const resized = await resizeImageBase64(base64);
                resolve(resized);
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

    const [anglePrompt, setAnglePrompt] = useState('');
    const [cameraAngle, setCameraAngle] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // ── 탭 상태 ──
    const [activeTab, setActiveTab] = useState<'bgswap' | 'inpaint'>('bgswap');

    // ── Inpainting 상태 ──
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [inpaintPrompt, setInpaintPrompt] = useState('');
    const [inpaintLoading, setInpaintLoading] = useState(false);
    const [inpaintResult, setInpaintResult] = useState<string | null>(null);
    const [inpaintError, setInpaintError] = useState<string | null>(null);
    const [hasStroke, setHasStroke] = useState(false);

    // ── 사용자 추가 매트리스 프롬프트 (시스템 프롬프트에 추가 적용) ──
    const [userMattressPrompt, setUserMattressPrompt] = useState('');

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasStroke(false);
    }, []);

    const drawOnCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(99,102,241,0.5)';
        ctx.beginPath();
        ctx.arc((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY, brushSize, 0, Math.PI * 2);
        ctx.fill();
        setHasStroke(true);
    };

    const getMaskBase64 = (): string | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const ctx = maskCanvas.getContext('2d')!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        const overlayData = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < overlayData.data.length; i += 4) {
            if (overlayData.data[i + 3] > 20) {
                const x = (i / 4) % canvas.width;
                const y = Math.floor((i / 4) / canvas.width);
                ctx.fillRect(x, y, 1, 1);
            }
        }
        return maskCanvas.toDataURL('image/png').split(',')[1];
    };

    const handleInpaint = async () => {
        if (!inpaintPrompt.trim()) return;
        setInpaintLoading(true);
        setInpaintError(null);
        setInpaintResult(null);
        try {
            const imgBase64 = originalRefImages[0] ?? null;
            if (!imgBase64) {
                setInpaintError('원본 커버 이미지가 로드되지 않았습니다. 잠시 기다려 주세요.');
                return;
            }
            const maskBase64 = hasStroke ? getMaskBase64() : null;
            const res = await fetch('/api/inpaint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: imgBase64, imageMimeType: 'image/jpeg', maskBase64, prompt: inpaintPrompt }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || 'Inpainting 실패');
            setInpaintResult(data.imageUrl);
        } catch (err: any) {
            setInpaintError(err.message);
        } finally {
            setInpaintLoading(false);
        }
    };

    // ── 참고 이미지 (원본 커버) ──
    const [originalRefImages, setOriginalRefImages] = useState<string[]>([]);
    const [refImageLoading, setRefImageLoading] = useState(false);

    // ── 반복 선택 워크플로우 상태 ──
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [selectedAsRef, setSelectedAsRef] = useState<GeneratedImage | null>(null);
    const [round, setRound] = useState(0);
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('1:1');

    const subjectDesc = SUBJECT_DESC[coverId] || 'a premium mattress cover';

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
        // ✅ 다시 생성 시 처음 조건으로 — 이전 선택 이미지 참조 초기화
        setSelectedAsRef(null);

        try {
            // 원본 커버 이미지만 참조 (selectedAsRef 제외)
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

            // ✅ 2장을 동시에 생성 (Promise.all 병렬 호출)
            const requests = Array.from({ length: 2 }, () =>
                fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }).then(async res => {
                    const text = await res.text();
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        throw new Error(`Server returned invalid JSON: ${text.slice(0, 100)}`);
                    }
                })
            );

            const results = await Promise.all(requests);

            const allImages: GeneratedImage[] = [];
            for (const data of results) {
                if (data.images && data.images.length > 0) {
                    allImages.push(...data.images);
                }
            }

            if (allImages.length > 0) {
                setGeneratedImages(allImages.slice(0, 2)); // 최대 2장
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

    const handleFinalSelect = () => {
        if (selectedIndex === null) return;
        const selected = generatedImages[selectedIndex];
        setFinalImage(selected.imageUrl);
    };

    /* ── 다운로드 헬퍼 ── */
    const downloadImage = (imageUrl: string, filename: string) => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        a.click();
    };

    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        }}>
            {/* ══════════════════════════════════════
                LEFT PANEL — 설정/입력
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
                        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>🎨 AI 커버 이미지 생성</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: coverColor, marginRight: 5, verticalAlign: 'middle' }} />
                            {coverLabel} · 라운드 {round}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                        fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {/* 탭 */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                    {([
                        { id: 'bgswap', label: '✨ AI 배경 생성' },
                        { id: 'inpaint', label: '🖌️ 원단 인페인팅' },
                    ] as const).map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flex: 1, padding: '11px 0', fontSize: 12, fontWeight: 700,
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === tab.id ? '#6366f1' : '#94a3b8',
                            background: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        }}>{tab.label}</button>
                    ))}
                </div>

                {/* 스크롤 가능한 본문 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

                    {/* ─── INPAINT 탭 ─── */}
                    {activeTab === 'inpaint' && (
                        <div>
                            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                                커버 이미지 위에 바꿀 영역을 칠하고 소재를 입력하세요.
                            </p>
                            <div style={{ position: 'relative', marginBottom: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', lineHeight: 0 }}>
                                {originalRefImages[0] ? (
                                    <>
                                        <img src={`data:image/jpeg;base64,${originalRefImages[0]}`} alt="원본 커버" style={{ width: '100%', display: 'block' }} />
                                        <canvas
                                            ref={canvasRef} width={640} height={400}
                                            onMouseDown={(e) => { setIsDrawing(true); drawOnCanvas(e); }}
                                            onMouseMove={(e) => { if (isDrawing) drawOnCanvas(e); }}
                                            onMouseUp={() => setIsDrawing(false)}
                                            onMouseLeave={() => setIsDrawing(false)}
                                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
                                        />
                                    </>
                                ) : (
                                    <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#94a3b8', fontSize: 13 }}>
                                        {refImageLoading ? '원본 이미지 로딩 중...' : '커버 사진이 없습니다.'}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>브러시 {brushSize}px</label>
                                <input type="range" min={5} max={80} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} style={{ flex: 1 }} />
                                <button onClick={clearCanvas} style={{ padding: '4px 12px', fontSize: 11, borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#64748b', whiteSpace: 'nowrap' }}>🗑️ 지우기</button>
                            </div>
                            <textarea
                                placeholder="예: 흰색 벨벳 원단, 고급스럽고 사실적으로"
                                value={inpaintPrompt} onChange={e => setInpaintPrompt(e.target.value)} rows={3}
                                style={{ width: '100%', padding: 10, border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                            />
                            <button onClick={handleInpaint} disabled={inpaintLoading || !inpaintPrompt.trim()} style={{
                                width: '100%', padding: '11px 0',
                                background: inpaintLoading || !inpaintPrompt.trim() ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: inpaintLoading || !inpaintPrompt.trim() ? '#94a3b8' : '#fff',
                                fontWeight: 800, fontSize: 13, border: 'none', borderRadius: 10, cursor: inpaintLoading ? 'wait' : 'pointer',
                            }}>
                                {inpaintLoading ? '🔄 AI 원단 교체 중...' : '🧥 선택 영역을 AI로 원단 교체'}
                            </button>
                            {inpaintError && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>에러: {inpaintError}</p>}
                            {inpaintResult && (
                                <div style={{ marginTop: 14 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>✅ 인페인팅 완료!</p>
                                    <img src={inpaintResult} alt="Inpaint Result" style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                        <button onClick={() => {
                                            const base64 = inpaintResult.split(',')[1];
                                            if (base64) { setOriginalRefImages([base64]); setSelectedAsRef(null); setGeneratedImages([]); setFinalImage(null); setSelectedIndex(null); setRound(0); }
                                            setActiveTab('bgswap');
                                        }} style={{ flex: 1, padding: '9px 0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 9, cursor: 'pointer' }}>
                                            ✨ 이 이미지로 배경 생성
                                        </button>
                                        <button onClick={() => { onSave(inpaintResult); onClose(); }} style={{ padding: '9px 14px', background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 9, cursor: 'pointer' }}>
                                            바로 저장
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── BGSWAP 탭 ─── */}
                    {activeTab === 'bgswap' && (
                        <>
                            {/* 참고 이미지 */}
                            <div style={{ marginBottom: 12, padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                                    {refImageLoading ? '⏳ 로딩...' : '📷 참고 이미지:'}
                                </span>
                                {originalRefImages.map((b64: string, idx: number) => (
                                    <div key={`orig-${idx}`} style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #86efac', position: 'relative' }}>
                                        <img src={`data:image/jpeg;base64,${b64}`} alt="원본" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <span style={{ position: 'absolute', top: 1, left: 1, fontSize: 7, fontWeight: 700, color: '#fff', background: '#166534', padding: '0 3px', borderRadius: 2 }}>원본</span>
                                    </div>
                                ))}
                                {selectedAsRef && (
                                    <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #7c3aed', position: 'relative' }}>
                                        <img src={selectedAsRef.imageUrl} alt="선택" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <span style={{ position: 'absolute', top: 1, left: 1, fontSize: 7, fontWeight: 700, color: '#fff', background: '#7c3aed', padding: '0 3px', borderRadius: 2 }}>선택</span>
                                    </div>
                                )}
                                <span style={{ fontSize: 10, color: '#64748b' }}>{getRefImages().length}장 사용</span>
                            </div>

                            {/* 배경/분위기 */}
                            {!finalImage && (
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
                            )}

                            {/* 카메라 앵글 */}
                            {!finalImage && (
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
                            )}

                            {/* 매트리스 추가 설명 */}
                            {!finalImage && (
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
                            )}

                            {/* 비율 선택 */}
                            {!finalImage && (
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
                            )}

                            {/* 생성 버튼 */}
                            {!finalImage && (
                                <button onClick={handleGenerate} disabled={loading || refImageLoading} style={{
                                    width: '100%', padding: '12px',
                                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: '#fff', border: 'none', borderRadius: 10,
                                    fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                                    marginBottom: 12, boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
                                }}>
                                    {loading ? '⏳ 2장 생성 중... (약 10-25초)' : round === 0 ? '🎯 2장 생성하기' : `🔄 다시 2장 생성하기 (라운드 ${round + 1})`}
                                </button>
                            )}
                            {error && <div style={{ padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, marginBottom: 10, fontSize: 11, color: '#991b1b', wordBreak: 'break-all' }}>❌ {error}</div>}

                            {/* 최종 확정 후 액션 */}
                            {finalImage && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <button onClick={() => { setFinalImage(null); setSelectedIndex(null); }} style={{ padding: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
                                        ← 다시 선택하기
                                    </button>
                                    <button onClick={() => downloadImage(finalImage, `${coverLabel}_AI.png`)} style={{ padding: '10px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                        ⬇️ 이미지 다운로드
                                    </button>
                                    <button onClick={() => { onSave(finalImage); onClose(); }} style={{ padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}>
                                        ✅ 커버에 적용하기
                                    </button>
                                </div>
                            )}

                            {!finalImage && generatedImages.length === 0 && !loading && (
                                <div style={{ textAlign: 'center', marginTop: 8 }}>
                                    <button onClick={onClose} style={{ padding: '7px 18px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: 7, fontSize: 12, cursor: 'pointer', color: '#475569' }}>닫기</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════
                RIGHT PANEL — 이미지 미리보기
            ══════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
                {/* 우측 헤더 */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        {loading ? '⏳ 생성 중...' : generatedImages.length > 0 && !finalImage ? `📸 생성 결과 ${generatedImages.length}장 — 클릭하여 선택` : finalImage ? '✅ 최종 선택 이미지' : '🖼️ 이미지 미리보기'}
                    </span>
                    {generatedImages.length > 0 && !finalImage && selectedIndex !== null && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleSelectAsRef} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                🔄 참고 이미지로 등록 &amp; 재생성
                            </button>
                            <button onClick={handleFinalSelect} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                ✅ 이 이미지로 확정
                            </button>
                        </div>
                    )}
                </div>

                {/* 이미지 표시 영역 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                    {/* 로딩 */}
                    {loading && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <div style={{ width: 56, height: 56, border: '4px solid #1e293b', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>AI가 이미지를 생성하고 있습니다...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {/* 생성된 이미지 그리드 (2장) */}
                    {!loading && generatedImages.length > 0 && !finalImage && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: aspectRatio === '9:16' ? '1fr 1fr' : aspectRatio === '16:9' ? '1fr' : '1fr 1fr',
                            gap: 12,
                        }}>
                            {generatedImages.map((img: GeneratedImage, idx: number) => {
                                const isSelected = selectedIndex === idx;
                                const arMap: Record<string, string> = {
                                    '1:1': '1/1', '3:4': '3/4', '4:3': '4/3', '16:9': '16/9', '9:16': '9/16',
                                };
                                const ar = arMap[aspectRatio] || '1/1';
                                return (
                                    <div key={idx} onClick={() => setSelectedIndex(idx)} style={{
                                        position: 'relative', borderRadius: 12, overflow: 'hidden',
                                        border: isSelected ? '3px solid #6366f1' : '2px solid #1e293b',
                                        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.3)' : 'none',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: '#1e293b',
                                    }}>
                                        <img src={img.imageUrl} alt={`생성 ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                        {isSelected && (
                                            <div style={{ position: 'absolute', top: 10, left: 10, background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6 }}>
                                                ✓ 선택됨
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5 }}>
                                            #{idx + 1}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); downloadImage(img.imageUrl, `${coverLabel}_AI_${idx + 1}.png`); }}
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

                    {/* 최종 이미지 크게 표시 */}
                    {!loading && finalImage && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <div style={{ borderRadius: 16, overflow: 'hidden', border: '3px solid #10b981', boxShadow: '0 0 0 6px rgba(16,185,129,0.15)', maxWidth: 720, width: '100%' }}>
                                <img src={finalImage} alt="최종 선택" style={{ width: '100%', display: 'block' }} />
                            </div>
                            <button onClick={() => downloadImage(finalImage, `${coverLabel}_AI_final.png`)} style={{
                                padding: '10px 28px', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}>⬇️ 최종 이미지 다운로드</button>
                        </div>
                    )}

                    {/* 빈 상태 */}
                    {!loading && generatedImages.length === 0 && !finalImage && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#334155' }}>
                            <div style={{ fontSize: 64 }}>🛏️</div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>좌측에서 설정 후 생성 버튼을 클릭하세요</p>
                            <p style={{ fontSize: 12, color: '#475569' }}>AI가 고해상도 커버 이미지 2장을 생성합니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
