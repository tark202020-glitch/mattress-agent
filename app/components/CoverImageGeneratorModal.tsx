'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useDesignStore } from '../lib/store';

const TextureExtractorModal = dynamic(() => import('./TextureExtractorModal'), { ssr: false });

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
const COVER_FILE_BASE: Record<string, string[]> = {
    'HEALING_NUMBER': ['힐링넘버.jpg', '힐링넘버01.png', '힐링넘버02.png'],
    'OAK_TWEED': ['오크트위드.jpg', '오크트위드01.png', '오크트위드02.png'],
    'FLAT_GRID': ['플랫그리드.jpg', '플랫그리드01.png', '플랫그리드02.png'],
    'ALL_CARE': ['올케어.jpg', '올케어01.jpg', '올케어02.jpg'],
    'GENTLE_BREED': ['젠틀브리즈.jpg', '젠틀브리즈01.jpg', '젠틀브리즈02.jpg'],
    'I5': ['i5.jpg', 'i501.jpg', 'i502.jpg'],
    'COMPACT': ['컴팩트.jpg', '컴팩트01.png', '컴팩트02.png'],
};

/* ── 고정 프롬프트 데이터 ── */
const FIXED_SCENE = '보이지 않는 프레임 위에 올려진 매트리스 커버의 단독 제품 컷. 매트리스는 가로 1500mm, 세로(깊이) 2000mm의 직사각형 형태를 가집니다 (가로보다 세로가 더 길어야 하며, 절대 정사각형으로 보이면 안 됩니다). 순수하고 이음새 없는 흰색 배경. 주변 소품, 가구, 그림자 없이 매트리스 아래의 미세한 그림자만 허용됩니다. 스튜디오 조명. 깔끔하고 미니멀한 상업 사진 미학.';
const FIXED_ANGLES = [
    { id: 'front', label: '정면', prompt: '매트리스 정면을 살짝 위쪽 눈높이에서 보여주는 정면 뷰. 대칭 구도. 매트리스의 가로보다 세로(깊이)가 길어 보여야 합니다.' },
    { id: 'perspective', label: '퍼스펙티브', prompt: '모서리에서 바라본 3/4 각도 퍼스펙티브 뷰. 매트리스의 윗면과 측면이 모두 선명하게 보여야 합니다. 매트리스의 세로 깊이가 가로 폭보다 시각적으로 길게 확장되어야 합니다.' },
    { id: 'detail', label: '디테일', prompt: '매트리스의 우측 전면 모서리만 매우 가깝게 클로즈업. 매트리스 전체 모습이 보이지 않도록 화면을 모서리로만 가득 채웁니다. 원근 왜곡이 없는 직교(Orthographic) 평면 투영 방식이며, 모든 평행선은 평행하게 유지됩니다. 평면 위에서 우측 45도 각도로 내려다보는 시점. 상단의 퀼팅 텍스처, 파이핑/지퍼 스티치, 측면 원단 디테일, 모서리 박음질이 선명하게 보여야 합니다.' }
];


/* ── 생성 결과 이미지 타입 ── */
interface GeneratedImage {
    imageUrl: string;
    base64: string;
    angleId?: string;
}

/* ── 이미지를 정사각형 2048×2048로 리사이징 ── */
async function resizeToSquare(base64Data: string, size: number = 2048): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            // 흰색 배경
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            // 중앙 정렬로 이미지를 맞춤
            const scale = Math.min(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (size - w) / 2;
            const y = (size - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            // base64 추출 (prefix 없이)
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl.split(',')[1]);
        };
        img.onerror = () => resolve(base64Data);
        // base64에 prefix가 없으면 추가
        if (base64Data.startsWith('data:')) {
            img.src = base64Data;
        } else {
            img.src = `data:image/png;base64,${base64Data}`;
        }
    });
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
    const fileBases = COVER_FILE_BASE[coverId];
    if (!fileBases || fileBases.length === 0) {
        const b64 = await imagePathToBase64(basePath);
        return b64 ? [b64] : [];
    }

    // COVER_FILE_BASE 배열에 있는 모든 이미지 경로를 시도
    const candidates = fileBases.map(filename => `/covers/${filename}`);

    // basePath (보통 썸네일)도 항상 첫 번째로 추가 (중복 방지)
    if (basePath && !candidates.includes(basePath)) {
        candidates.unshift(basePath);
    }

    const results = await Promise.all(candidates.map(imagePathToBase64));
    return results.filter((b): b is string => b !== null);
}

export default function CoverImageGeneratorModal({
    coverId, coverLabel, coverDescription, coverColor, coverImage, onSave, onClose,
}: CoverImageGeneratorModalProps) {

    // ── localStorage 키 (커버ID별 고유) ──
    const SETTINGS_KEY = `ai-cover-settings-${coverId}`;

    // ── 매트리스 디자인 폼 필드 ──
    const [topColor, setTopColor] = useState('');
    const [topPattern, setTopPattern] = useState('');
    const [pipingColor, setPipingColor] = useState('');
    const [sideColor, setSideColor] = useState('');
    const [sidePattern, setSidePattern] = useState('');
    const [labelStyle, setLabelStyle] = useState('');
    const [savedRefImages, setSavedRefImages] = useState<string[]>([]);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [showTextureModal, setShowTextureModal] = useState(false);
    // 📁 (핵심) 사용자 PC 로컬 저장 폴더 핸들 상태 (File System Access API)
    const [saveDirectory, setSaveDirectory] = useState<FileSystemDirectoryHandle | null>(null);

    // 앵글 커스텀 프롬프트 상태
    const [customAnglePrompts, setCustomAnglePrompts] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        FIXED_ANGLES.forEach(a => init[a.id] = a.prompt);
        return init;
    });

    const handleAnglePromptChange = (id: string, value: string) => {
        setCustomAnglePrompts(prev => ({ ...prev, [id]: value }));
    };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // ── 저장된 설정 로드 (커버ID별) ──
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.topColor) setTopColor(saved.topColor);
                if (saved.topPattern) setTopPattern(saved.topPattern);
                if (saved.pipingColor) setPipingColor(saved.pipingColor);
                if (saved.sideColor) setSideColor(saved.sideColor);
                if (saved.sidePattern) setSidePattern(saved.sidePattern);
                if (saved.labelStyle) setLabelStyle(saved.labelStyle);
                if (saved.refImages && saved.refImages.length > 0) {
                    setSavedRefImages(saved.refImages);
                }
                if (saved.customAnglePrompts) {
                    setCustomAnglePrompts(saved.customAnglePrompts);
                }
                console.log(`[AI Cover] ✅ 저장된 설정 로드: ${coverId}`);
            }
        } catch (e) {
            console.warn('[AI Cover] 설정 로드 실패:', e);
        }
        setSettingsLoaded(true);
    }, [coverId, SETTINGS_KEY]);


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

    // ── 매트리스 프롬프트 조합 함수 ──
    const getMattressDescription = useCallback(() => {
        return [
            topColor && `Top Color: ${topColor}`,
            topPattern && `Top Pattern: ${topPattern}`,
            pipingColor && `Piping Color: ${pipingColor}`,
            sideColor && `Side Color: ${sideColor}`,
            sidePattern && `Side Pattern: ${sidePattern}`,
            labelStyle && `Label Style: ${labelStyle}`
        ].filter(Boolean).join(', ');
    }, [topColor, topPattern, pipingColor, sideColor, sidePattern, labelStyle]);
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── 설정 저장 함수 (originalRefImages 선언 후) ──
    const handleSaveSettings = useCallback(() => {
        try {
            const settings = {
                topColor, topPattern, pipingColor, sideColor, sidePattern, labelStyle,
                refImages: originalRefImages.slice(0, 5),
                customAnglePrompts,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            alert(`✅ "${coverLabel}" 설정이 저장되었습니다.\n다음에 이 디자인을 선택하면 자동으로 복원됩니다.`);
        } catch (e) {
            console.error('[AI Cover] 설정 저장 실패:', e);
            alert('설정 저장 실패 (저장 용량 초과 가능)');
        }
    }, [topColor, topPattern, pipingColor, sideColor, sidePattern, labelStyle, originalRefImages, customAnglePrompts, SETTINGS_KEY, coverLabel]);



    useEffect(() => {
        // analyze prompt on original reference image load - skipped to prevent overriding structural fields automatically
    }, [originalRefImages, coverId]);

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

                    // Auto prompt generation skipped
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // ── 반복 선택 워크플로우 상태 ──
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [selectedAsRef, setSelectedAsRef] = useState<GeneratedImage | null>(null);
    const [round, setRound] = useState(0);
    const [finalImage, setFinalImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState('1:1');

    useEffect(() => {
        if (coverImage) {
            setRefImageLoading(true);
            loadCoverImages(coverId, coverImage)
                .then((imgs) => {
                    // 저장된 참고이미지가 있으면 기존 이미지 뒤에 추가
                    if (savedRefImages.length > 0) {
                        setOriginalRefImages([...imgs, ...savedRefImages]);
                    } else {
                        setOriginalRefImages(imgs);
                    }
                    setRefImageLoading(false);
                })
                .catch(() => setRefImageLoading(false));
        } else if (savedRefImages.length > 0) {
            // coverImage 없지만 저장된 참고이미지가 있는 경우 (커스텀 디자인)
            setOriginalRefImages(savedRefImages);
        }
    }, [coverId, coverImage, settingsLoaded]);



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

    function buildPrompt(anglePrompt: string): string {
        const scene = FIXED_SCENE;
        const mattress = getMattressDescription();
        let prompt = scene;
        if (anglePrompt) prompt += `.\n${anglePrompt}`;
        if (mattress) prompt += `.\nMattress details: ${mattress}`;
        return prompt;
    }

    const handleGenerate = async () => {
        if (!saveDirectory) {
            const proceed = window.confirm("📁 내 PC의 다운로드(저장) 대상 폴더가 지정되지 않았습니다.\n(지정하지 않으시면 자동 저장이 이루어지지 않습니다)\n\n이대로 이미지 생성만 진행하시겠습니까?");
            if (!proceed) return;
        }

        setLoading(true);
        setError(null);
        setGeneratedImages([]);
        setSelectedIndex(null);
        // ✅ 다시 생성 시 처음 조건으로 — 이전 선택 이미지 참조 초기화
        setSelectedAsRef(null);

        try {
            // 원본 커버 이미지만 참조 (selectedAsRef 제외)
            const maxRefImages = 2;
            const baseRefs = originalRefImages.slice(0, maxRefImages);

            // ✅ 3개의 앵글에 대해 동시에 생성 요청 (Promise.all)
            const requests = FIXED_ANGLES.map(angle => {
                const promptToUse = customAnglePrompts[angle.id] || angle.prompt;
                const body: any = {
                    prompt: buildPrompt(promptToUse),
                    coverLabel: coverLabel,
                    aspectRatio: '1:1',
                    imageSize: 2048,
                };
                if (baseRefs.length > 0) {
                    body.referenceImages = baseRefs;
                    body.subjectDescription = getMattressDescription() || 'a premium mattress cover';
                }

                return fetch('/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                }).then(async res => {
                    const text = await res.text();
                    try {
                        const data = JSON.parse(text);
                        return { angleId: angle.id, data };
                    } catch (e) {
                        throw new Error(`Server returned invalid JSON: ${text.slice(0, 100)}`);
                    }
                });
            });

            const results = await Promise.all(requests);

            const allImages: GeneratedImage[] = [];
            for (const res of results) {
                if (res.data.images && res.data.images.length > 0) {
                    const generatedImg = res.data.images[0];
                    allImages.push(generatedImg);

                    // 💡 자동 저장 로직 (브라우저 직접 저장 + 기존 API Fallback)
                    try {
                        console.log(`[AutoSave] Saving ${res.angleId} image for ${coverLabel}...`);
                        const resizedBase64 = await resizeToSquare(generatedImg.base64, 2048);

                        // 1) 사용자가 로컬 폴더(saveDirectory)를 지정해둔 경우 (File System API 실행)
                        if (saveDirectory) {
                            try {
                                const now = new Date();
                                const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                                const filename = `${coverLabel}_${timestamp}_${res.angleId}.png`.replace(/\s+/g, '_');

                                const buffer = Buffer.from(resizedBase64, 'base64');
                                const fileHandle = await saveDirectory.getFileHandle(filename, { create: true });
                                const writable = await fileHandle.createWritable();
                                await writable.write(buffer);
                                await writable.close();
                                console.log(`[BrowserAutoSave] ✅ Saved directly to local PC: ${filename}`);
                            } catch (fsErr) {
                                console.error('[BrowserAutoSave] ❌ Failed to save directly:', fsErr);
                            }
                        }

                        // 2) 항상 기존 서버 백엔드 API (localhost 등 확인용) 저장 시도 수행
                        const saveRes = await fetch('/api/save-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                base64: resizedBase64,
                                coverLabel: coverLabel,
                                angleId: res.angleId,
                                folder: 'AI-cover'
                            }),
                        });
                        const saveData = await saveRes.json();
                        if (saveRes.ok) {
                            console.log(`[AutoSave API] ✅ Saved: ${saveData.filename}`);
                        } else {
                            console.error(`[AutoSave API] ❌ Save failed (${saveRes.status}):`, saveData);
                        }
                    } catch (saveErr) {
                        console.error('[AutoSave] ❌ error saving image:', saveErr);
                    }
                }
            }

            if (allImages.length > 0) {
                setGeneratedImages(allImages); // 3장 표시
                setRound((r) => r + 1);
            } else {
                const firstError = results.find(d => d.data.error);
                setError(firstError?.data.error || '이미지 생성에 실패했습니다.');
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

    // 텍스쳐 작업 모달용 변수 (선언 위치: mainModal 이전)
    const defaultTextures = useDesignStore.getState().defaultTextures;
    const hasTextureForCover = !!(defaultTextures[coverId]?.upper?.top || defaultTextures[coverId]?.upper?.front || defaultTextures[coverId]?.upper?.side);
    const selectedImageUrl = selectedIndex !== null && generatedImages[selectedIndex]
        ? generatedImages[selectedIndex].imageUrl
        : (defaultTextures[coverId]?.sourceImage?.upper || null);

    const mainModal = createPortal(
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => setShowTextureModal(true)} style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none',
                            background: hasTextureForCover
                                ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                                : 'rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            boxShadow: hasTextureForCover ? '0 2px 8px rgba(139,92,246,0.4)' : 'none',
                            transition: 'all 0.2s',
                        }}>
                            ✂️ 텍스쳐 작업
                            {hasTextureForCover && <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.2)', padding: '1px 5px', borderRadius: 4 }}>저장됨</span>}
                        </button>
                        <button onClick={onClose} style={{
                            width: 32, height: 32, borderRadius: 8, border: 'none',
                            background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                            fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✕</button>
                    </div>
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
                            <div style={{ marginBottom: 12, padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                                        {refImageLoading ? '⏳ 로딩...' : '📷 참고 이미지:'}
                                    </span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, border: '1px solid #22c55e', background: '#fff', color: '#16a34a', cursor: 'pointer' }}>
                                            + 추가
                                        </button>
                                        <button onClick={() => setOriginalRefImages([])} disabled={originalRefImages.length === 0} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 700, borderRadius: 5, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: originalRefImages.length === 0 ? 'not-allowed' : 'pointer', opacity: originalRefImages.length === 0 ? 0.5 : 1 }}>
                                            비우기
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {originalRefImages.map((b64: string, idx: number) => (
                                        <div key={`orig-${idx}`} style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #86efac', position: 'relative' }}>
                                            <img src={`data:image/jpeg;base64,${b64}`} alt="원본" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <span style={{ position: 'absolute', top: 1, left: 1, fontSize: 7, fontWeight: 700, color: '#fff', background: '#166534', padding: '0 3px', borderRadius: 2 }}>원본</span>
                                            <button onClick={() => setOriginalRefImages(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: 8, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottomLeftRadius: 4 }}>✕</button>
                                        </div>
                                    ))}
                                    {selectedAsRef && (
                                        <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #7c3aed', position: 'relative' }}>
                                            <img src={selectedAsRef.imageUrl} alt="선택" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <span style={{ position: 'absolute', top: 1, left: 1, fontSize: 7, fontWeight: 700, color: '#fff', background: '#7c3aed', padding: '0 3px', borderRadius: 2 }}>선택</span>
                                            <button onClick={() => setSelectedAsRef(null)} style={{ position: 'absolute', top: 0, right: 0, width: 14, height: 14, background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: 8, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderBottomLeftRadius: 4 }}>✕</button>
                                        </div>
                                    )}
                                    <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>{getRefImages().length}장 사용</span>
                                </div>
                            </div>

                            {/* 매트리스 (디자인 및 색상) 추가 설명 레이아웃 */}
                            {!finalImage && (
                                <div style={{ marginBottom: 12, padding: 12, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                                        🛏️ 매트리스 (디자인 및 색상)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div>
                                            <label style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Top Cover Color</label>
                                            <input type="text" value={topColor} onChange={(e) => setTopColor(e.target.value)} placeholder="예: Beige" style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcd34d' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Top Cover Quilting Pattern</label>
                                            <input type="text" value={topPattern} onChange={(e) => setTopPattern(e.target.value)} placeholder="예: Diamond" style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcd34d' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Piping (zipper) Fabric Color</label>
                                            <input type="text" value={pipingColor} onChange={(e) => setPipingColor(e.target.value)} placeholder="예: Brown" style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcd34d' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Side Fabric Color</label>
                                            <input type="text" value={sideColor} onChange={(e) => setSideColor(e.target.value)} placeholder="예: Light Grey" style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcd34d' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Side Fabric Quilting Pattern</label>
                                            <input type="text" value={sidePattern} onChange={(e) => setSidePattern(e.target.value)} placeholder="예: Vertical lines" style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcd34d' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 10, color: '#78350f', fontWeight: 600 }}>Logo Label Style</label>
                                            <input type="text" value={labelStyle} onChange={(e) => setLabelStyle(e.target.value)} placeholder="예: Gold tag" style={{ width: '100%', padding: '6px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #fcd34d' }} />
                                        </div>
                                    </div>
                                    {getMattressDescription() && (
                                        <div style={{ marginTop: 4, fontSize: 11, color: '#78350f' }}>
                                            🔍 최종 생성 설명: <em style={{ color: '#4f46e5' }}>{getMattressDescription()}</em>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 개별 앵글 프롬프트 뷰어 및 편집기 추가 */}
                            {!finalImage && (
                                <div style={{ marginBottom: 12, padding: 12, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95', marginBottom: 2 }}>
                                        🎥 카메라 앵글 프롬프트
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {FIXED_ANGLES.map((a) => (
                                            <div key={a.id} style={{ background: '#ede9fe', borderRadius: 6, padding: '6px 8px' }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', marginBottom: 3 }}>{a.label}</div>
                                                <textarea
                                                    value={customAnglePrompts[a.id] || ''}
                                                    onChange={(e) => handleAnglePromptChange(a.id, e.target.value)}
                                                    rows={2}
                                                    style={{
                                                        width: '100%', padding: '5px 7px',
                                                        border: '1px solid #c4b5fd', borderRadius: 5,
                                                        fontSize: 10, fontFamily: 'monospace',
                                                        resize: 'vertical', boxSizing: 'border-box',
                                                        background: '#fff', color: '#4c1d95',
                                                        lineHeight: 1.3,
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 설정 저장 버튼 */}
                            {!finalImage && (
                                <button onClick={handleSaveSettings} style={{
                                    width: '100%', padding: '10px',
                                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                    color: '#fff', border: 'none', borderRadius: 10,
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                    marginBottom: 8,
                                    boxShadow: '0 2px 8px rgba(245,158,11,0.25)',
                                }}>
                                    💾 참고이미지 + 프롬프트 설정 저장
                                </button>
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
                                    {loading ? '⏳ 3장 생성 중... (약 10-25초)' : round === 0 ? '🎯 앵글별 3장 생성하기' : `🔄 다시 3장 생성하기 (라운드 ${round + 1})`}
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
                            <button onClick={() => setShowTextureModal(true)} style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                ✂️ 텍스쳐 작업
                            </button>
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

                    {/* 생성된 이미지 그리드 (3장) */}
                    {!loading && generatedImages.length > 0 && !finalImage && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}>
                            {generatedImages.map((img: GeneratedImage, idx: number) => {
                                const isSelected = selectedIndex === idx;
                                const angleMeta = FIXED_ANGLES.find(a => a.id === img.angleId);
                                return (
                                    <div key={idx} onClick={() => setSelectedIndex(idx)} style={{
                                        position: 'relative', borderRadius: 12, overflow: 'hidden',
                                        border: isSelected ? '3px solid #6366f1' : '2px solid #1e293b',
                                        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.3)' : 'none',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: '#1e293b',
                                        width: '100%',
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

    return (
        <>
            {mainModal}
            {showTextureModal && selectedImageUrl && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
                    <TextureExtractorModal
                        coverId={coverId}
                        coverLabel={coverLabel}
                        initialUpperSource={selectedImageUrl}
                        onSave={(upper, lower, upperCoords, lowerCoords, upperSource, lowerSource) => {
                            useDesignStore.getState().setDefaultTextures(
                                coverId,
                                upper, lower,
                                upperCoords, lowerCoords,
                                { upper: upperSource, lower: lowerSource }
                            );
                        }}
                        onClose={() => setShowTextureModal(false)}
                    />
                </div>,
                document.body
            )}
        </>
    );
}
