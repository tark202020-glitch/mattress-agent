'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDesignStore } from '../lib/store';
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



/* ── 분위기/배경 프리셋 (BrochureGenerator에서 가져옴) ── */
const MOOD_PRESETS = [
    {
        id: 'warm_brown', label: '따뜻한 실내 갈색', emoji: '🪵', color: '#92400e', bgColor: '#fef3c7',
        scene: '따뜻한 침실 씬. 비어 있는 짙은 색 플랫폼 침대 프레임. 그 위에는 하얀 베개 두 개, 연베이지 베개 한 개, 그리고 녹슨 오렌지색 정사각형 포인트 베개가 놓여 있습니다. 우측 하단에는 황갈색 프린지 담요가 늘어져 있습니다. 푹신한 베이지 다이아몬드 프린지 러그. 왼쪽에는 하얀 기기가 놓인 짙은 나무 사이드 테이블. 오른쪽에는 둥근 원판 세 개가 있는 모던 블랙 플로어 램프. 배경 벽면의 하단부는 핑크빛 도는 옅은 자주색 웨인스코팅으로, 상단부는 옅은 노란색으로 되어 있습니다. 부드러운 그림자가 지는 따뜻한 조명. 고급스러운 인테리어 디자인 미학.'
    },
    {
        id: 'clean_studio', label: '깔끔한 스튜디오', emoji: '✨', color: '#4338ca', bgColor: '#eef2ff',
        scene: '모던한 침실 씬. 부드러운 헤드보드와 작은 검은색 원통형 다리가 있는 비어 있는 밝은 회청색 패브릭 플랫폼 침대 프레임. 침대 프레임 위(매트리스가 놓일 자리) 뒷면에는 커다란 밝은 회청색 베개 두 개, 앞면에는 질감 있는 연분홍색 요추 베개 두 개가 놓여 있습니다. 좌측 상단에는 모던한 골드 및 불투명 유리 구형 펜던트 조명이 걸려 있습니다. 우측 하단 바닥에는 보송보송한 질감의 크림색과 회색 패턴 러그 일부가 보입니다. 배경은 이음새 없는 밝은 회색 벽과 하얀색 바닥. 부드럽고 잔잔한 그림자를 만드는 밝은 스튜디오 조명. 고급스러운 인테리어 디자인 미학.'
    },
    {
        id: 'wood_luxury', label: '고급스러운 원목', emoji: '🏨', color: '#78350f', bgColor: '#fef9ee',
        scene: '비어 있는 로우 프로파일 연베이지 패브릭 침대 프레임이 있는 미니멀 침실 씬. 프레임에는 아무 장식 없는 큰 하얀 베개 두 개가 기대어 있는 높은 패딩 헤드보드가 있습니다. 침대 왼쪽에는 밝은 원목의 조형적인 둥근 사이드 테이블이 있고, 위에는 작고 둥근 모서리의 직사각형 하얀 물건이 있습니다. 배경에는 은은한 세로 패널 디테일이 있는 연베이지 벽과 우측에 반투명한 대형 파티션이 있습니다. 바닥은 밝은 우드 플랭크보드. 좌측에서 부드럽고 따뜻한 자연광이 비치며 벽에 식물 그림자를 드리웁니다.'
    },
    {
        id: 'warm_grey', label: '웜 그레이톤', emoji: '🤍', color: '#374151', bgColor: '#f3f4f6',
        scene: '모던한 침실 씬. 터프팅 헤드보드와 작은 검은색 다리가 있는 비어 있는 회색 패브릭 침대 프레임. 프레임 위에는 하얀 베개 두 개, 회색 포인트 베개 하나, 갈색 니트 담요. 왼쪽의 작은 나무 사이드 테이블에는 하얀 직사각형 물건이 놓여 있습니다. 오른쪽의 크롬 소재 사이드 테이블 위에도 하얀 직사각형 물건이 있습니다. 오른쪽 뒤편의 검은색 다리를 가진 나무 선반에는 그릇, 책, 그리고 마른 나뭇가지 장식이 있습니다. 우측 상단에서 유리 펜던트 램프가 내려옵니다. 좌측 하단 바닥에는 하얀색 체중계가 보입니다. 배경은 이음새 없는 하얀 벽과 옅은 회색 바닥. 부드럽고 고른 스튜디오 조명. 고급스러운 인테리어 디자인 미학.'
    },
    {
        id: 'cool_tone', label: '차가운 쿨톤', emoji: '❄️', color: '#1e40af', bgColor: '#eff6ff',
        scene: '모던하고 미니멀한 스튜디오 침실 씬. 크롬 다리가 달린 빈 블랙 가죽 바르셀로나 데이베드 프레임이 중앙에 놓여 있습니다. 프레임 위에는 큰 하얀 베개 두 개, 파란색 직사각형 포인트 베개 하나, 그리고 옅은 회색 담요가 있습니다. 왼쪽의 유리와 크롬 사이드 테이블에는 흑백 줄무늬 세라믹 화병과 쌓인 책들. 오른쪽의 유리와 크롬 사이드 테이블 위에는 하얀 직사각형 물건. 프레임 오른쪽 뒤에는 길고 얇은 크롬 플로어 램프가 서 있습니다. 하얀 바닥 위의 프레임 밑에는 옅은 회색 러그가 깔려 있습니다. 배경은 이음새 없는 하얀 벽. 부드럽고 고른 스튜디오 조명. 고급스러운 인테리어 디자인 미학.'
    },
    {
        id: 'white_isolated', label: '매트리스만 (흰색 배경)', emoji: '🛏️', color: '#0f172a', bgColor: '#f1f5f9',
        scene: '보이지 않는 프레임 위에 올려진 매트리스 단독 제품 컷. 순수하고 이음새 없는 흰색 배경. 주변 소품, 가구, 그림자 없이 매트리스 아래의 미세한 그림자만 허용. 스튜디오 조명. 깔끔하고 미니멀한 상업 사진 미학.'
    },
];

/* ── 카메라 앵글 (CoverImageGeneratorModal의 FIXED_ANGLES와 동일) ── */
const CAMERA_ANGLES = [
    {
        id: 'front', label: '정면', emoji: '🖼️', color: '#0f766e', bgColor: '#f0fdf4',
        prompt: '매트리스 정면을 살짝 위쪽 눈높이에서 보여주는 정면 뷰. 대칭 구도. 매트리스의 가로보다 세로(깊이)가 길어 보여야 합니다.'
    },
    {
        id: 'perspective', label: '퍼스펙티브', emoji: '📐', color: '#6b21a8', bgColor: '#faf5ff',
        prompt: '모서리에서 바라본 3/4 각도 퍼스펙티브 뷰. 매트리스의 윗면과 측면이 모두 선명하게 보여야 합니다. 매트리스의 세로 깊이가 가로 폭보다 시각적으로 길게 확장되어야 합니다.'
    },
    {
        id: 'detail', label: '디테일', emoji: '🔍', color: '#b45309', bgColor: '#fffbeb',
        prompt: '매트리스의 우측 전면 모서리만 매우 가깝게 클로즈업. 매트리스 전체 모습이 보이지 않도록 화면을 모서리로만 가득 채웁니다. 원근 왜곡이 없는 직교(Orthographic) 평면 투영 방식이며, 모든 평행선은 평행하게 유지됩니다. 평면 위에서 우측 45도 각도로 내려다보는 시점. 상단의 퀼팅 텍스처, 파이핑/지퍼 스티치, 측면 원단 디테일, 모서리 박음질이 선명하게 보여야 합니다. 흰색 배경. 스튜디오 조명. 프리미엄 제품 사진 미학.'
    },
];

interface GeneratedImage {
    imageUrl: string;
    base64: string;
    angleId?: string;
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

async function resizeImageBase64(base64: string, maxWidth = 800, maxHeight = 800): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image();
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
        `/covers/${fileBase}_01.png`,
        `/covers/${fileBase}_02.jpg`,
        `/covers/${fileBase}_02.png`,
    ];
    const results = await Promise.all(candidates.map(imagePathToBase64));
    return results.filter((b): b is string => b !== null);
}

/* ── 이미지를 2048×2048 정사각형으로 리사이징 ── */
async function resizeToSquare(base64Data: string, size: number = 2048): Promise<string> {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            const scale = Math.min(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.onerror = () => resolve(base64Data);
        img.src = base64Data.startsWith('data:') ? base64Data : `data:image/png;base64,${base64Data}`;
    });
}

/* ── localStorage 키 ── */
const SETTINGS_KEY_PREFIX = 'concept_image_settings_';

interface ConceptImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    aiCoverImageUrl?: string;
}

export default function ConceptImageGeneratorModal({ isOpen, onClose, aiCoverImageUrl }: ConceptImageGeneratorModalProps) {
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

    // 배경/분위기
    const [scenePrompt, setScenePrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    // 카메라 앵글
    const [selectedAngles, setSelectedAngles] = useState<string[]>(['front', 'perspective', 'detail']);
    // 매트리스 추가 설명
    const [userMattressPrompt, setUserMattressPrompt] = useState('');
    // 라운드
    const [round, setRound] = useState(0);

    // 생성 상태
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // 참고 이미지
    const [originalRefImages, setOriginalRefImages] = useState<string[]>([]);
    const [refImageLoading, setRefImageLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => { setMounted(true); }, []);

    // 모달 열릴 때 초기화
    useEffect(() => {
        if (isOpen) {
            setGeneratedImages([]);
            setSelectedIndex(null);
            setRound(0);
            setError(null);

            // 기본 배경 설정
            setScenePrompt(MOOD_PRESETS[1].scene);
            setSelectedPreset('clean_studio');

            // localStorage에서 저장된 설정 로드
            const settingsKey = `${SETTINGS_KEY_PREFIX}${coverId}`;
            try {
                const saved = localStorage.getItem(settingsKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.scenePrompt) { setScenePrompt(parsed.scenePrompt); setSelectedPreset(parsed.selectedPreset || null); }
                    if (parsed.selectedAngles) setSelectedAngles(parsed.selectedAngles);
                    if (parsed.userMattressPrompt) setUserMattressPrompt(parsed.userMattressPrompt);
                    if (parsed.refImages && parsed.refImages.length > 0) {
                        setOriginalRefImages(parsed.refImages);
                        return; // 저장된 참고이미지가 있으면 커버이미지 로드 스킵
                    }
                }
            } catch { /* ignore */ }

            // AI 생성 이미지를 참고이미지로 등록
            if (aiCoverImageUrl) {
                setRefImageLoading(true);
                // aiCoverImageUrl이 data:URL 또는 blob URL일 수 있음
                fetch(aiCoverImageUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                            const dataUrl = reader.result as string;
                            const base64 = dataUrl.split(',')[1];
                            if (base64) {
                                const resized = await resizeImageBase64(base64);
                                setOriginalRefImages(prev => {
                                    // 중복 방지
                                    if (prev.includes(resized)) return prev;
                                    return [resized, ...prev];
                                });
                            }
                            setRefImageLoading(false);
                        };
                        reader.onerror = () => setRefImageLoading(false);
                        reader.readAsDataURL(blob);
                    })
                    .catch(() => {
                        setRefImageLoading(false);
                        // fallback: 커버 이미지 로드
                        if (coverImage) {
                            setRefImageLoading(true);
                            loadCoverImages(coverId, coverImage)
                                .then(imgs => { setOriginalRefImages(imgs); setRefImageLoading(false); })
                                .catch(() => setRefImageLoading(false));
                        }
                    });
            } else if (coverImage) {
                // AI 이미지 없으면 기존 커버 이미지 로드
                setRefImageLoading(true);
                loadCoverImages(coverId, coverImage)
                    .then(imgs => { setOriginalRefImages(imgs); setRefImageLoading(false); })
                    .catch(() => setRefImageLoading(false));
            }
        }
    }, [isOpen, coverId, coverImage]);

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
                }
            };
            reader.readAsDataURL(file);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 설정 저장
    const handleSaveSettings = useCallback(() => {
        const settingsKey = `${SETTINGS_KEY_PREFIX}${coverId}`;
        const settings = {
            scenePrompt,
            selectedPreset,
            selectedAngles,
            userMattressPrompt,
            refImages: originalRefImages.slice(0, 5),
        };
        try {
            localStorage.setItem(settingsKey, JSON.stringify(settings));
            alert('✅ 설정이 저장되었습니다.');
        } catch (err) {
            alert('❌ 저장에 실패했습니다.');
            console.error(err);
        }
    }, [coverId, scenePrompt, selectedPreset, selectedAngles, userMattressPrompt, originalRefImages]);

    const handlePresetSelect = (p: typeof MOOD_PRESETS[0]) => {
        if (selectedPreset === p.id) { setSelectedPreset(null); setScenePrompt(''); }
        else { setSelectedPreset(p.id); setScenePrompt(p.scene); }
    };

    const handleAngleToggle = (angleId: string) => {
        setSelectedAngles(prev => {
            if (prev.includes(angleId)) {
                return prev.filter(a => a !== angleId);
            }
            return [...prev, angleId];
        });
    };

    function buildPrompt(anglePrompt: string): string {
        const scene = scenePrompt.trim() || 'in a modern bedroom with neutral tones, photorealistic 4K';
        let prompt = `Generate a photorealistic mattress image. The mattress design, color, texture, and all visual details must EXACTLY match the provided reference image(s) — do NOT alter, reinterpret, or add any design elements not present in the reference. ${scene}. ${anglePrompt}`;
        return prompt;
    }

    // 앵글별 3장 생성
    const handleGenerate = async () => {
        if (selectedAngles.length === 0) {
            setError('카메라 앵글을 하나 이상 선택해주세요.');
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedImages([]);
        setSelectedIndex(null);

        try {
            const anglesToGenerate = CAMERA_ANGLES.filter(a => selectedAngles.includes(a.id));
            const maxRefImages = 4;
            const baseRefs = originalRefImages.slice(0, maxRefImages);

            const requests = anglesToGenerate.map(angle => {
                const body: any = {
                    prompt: buildPrompt(angle.prompt),
                    coverLabel: coverLabel,
                    aspectRatio: '1:1',
                    imageSize: 2048,
                };
                if (baseRefs.length > 0) {
                    body.referenceImages = baseRefs;
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
                    allImages.push({
                        imageUrl: generatedImg.imageUrl,
                        base64: generatedImg.base64,
                        angleId: res.angleId,
                    });

                    // 💡 자동 저장 API 호출 (CoverImageGeneratorModal과 동일)
                    try {
                        console.log(`[ConceptAutoSave] Saving ${res.angleId} image for ${coverLabel}...`);
                        const resizedBase64 = await resizeToSquare(generatedImg.base64, 2048);
                        const saveRes = await fetch('/api/save-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                base64: resizedBase64,
                                coverLabel: coverLabel,
                                angleId: res.angleId,
                                folder: 'AI-concept'
                            }),
                        });
                        const saveData = await saveRes.json();
                        if (saveRes.ok) {
                            console.log(`[ConceptAutoSave] ✅ Saved: ${saveData.filename}`);
                        } else {
                            console.error(`[ConceptAutoSave] ❌ Save failed:`, saveData);
                        }
                    } catch (saveErr) {
                        console.error('[ConceptAutoSave] ❌ Network error:', saveErr);
                    }
                }
            }

            if (allImages.length > 0) {
                setGeneratedImages(allImages);
                setRound(r => r + 1);
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

    // 다운로드
    const downloadImage = (imageUrl: string, filename: string) => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        a.click();
    };

    // 선택 이미지 저장
    const handleSaveImage = async () => {
        if (selectedIndex === null) return;
        const img = generatedImages[selectedIndex];
        try {
            const resizedBase64 = await resizeToSquare(img.imageUrl, 2048);
            const angleLabel = CAMERA_ANGLES.find(a => a.id === img.angleId)?.label || '';
            const filename = `${coverLabel}_concept_${angleLabel}_R${round}.png`;
            downloadImage(img.imageUrl, filename);

            await fetch('/api/save-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: resizedBase64,
                    filename,
                    folder: 'AI-concept'
                })
            });
            alert('✅ 이미지가 저장되었습니다.');
        } catch (err) {
            console.error('저장 실패:', err);
            alert('❌ 저장에 실패했습니다.');
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        }}>
            {/* ══════════ LEFT PANEL ══════════ */}
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
                        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>🖼️ 컨셉이미지 생성</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: coverColor, marginRight: 5, verticalAlign: 'middle' }} />
                            {coverLabel}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: 'rgba(255,255,255,0.1)', color: '#e2e8f0',
                        fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {/* 스크롤 본문 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>

                    {/* 📷 참고 이미지 */}
                    <div style={{ marginBottom: 12, padding: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>
                                {refImageLoading ? '⏳ 로딩...' : '📷 참고 이미지'}
                            </span>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {originalRefImages.length > 0 && (
                                    <button
                                        onClick={() => setOriginalRefImages([])}
                                        style={{ fontSize: 10, padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                                    >비우기</button>
                                )}
                                <label style={{ fontSize: 10, padding: '4px 8px', background: '#fff', color: '#166534', border: '1px solid #86efac', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>
                                    + 추가
                                    <input type="file" accept="image/jpeg, image/png, image/webp" multiple style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>
                        {originalRefImages.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {originalRefImages.map((b64, idx) => (
                                    <div key={`ref-${idx}`} style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '2px solid #86efac', position: 'relative' }}>
                                        <img src={`data:image/jpeg;base64,${b64}`} alt="참고" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            onClick={() => setOriginalRefImages(prev => prev.filter((_, i) => i !== idx))}
                                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 14, height: 14, fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                        >✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <span style={{ fontSize: 10, color: '#64748b' }}>{originalRefImages.length}장 사용</span>
                    </div>

                    {/* 🎬 배경 선택 */}
                    <div style={{ marginBottom: 10, padding: 10, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5 }}>🎬 배경 선택</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {MOOD_PRESETS.map((p) => {
                                const active = selectedPreset === p.id;
                                return (
                                    <button key={p.id} onClick={() => handlePresetSelect(p)} style={{
                                        display: 'flex', alignItems: 'center', gap: 3,
                                        padding: '4px 8px', borderRadius: 6,
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
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#0369a1', marginBottom: 3 }}>📝 배경 프롬프트</div>
                        <textarea
                            value={scenePrompt}
                            onChange={(e) => { setScenePrompt(e.target.value); setSelectedPreset(null); }}
                            rows={8}
                            placeholder="배경 장면을 영문으로 입력하세요..."
                            style={{
                                width: '100%', padding: 7,
                                border: '1px solid #bae6fd', borderRadius: 7,
                                fontSize: 10, fontFamily: 'monospace',
                                resize: 'vertical', boxSizing: 'border-box',
                                background: '#f0f9ff', color: '#0c4a6e',
                                lineHeight: 1.4,
                            }}
                        />
                    </div>

                    {/* 🎥 카메라 앵글 */}
                    <div style={{ marginBottom: 10, padding: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 5 }}>🎥 카메라 앵글 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(복수 선택 가능)</span></div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {CAMERA_ANGLES.map((a) => {
                                const active = selectedAngles.includes(a.id);
                                return (
                                    <button key={a.id} onClick={() => handleAngleToggle(a.id)} style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '5px 10px', borderRadius: 6,
                                        border: `1.5px solid ${active ? a.color : '#e2e8f0'}`,
                                        background: active ? a.bgColor : '#fff',
                                        color: active ? a.color : '#64748b',
                                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: 'pointer',
                                    }}>
                                        <span style={{ fontSize: 12 }}>{a.emoji}</span>{a.label}
                                        {active && <span style={{ fontSize: 10, fontWeight: 800 }}>✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedAngles.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: '#6b21a8' }}>📝 앵글 프롬프트</div>
                                {CAMERA_ANGLES.filter(a => selectedAngles.includes(a.id)).map((a) => (
                                    <div key={a.id} style={{ background: '#ede9fe', borderRadius: 6, padding: '5px 7px' }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: a.color, marginBottom: 2 }}>{a.emoji} {a.label}</div>
                                        <div style={{ fontSize: 9, color: '#4c1d95', fontFamily: 'monospace', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                            {a.prompt}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 🛏️ 매트리스 추가 설명 */}
                    <div style={{ marginBottom: 10, padding: 10, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                            🛏️ 매트리스 추가 설명 <span style={{ fontWeight: 400, color: '#a16207' }}>(선택사항)</span>
                        </div>
                        <textarea
                            value={userMattressPrompt} onChange={(e) => setUserMattressPrompt(e.target.value)} rows={2}
                            placeholder="예: with thick pillow-top quilting and blue piping"
                            style={{ width: '100%', padding: 7, border: '1px solid #fde68a', borderRadius: 7, fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', background: '#fffbeb' }}
                        />
                    </div>

                    {/* 설정 저장 버튼 */}
                    <button onClick={handleSaveSettings} style={{
                        width: '100%', padding: '10px', marginBottom: 8,
                        background: '#f1f5f9', color: '#475569',
                        border: '1px solid #e2e8f0', borderRadius: 8,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>
                        💾 참고이미지 + 프롬프트 설정 저장
                    </button>

                    {/* 생성 버튼 */}
                    <button onClick={handleGenerate} disabled={loading || refImageLoading || selectedAngles.length === 0} style={{
                        width: '100%', padding: '12px',
                        background: loading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        color: '#fff', border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: 12, boxShadow: loading ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
                    }}>
                        {loading ? `⏳ ${selectedAngles.length}장 생성 중...` : round === 0 ? `🎯 앵글별 ${selectedAngles.length}장 생성하기` : `🔄 다시 ${selectedAngles.length}장 생성하기 (라운드 ${round + 1})`}
                    </button>
                    {error && <div style={{ padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, marginBottom: 10, fontSize: 11, color: '#991b1b', wordBreak: 'break-all' }}>❌ {error}</div>}
                </div>
            </div>

            {/* ══════════ RIGHT PANEL ══════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
                {/* 우측 헤더 */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                        {loading ? '⏳ 생성 중...' : generatedImages.length > 0 ? `📸 생성 결과 ${generatedImages.length}장 — 클릭하여 선택` : '🖼️ 이미지 미리보기'}
                    </span>
                    {generatedImages.length > 0 && selectedIndex !== null && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={handleSaveImage} style={{
                                padding: '8px 20px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff', border: 'none', borderRadius: 8,
                                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                            }}>
                                💾 저장하기
                            </button>
                        </div>
                    )}
                </div>

                {/* 이미지 표시 영역 */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                    {loading && (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <div style={{ width: 56, height: 56, border: '4px solid #1e293b', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600 }}>AI가 컨셉 이미지를 생성하고 있습니다...</p>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {!loading && generatedImages.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}>
                            {generatedImages.map((img, idx) => {
                                const isSelected = selectedIndex === idx;
                                const angleInfo = CAMERA_ANGLES.find(a => a.id === img.angleId);
                                return (
                                    <div key={idx} onClick={() => setSelectedIndex(idx)} style={{
                                        position: 'relative', borderRadius: 12, overflow: 'hidden',
                                        border: isSelected ? '3px solid #6366f1' : '2px solid #1e293b',
                                        boxShadow: isSelected ? '0 0 0 3px rgba(99,102,241,0.3)' : 'none',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: '#1e293b',
                                        width: '100%',
                                    }}>
                                        <img src={img.imageUrl} alt={`컨셉 ${idx + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                                        {isSelected && (
                                            <div style={{ position: 'absolute', top: 10, left: 10, background: '#6366f1', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 6 }}>
                                                ✓ 선택됨
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5 }}>
                                            {angleInfo ? `${angleInfo.emoji} ${angleInfo.label}` : `#${idx + 1}`}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); downloadImage(img.imageUrl, `${coverLabel}_concept_${angleInfo?.label || idx + 1}.png`); }}
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
                            <div style={{ fontSize: 64 }}>🖼️</div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>좌측에서 설정 후 생성 버튼을 클릭하세요</p>
                            <p style={{ fontSize: 12, color: '#475569' }}>선택한 앵글별로 컨셉 이미지가 생성됩니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
