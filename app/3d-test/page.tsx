'use client';

import React, { useState, useRef, useCallback, useEffect, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════ */
/*  타입 정의                           */
/* ═══════════════════════════════════ */

interface Point { x: number; y: number }
interface Corners { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
interface FaceData { visible: boolean; corners: Corners }
interface FaceCoords { topSurface: FaceData; frontPanel: FaceData; sidePanel: FaceData }
interface CoverTextures { top: string | null; front: string | null; side: string | null }

type FaceKey = 'topSurface' | 'frontPanel' | 'sidePanel';
type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
type CoverType = 'upper' | 'lower';

const FACE_COLORS: Record<FaceKey, string> = { topSurface: '#10b981', frontPanel: '#3b82f6', sidePanel: '#f59e0b' };
const FACE_LABELS: Record<FaceKey, string> = { topSurface: '상단면', frontPanel: '정면', sidePanel: '측면' };
const COVER_COLORS: Record<CoverType, string> = { upper: '#10b981', lower: '#8b5cf6' };
const COVER_LABELS: Record<CoverType, string> = { upper: '상단 커버', lower: '하단 커버' };

/* ═══════════════════════════════════ */
/*  원근 보정 크롭                      */
/* ═══════════════════════════════════ */

function perspectiveCrop(sourceImage: HTMLImageElement, corners: Corners, imgW: number, imgH: number, outputW: number, outputH: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = outputW; canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    const sx = [corners.topLeft.x / 100 * imgW, corners.topRight.x / 100 * imgW, corners.bottomRight.x / 100 * imgW, corners.bottomLeft.x / 100 * imgW];
    const sy = [corners.topLeft.y / 100 * imgH, corners.topRight.y / 100 * imgH, corners.bottomRight.y / 100 * imgH, corners.bottomLeft.y / 100 * imgH];
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imgW; srcCanvas.height = imgH;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(sourceImage, 0, 0, imgW, imgH);
    const srcData = srcCtx.getImageData(0, 0, imgW, imgH);
    const dstData = ctx.createImageData(outputW, outputH);
    for (let dy = 0; dy < outputH; dy++) {
        for (let dx = 0; dx < outputW; dx++) {
            const u = dx / (outputW - 1), v = dy / (outputH - 1);
            const srcX = (1 - u) * (1 - v) * sx[0] + u * (1 - v) * sx[1] + u * v * sx[2] + (1 - u) * v * sx[3];
            const srcY = (1 - u) * (1 - v) * sy[0] + u * (1 - v) * sy[1] + u * v * sy[2] + (1 - u) * v * sy[3];
            const ix = Math.round(srcX), iy = Math.round(srcY);
            if (ix >= 0 && ix < imgW && iy >= 0 && iy < imgH) {
                const si = (iy * imgW + ix) * 4, di = (dy * outputW + dx) * 4;
                dstData.data[di] = srcData.data[si]; dstData.data[di + 1] = srcData.data[si + 1];
                dstData.data[di + 2] = srcData.data[si + 2]; dstData.data[di + 3] = srcData.data[si + 3];
            }
        }
    }
    ctx.putImageData(dstData, 0, 0);
    return canvas.toDataURL('image/png');
}

/* ═══════════════════════════════════ */
/*  드래그 가능한 꼭짓점 에디터            */
/* ═══════════════════════════════════ */

function CornerEditor({ faceCoords, onChange }: { faceCoords: FaceCoords; onChange: (u: FaceCoords) => void }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<{ face: FaceKey; corner: CornerKey } | null>(null);

    const handlePointerDown = (face: FaceKey, corner: CornerKey) => (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragging({ face, corner });
        (e.target as SVGElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragging || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        const updated = JSON.parse(JSON.stringify(faceCoords)) as FaceCoords;
        updated[dragging.face].corners[dragging.corner] = { x, y };
        onChange(updated);
    };

    const handlePointerUp = () => setDragging(null);
    const faces: FaceKey[] = ['topSurface', 'frontPanel', 'sidePanel'];

    return (
        <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'default' }}
            onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        >
            {faces.map(face => {
                const fd = faceCoords[face];
                if (!fd.visible) return null;
                const c = fd.corners;
                const color = FACE_COLORS[face];
                const pts = `${c.topLeft.x},${c.topLeft.y} ${c.topRight.x},${c.topRight.y} ${c.bottomRight.x},${c.bottomRight.y} ${c.bottomLeft.x},${c.bottomLeft.y}`;
                const cx = (c.topLeft.x + c.topRight.x + c.bottomRight.x + c.bottomLeft.x) / 4;
                const cy = (c.topLeft.y + c.topRight.y + c.bottomRight.y + c.bottomLeft.y) / 4;
                return (
                    <g key={face}>
                        <polygon points={pts} fill={`${color}18`} stroke={color} strokeWidth="0.3" strokeDasharray="0.8,0.4" />
                        <text x={cx} y={cy} fill={color} fontSize="2" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                            {FACE_LABELS[face]}
                        </text>
                        {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as CornerKey[]).map(corner => (
                            <g key={corner}>
                                <circle cx={c[corner].x} cy={c[corner].y} r="2" fill="transparent" style={{ cursor: 'grab' }} onPointerDown={handlePointerDown(face, corner)} />
                                <circle cx={c[corner].x} cy={c[corner].y} r="0.8" fill="#fff" stroke={color} strokeWidth="0.3" style={{ pointerEvents: 'none' }} />
                            </g>
                        ))}
                    </g>
                );
            })}
        </svg>
    );
}

/* ═══════════════════════════════════ */
/*  3D 커버 박스 컴포넌트                */
/* ═══════════════════════════════════ */

function CoverBox({ textures, rXZ, rY, seg, width, height, depth, posY, defaultColors }: {
    textures: CoverTextures;
    rXZ: number; rY: number; seg: number;
    width: number; height: number; depth: number;
    posY: number;
    defaultColors: { side: string; top: string; bottom: string; front: string };
}) {
    const [topTex, setTopTex] = useState<THREE.Texture | null>(null);
    const [frontTex, setFrontTex] = useState<THREE.Texture | null>(null);
    const [sideTex, setSideTex] = useState<THREE.Texture | null>(null);

    const loadTexture = (url: string | null, setter: (t: THREE.Texture | null) => void) => {
        if (!url) { setter(null); return; }
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = () => { const tex = new THREE.Texture(img); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; setter(tex); };
        img.src = url;
    };
    useEffect(() => loadTexture(textures.top, setTopTex), [textures.top]);
    useEffect(() => loadTexture(textures.front, setFrontTex), [textures.front]);
    useEffect(() => loadTexture(textures.side, setSideTex), [textures.side]);

    const geometry = useMemo(() => {
        const geo = new THREE.BoxGeometry(width, height, depth, seg, seg, seg);
        const pos = geo.attributes.position;
        const halfW = width / 2, halfH = height / 2, halfD = depth / 2;
        const cRXZ = Math.min(rXZ, Math.min(halfW, halfD) - 0.01);
        const cRY = Math.min(rY, halfH - 0.01);
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const dx = Math.max(0, Math.abs(x) - (halfW - cRXZ));
            const dy = Math.max(0, Math.abs(y) - (halfH - cRY));
            const dz = Math.max(0, Math.abs(z) - (halfD - cRXZ));
            const ndx = cRXZ > 0 ? dx / cRXZ : 0;
            const ndy = cRY > 0 ? dy / cRY : 0;
            const ndz = cRXZ > 0 ? dz / cRXZ : 0;
            const ndist = Math.sqrt(ndx * ndx + ndy * ndy + ndz * ndz);
            if (ndist > 0.001) {
                const scale = 1.0 / ndist;
                if (Math.abs(x) > halfW - cRXZ) x = Math.sign(x) * ((halfW - cRXZ) + dx * scale);
                if (Math.abs(y) > halfH - cRY) y = Math.sign(y) * ((halfH - cRY) + dy * scale);
                if (Math.abs(z) > halfD - cRXZ) z = Math.sign(z) * ((halfD - cRXZ) + dz * scale);
            }
            pos.setXYZ(i, x, y, z);
        }
        geo.computeVertexNormals();
        return geo;
    }, [width, height, depth, rXZ, rY, seg]);

    const materials = useMemo(() => [
        new THREE.MeshStandardMaterial({ map: sideTex, color: sideTex ? '#fff' : defaultColors.side, roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ map: sideTex, color: sideTex ? '#fff' : defaultColors.side, roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ map: topTex, color: topTex ? '#fff' : defaultColors.top, roughness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: defaultColors.bottom, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ map: frontTex, color: frontTex ? '#fff' : defaultColors.front, roughness: 0.75 }),
        new THREE.MeshStandardMaterial({ map: frontTex, color: frontTex ? '#fff' : defaultColors.front, roughness: 0.75 }),
    ], [topTex, frontTex, sideTex, defaultColors]);

    return <mesh castShadow receiveShadow geometry={geometry} material={materials} position={[0, posY, 0]} />;
}

/* ═══════════════════════════════════ */
/*  메인 페이지                         */
/* ═══════════════════════════════════ */

const DEFAULT_COORDS: FaceCoords = {
    topSurface: { visible: true, corners: { topLeft: { x: 10, y: 10 }, topRight: { x: 90, y: 10 }, bottomRight: { x: 90, y: 55 }, bottomLeft: { x: 10, y: 55 } } },
    frontPanel: { visible: true, corners: { topLeft: { x: 10, y: 55 }, topRight: { x: 90, y: 55 }, bottomRight: { x: 90, y: 85 }, bottomLeft: { x: 10, y: 85 } } },
    sidePanel: { visible: false, corners: { topLeft: { x: 0, y: 0 }, topRight: { x: 0, y: 0 }, bottomRight: { x: 0, y: 0 }, bottomLeft: { x: 0, y: 0 } } },
};

const UPPER_DEFAULTS = { side: '#d4d0c8', top: '#f5f0eb', bottom: '#e8e4dc', front: '#d4d0c8' };
const LOWER_DEFAULTS = { side: '#5a5a5a', top: '#6a6a6a', bottom: '#4a4a4a', front: '#5a5a5a' };

export default function ThreeDTestPage() {
    // 커버 선택
    const [activeCover, setActiveCover] = useState<CoverType>('upper');

    // 이미지/편집
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedImageName, setSelectedImageName] = useState('');
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState('');
    const [log, setLog] = useState<string[]>([]);
    const [faceCoords, setFaceCoords] = useState<FaceCoords | null>(null);
    const [viewMode, setViewMode] = useState<'editor' | '3d'>('editor');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 커버별 텍스처
    const [upperTex, setUpperTex] = useState<CoverTextures>({ top: null, front: null, side: null });
    const [lowerTex, setLowerTex] = useState<CoverTextures>({ top: null, front: null, side: null });

    // 라운드 파라미터
    const [radiusXZ, setRadiusXZ] = useState(0.15);
    const [radiusY, setRadiusY] = useState(0.06);
    const [segments, setSegments] = useState(16);

    const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const currentTex = activeCover === 'upper' ? upperTex : lowerTex;
    const setCurrentTex = activeCover === 'upper' ? setUpperTex : setLowerTex;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(URL.createObjectURL(file));
            setSelectedImageName(file.name.replace(/\.[^.]+$/, ''));
            setError(null); setFaceCoords(null);
            setViewMode('editor'); setLog([]); setProgress('');
        }
    };

    const imageToBase64 = async (src: string): Promise<string> => {
        const r = await fetch(src); const b = await r.blob();
        return new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
    };

    const handleDetect = useCallback(async () => {
        if (!selectedImage) return;
        setIsDetecting(true); setError(null); setLog([]);
        try {
            setProgress('이미지 변환 중...');
            const base64 = await imageToBase64(selectedImage);
            setProgress(`🔍 ${COVER_LABELS[activeCover]} AI 면 감지 중...`);
            addLog(`${COVER_LABELS[activeCover]} 꼭짓점 감지 중...`);
            const res = await fetch('/api/generate-face-texture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64 }) });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || '감지 실패');
            setFaceCoords(result.faceCoords);
            setProgress('✅ 감지 완료! 꼭짓점을 드래그하여 수정하세요.');
            addLog('✅ 감지 완료!');
        } catch (err: any) {
            addLog(`⚠️ AI 실패. 기본 좌표 배치.`);
            setFaceCoords(JSON.parse(JSON.stringify(DEFAULT_COORDS)));
            setProgress('⚠️ 기본 꼭짓점 배치. 수동 조정하세요.');
        } finally { setIsDetecting(false); }
    }, [selectedImage, activeCover]);

    const handleCrop = useCallback(async () => {
        if (!selectedImage || !faceCoords) return;
        setProgress(`✂️ ${COVER_LABELS[activeCover]} 크롭 중...`);
        const newTex: CoverTextures = { top: null, front: null, side: null };
        try {
            const img = new Image(); img.crossOrigin = 'anonymous';
            await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = selectedImage; });
            const W = img.naturalWidth, H = img.naturalHeight;
            if (faceCoords.topSurface.visible) { newTex.top = perspectiveCrop(img, faceCoords.topSurface.corners, W, H, 1024, 1024); addLog(`✅ ${COVER_LABELS[activeCover]} 상단면 크롭 완료`); }
            if (faceCoords.frontPanel.visible) { newTex.front = perspectiveCrop(img, faceCoords.frontPanel.corners, W, H, 1024, 400); addLog(`✅ ${COVER_LABELS[activeCover]} 정면 크롭 완료`); }
            if (faceCoords.sidePanel.visible) { newTex.side = perspectiveCrop(img, faceCoords.sidePanel.corners, W, H, 1024, 400); addLog(`✅ ${COVER_LABELS[activeCover]} 측면 크롭 완료`); }
            setCurrentTex(newTex);
            setViewMode('3d');
            setProgress(`🎉 ${COVER_LABELS[activeCover]} 텍스처 추출 완료!`);
        } catch (err: any) { setError(err.message); }
    }, [selectedImage, faceCoords, activeCover, setCurrentTex]);

    const toggleFace = (face: FaceKey) => {
        if (!faceCoords) return;
        const updated = JSON.parse(JSON.stringify(faceCoords)) as FaceCoords;
        updated[face].visible = !updated[face].visible;
        if (updated[face].visible && updated[face].corners.topLeft.x === 0) {
            const d: Record<FaceKey, Corners> = {
                topSurface: { topLeft: { x: 10, y: 10 }, topRight: { x: 90, y: 10 }, bottomRight: { x: 90, y: 55 }, bottomLeft: { x: 10, y: 55 } },
                frontPanel: { topLeft: { x: 10, y: 55 }, topRight: { x: 90, y: 55 }, bottomRight: { x: 90, y: 85 }, bottomLeft: { x: 10, y: 85 } },
                sidePanel: { topLeft: { x: 5, y: 15 }, topRight: { x: 12, y: 10 }, bottomRight: { x: 12, y: 55 }, bottomLeft: { x: 5, y: 55 } },
            };
            updated[face].corners = d[face];
        }
        setFaceCoords(updated);
    };

    const downloadTexture = (dataUrl: string, faceName: string) => {
        const a = document.createElement('a'); a.href = dataUrl;
        a.download = `${selectedImageName || 'mattress'}_${activeCover}_${faceName}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const hasTextures = upperTex.top || upperTex.front || upperTex.side || lowerTex.top || lowerTex.front || lowerTex.side;

    return (
        <div style={{ minHeight: '100vh', background: '#0c1222', color: '#f1f5f9', fontFamily: "'Inter','Pretendard',sans-serif" }}>
            {/* Header */}
            <header style={{ padding: '8px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✂️</div>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>텍스처 추출기</span>
                    <span style={{ fontSize: 10, color: '#475569', marginLeft: 4 }}>상단/하단 커버 분리 • 사진→꼭짓점→크롭→3D</span>
                </div>
                <div style={{ display: 'flex', gap: 2, background: '#1e293b', borderRadius: 6, padding: 2 }}>
                    <button onClick={() => setViewMode('editor')} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: viewMode === 'editor' ? '#334155' : 'transparent', color: viewMode === 'editor' ? '#f1f5f9' : '#64748b' }}>✏️ 편집</button>
                    <button onClick={() => setViewMode('3d')} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: viewMode === '3d' ? '#334155' : 'transparent', color: viewMode === '3d' ? '#f1f5f9' : '#64748b' }}>🧊 3D</button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100vh - 45px)' }}>
                {/* Left Panel */}
                <div style={{ borderRight: '1px solid #1e293b', overflow: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>

                    {/* 커버 선택 탭 */}
                    <div style={{ display: 'flex', gap: 3 }}>
                        {(['upper', 'lower'] as CoverType[]).map(c => (
                            <button key={c} onClick={() => { setActiveCover(c); setFaceCoords(null); setProgress(''); }}
                                style={{
                                    flex: 1, padding: '8px 4px', borderRadius: 6, border: `1.5px solid ${COVER_COLORS[c]}${activeCover === c ? '' : '33'}`,
                                    background: activeCover === c ? `${COVER_COLORS[c]}20` : 'transparent',
                                    color: activeCover === c ? COVER_COLORS[c] : '#475569',
                                    cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                                }}>
                                {activeCover === c ? '●' : '○'} {COVER_LABELS[c]}
                            </button>
                        ))}
                    </div>

                    {/* Upload */}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{
                        padding: '10px', borderRadius: 8, border: `1.5px dashed ${COVER_COLORS[activeCover]}44`,
                        background: `${COVER_COLORS[activeCover]}08`, color: COVER_COLORS[activeCover],
                        cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    }}>📤 {COVER_LABELS[activeCover]} 사진 업로드</button>

                    {/* Actions */}
                    {selectedImage && (
                        <>
                            <button onClick={handleDetect} disabled={isDetecting} style={{
                                padding: '8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: isDetecting ? 'wait' : 'pointer',
                                background: isDetecting ? '#065f46' : `linear-gradient(135deg, ${COVER_COLORS[activeCover]}, ${COVER_COLORS[activeCover]}cc)`, color: '#fff',
                            }}>{isDetecting ? '⏳ 감지중...' : '🔍 AI 면 감지'}</button>
                            {faceCoords && (
                                <button onClick={handleCrop} style={{
                                    padding: '8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                                }}>✂️ {COVER_LABELS[activeCover]} 크롭</button>
                            )}
                        </>
                    )}

                    {/* Face Toggles */}
                    {faceCoords && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>면 선택</span>
                            {(['topSurface', 'frontPanel', 'sidePanel'] as FaceKey[]).map(face => (
                                <button key={face} onClick={() => toggleFace(face)} style={{
                                    padding: '5px 8px', borderRadius: 4, border: `1px solid ${FACE_COLORS[face]}30`,
                                    background: faceCoords[face].visible ? `${FACE_COLORS[face]}15` : 'transparent',
                                    color: faceCoords[face].visible ? FACE_COLORS[face] : '#334155',
                                    cursor: 'pointer', fontSize: 10, fontWeight: 600, textAlign: 'left',
                                }}>{faceCoords[face].visible ? '✓' : '○'} {FACE_LABELS[face]}</button>
                            ))}
                        </div>
                    )}

                    {/* Status */}
                    {progress && <div style={{ padding: '5px 8px', borderRadius: 4, background: `${COVER_COLORS[activeCover]}15`, border: `1px solid ${COVER_COLORS[activeCover]}22`, fontSize: 10, color: COVER_COLORS[activeCover] }}>{progress}</div>}
                    {error && <div style={{ padding: '5px 8px', borderRadius: 4, background: '#ef444415', border: '1px solid #ef444422', fontSize: 10, color: '#fca5a5' }}>❌ {error}</div>}

                    {/* 커버별 텍스처 미리보기 */}
                    {(['upper', 'lower'] as CoverType[]).map(coverType => {
                        const tex = coverType === 'upper' ? upperTex : lowerTex;
                        if (!tex.top && !tex.front && !tex.side) return null;
                        return (
                            <div key={coverType}>
                                <span style={{ fontSize: 9, color: COVER_COLORS[coverType], fontWeight: 700 }}>{COVER_LABELS[coverType]} 텍스처</span>
                                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                    {tex.top && <img src={tex.top} alt="top" onClick={() => downloadTexture(tex.top!, 'top')} style={{ flex: 1, borderRadius: 3, border: `1px solid ${COVER_COLORS[coverType]}33`, cursor: 'pointer' }} />}
                                    {tex.front && <img src={tex.front} alt="front" onClick={() => downloadTexture(tex.front!, 'front')} style={{ flex: 1, borderRadius: 3, border: `1px solid ${COVER_COLORS[coverType]}33`, cursor: 'pointer' }} />}
                                    {tex.side && <img src={tex.side} alt="side" onClick={() => downloadTexture(tex.side!, 'side')} style={{ flex: 1, borderRadius: 3, border: `1px solid ${COVER_COLORS[coverType]}33`, cursor: 'pointer' }} />}
                                </div>
                            </div>
                        );
                    })}

                    {/* Log */}
                    {log.length > 0 && (
                        <div style={{ padding: '3px 5px', borderRadius: 4, background: '#00000044', fontSize: 8, color: '#475569', maxHeight: 64, overflow: 'auto', fontFamily: 'monospace' }}>
                            {log.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    )}
                </div>

                {/* Main Area */}
                <div style={{ position: 'relative', background: viewMode === 'editor' ? '#111827' : '#0f172a', overflow: 'hidden' }}>
                    {/* Editor View */}
                    {viewMode === 'editor' && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-conic-gradient(#1a1f2e 0% 25%, #151a28 0% 50%) 0 0 / 30px 30px' }}>
                            {selectedImage ? (
                                <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
                                    <img src={selectedImage} alt="원본" draggable={false} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 80px)', display: 'block', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
                                    {faceCoords && <CornerEditor faceCoords={faceCoords} onChange={setFaceCoords} />}
                                    {/* 현재 편집 중인 커버 표시 */}
                                    <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 4, background: `${COVER_COLORS[activeCover]}cc`, color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                        {COVER_LABELS[activeCover]} 편집 중
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#334155' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>매트리스 커버 사진을 업로드하세요</div>
                                    <div style={{ fontSize: 12, marginTop: 4 }}>상단 커버와 하단 커버를 각각 설정할 수 있습니다</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3D View */}
                    {viewMode === '3d' && (<>
                        <Canvas shadows camera={{ position: [3, 2, 3], fov: 40 }} gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}>
                            <OrbitControls enableZoom enablePan minDistance={2} maxDistance={8} autoRotate autoRotateSpeed={1.5} />
                            <Environment preset="studio" />
                            <ambientLight intensity={0.5} />
                            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
                            <spotLight position={[-5, 8, -5]} angle={0.3} penumbra={1} intensity={0.6} />
                            <Center>
                                <Suspense fallback={null}>
                                    {/* 상단 커버 */}
                                    <CoverBox
                                        textures={upperTex} rXZ={radiusXZ} rY={radiusY} seg={segments}
                                        width={2.5} height={0.22} depth={1.8}
                                        posY={0.14}
                                        defaultColors={UPPER_DEFAULTS}
                                    />
                                    {/* 하단 커버 */}
                                    <CoverBox
                                        textures={lowerTex} rXZ={radiusXZ} rY={radiusY} seg={segments}
                                        width={2.5} height={0.28} depth={1.8}
                                        posY={-0.14}
                                        defaultColors={LOWER_DEFAULTS}
                                    />
                                </Suspense>
                            </Center>
                            <ContactShadows position={[0, -0.35, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                            <gridHelper args={[10, 20, '#1e293b', '#1e293b']} position={[0, -0.35, 0]} />
                        </Canvas>
                        {/* 라운드 조절 슬라이더 */}
                        <div style={{
                            position: 'absolute', top: 12, left: 12, zIndex: 10,
                            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)',
                            borderRadius: 10, padding: '10px 14px', border: '1px solid #1e293b', minWidth: 200,
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>🔧 모서리 라운드</div>
                            {[
                                { label: 'rXZ (수직)', value: radiusXZ, set: setRadiusXZ, min: 0, max: 0.8, step: 0.01 },
                                { label: 'rY (상하)', value: radiusY, set: setRadiusY, min: 0, max: 0.1, step: 0.005 },
                                { label: 'seg', value: segments, set: setSegments, min: 2, max: 32, step: 1 },
                            ].map(s => (
                                <div key={s.label} style={{ marginBottom: 6 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                                        <span>{s.label}</span>
                                        <span style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>{s.value.toFixed(s.step < 1 ? 3 : 0)}</span>
                                    </div>
                                    <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                                        onChange={e => s.set(Number(e.target.value))}
                                        style={{ width: '100%', height: 4, accentColor: '#10b981', cursor: 'pointer' }}
                                    />
                                </div>
                            ))}
                        </div>
                        {/* 커버 구성 범례 */}
                        <div style={{
                            position: 'absolute', bottom: 12, left: 12, zIndex: 10,
                            background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)',
                            borderRadius: 8, padding: '8px 12px', border: '1px solid #1e293b',
                        }}>
                            <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
                                <span style={{ color: COVER_COLORS.upper }}>■ 상단 커버 (h=0.22)</span>
                                <span style={{ color: COVER_COLORS.lower }}>■ 하단 커버 (h=0.28)</span>
                            </div>
                        </div>
                    </>)}

                    {/* Mini 3D (editor mode) */}
                    {viewMode === 'editor' && hasTextures && (
                        <div onClick={() => setViewMode('3d')} style={{
                            position: 'absolute', bottom: 12, right: 12, width: 200, height: 150,
                            borderRadius: 8, overflow: 'hidden', border: '1px solid #334155',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', cursor: 'pointer',
                        }}>
                            <Canvas shadows camera={{ position: [3, 2, 3], fov: 40 }}>
                                <Environment preset="studio" />
                                <ambientLight intensity={0.5} />
                                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} />
                                <Center>
                                    <Suspense fallback={null}>
                                        <CoverBox textures={upperTex} rXZ={radiusXZ} rY={radiusY} seg={segments} width={2.5} height={0.22} depth={1.8} posY={0.14} defaultColors={UPPER_DEFAULTS} />
                                        <CoverBox textures={lowerTex} rXZ={radiusXZ} rY={radiusY} seg={segments} width={2.5} height={0.28} depth={1.8} posY={-0.14} defaultColors={LOWER_DEFAULTS} />
                                    </Suspense>
                                </Center>
                            </Canvas>
                            <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>클릭하여 3D 확대</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
