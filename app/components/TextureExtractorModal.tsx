'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useDesignStore } from '../lib/store';

/* ═══════════════════════════════════ */
/*  타입 정의                           */
/* ═══════════════════════════════════ */

interface Point { x: number; y: number }
interface Corners { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
interface FaceData { visible: boolean; corners: Corners }
interface FaceCoords { topSurface: FaceData; frontPanel: FaceData; sidePanel: FaceData }
interface CoverTextures { top: string | null; front: string | null; side: string | null }

// 외부에서 정의된 PREDEFINED_EXTRACTION_DATA 임포트
import { PREDEFINED_EXTRACTION_DATA, DEFAULT_EXTRACT_COORDS } from '../lib/defaultExtractData';

type FaceKey = 'topSurface' | 'frontPanel' | 'sidePanel';
type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
type CoverType = 'upper' | 'lower';

const FACE_COLORS: Record<FaceKey, string> = { topSurface: '#10b981', frontPanel: '#3b82f6', sidePanel: '#f59e0b' };
const FACE_LABELS: Record<FaceKey, string> = { topSurface: '상단면', frontPanel: '정면', sidePanel: '측면' };
const COVER_COLORS: Record<CoverType, string> = { upper: '#10b981', lower: '#8b5cf6' };
const COVER_LABELS: Record<CoverType, string> = { upper: '상단 커버', lower: '하단 커버' };

const DEFAULT_COORDS: FaceCoords = DEFAULT_EXTRACT_COORDS;

/* ═══════════════════════════════════ */
/*  원근 보정 크롭                      */
/* ═══════════════════════════════════ */

function perspectiveCrop(sourceImage: HTMLImageElement, corners: Corners, imgW: number, imgH: number, outputW: number, outputH: number): string {
    const canvas = document.createElement('canvas'); canvas.width = outputW; canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    const sx = [corners.topLeft.x / 100 * imgW, corners.topRight.x / 100 * imgW, corners.bottomRight.x / 100 * imgW, corners.bottomLeft.x / 100 * imgW];
    const sy = [corners.topLeft.y / 100 * imgH, corners.topRight.y / 100 * imgH, corners.bottomRight.y / 100 * imgH, corners.bottomLeft.y / 100 * imgH];
    const srcCanvas = document.createElement('canvas'); srcCanvas.width = imgW; srcCanvas.height = imgH;
    const srcCtx = srcCanvas.getContext('2d')!; srcCtx.drawImage(sourceImage, 0, 0, imgW, imgH);
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
/*  꼭짓점 에디터                       */
/* ═══════════════════════════════════ */

function CornerEditor({ faceCoords, onChange }: { faceCoords: FaceCoords; onChange: (u: FaceCoords) => void }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<{ face: FaceKey; corner: CornerKey } | null>(null);
    const handlePointerDown = (face: FaceKey, corner: CornerKey) => (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragging({ face, corner });
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
    return (
        <svg ref={svgRef} viewBox="0 0 100 100" preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'default' }}
            onPointerMove={handlePointerMove} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}
        >
            {(['topSurface', 'frontPanel', 'sidePanel'] as FaceKey[]).map(face => {
                const fd = faceCoords[face]; if (!fd.visible) return null;
                const c = fd.corners; const color = FACE_COLORS[face];
                const pts = `${c.topLeft.x},${c.topLeft.y} ${c.topRight.x},${c.topRight.y} ${c.bottomRight.x},${c.bottomRight.y} ${c.bottomLeft.x},${c.bottomLeft.y}`;
                const cx = (c.topLeft.x + c.topRight.x + c.bottomRight.x + c.bottomLeft.x) / 4;
                const cy = (c.topLeft.y + c.topRight.y + c.bottomRight.y + c.bottomLeft.y) / 4;
                return (
                    <g key={face}>
                        <polygon points={pts} fill={`${color}18`} stroke={color} strokeWidth="0.3" strokeDasharray="0.8,0.4" />
                        <text x={cx} y={cy} fill={color} fontSize="2.5" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>{FACE_LABELS[face]}</text>
                        {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as CornerKey[]).map(corner => (
                            <g key={corner}>
                                <circle cx={c[corner].x} cy={c[corner].y} r="2.5" fill="transparent" style={{ cursor: 'grab' }} onPointerDown={handlePointerDown(face, corner)} />
                                <circle cx={c[corner].x} cy={c[corner].y} r="1" fill="#fff" stroke={color} strokeWidth="0.35" style={{ pointerEvents: 'none' }} />
                            </g>
                        ))}
                    </g>
                );
            })}
        </svg>
    );
}

/* ═══════════════════════════════════ */
/*  메인 모달                          */
/* ═══════════════════════════════════ */

interface TextureExtractorModalProps {
    coverId?: string;
    coverLabel: string;
    initialUpperTex?: CoverTextures;
    initialLowerTex?: CoverTextures;
    initialUpperCoords?: FaceCoords | null;
    initialLowerCoords?: FaceCoords | null;
    initialUpperSource?: string | null;
    initialLowerSource?: string | null;
    onSave: (
        upper: CoverTextures, lower: CoverTextures,
        upperCoords: FaceCoords | null, lowerCoords: FaceCoords | null,
        upperSource: string | null, lowerSource: string | null
    ) => void;
    onClose: () => void;
}

export default function TextureExtractorModal({
    coverId,
    coverLabel,
    initialUpperTex, initialLowerTex,
    initialUpperCoords, initialLowerCoords,
    initialUpperSource, initialLowerSource,
    onSave, onClose
}: TextureExtractorModalProps) {
    const structureType = useDesignStore(s => s.structureType) || 'standard';
    const defaultTextures = useDesignStore(s => s.defaultTextures);
    const setDefaultTextures = useDesignStore(s => s.setDefaultTextures);

    // Initialize with existing values or defaults - coverId별로 먼저 조회, 없으면 structureType 조회
    const coverDef = coverId ? defaultTextures[coverId] : null;
    const styleDef = defaultTextures[structureType];
    const def = coverDef || styleDef;
    const hasInitialValues = initialUpperTex?.top || initialUpperTex?.front || initialUpperTex?.side ||
        initialLowerTex?.top || initialLowerTex?.front || initialLowerTex?.side;

    const specificExtractData = coverId ? PREDEFINED_EXTRACTION_DATA[coverId] : null;

    const startingUpperTex = hasInitialValues ? initialUpperTex : (def?.upper || { top: null, front: null, side: null });
    const startingLowerTex = hasInitialValues ? initialLowerTex : (def?.lower || { top: null, front: null, side: null });
    const startingUpperCoords = hasInitialValues ? initialUpperCoords : (def?.upperCoords || (specificExtractData ? specificExtractData.upperCoords : null) || null);
    const startingLowerCoords = hasInitialValues ? initialLowerCoords : (def?.lowerCoords || (specificExtractData ? specificExtractData.lowerCoords : null) || null);
    const startingUpperSource = hasInitialValues ? initialUpperSource : (def?.sourceImage?.upper || (specificExtractData ? specificExtractData.image : null) || null);
    const startingLowerSource = hasInitialValues ? initialLowerSource : (def?.sourceImage?.lower || (specificExtractData ? (specificExtractData.lowerImage || specificExtractData.image) : null) || null);

    const [activeCover, setActiveCover] = useState<CoverType>('upper');
    const [upperSource, setUpperSource] = useState<string | null>(startingUpperSource || null);
    const [lowerSource, setLowerSource] = useState<string | null>(startingLowerSource || null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [toastMsg, setToastMsg] = useState('');

    // 각 커버별 Coords 상태 분리 저장 (에디터 열 때마다 초기화 방지)
    const [upperCoords, setUpperCoords] = useState<FaceCoords | null>(startingUpperCoords || null);
    const [lowerCoords, setLowerCoords] = useState<FaceCoords | null>(startingLowerCoords || null);

    const [progress, setProgress] = useState('');
    const [upperTex, setUpperTex] = useState<CoverTextures>(startingUpperTex || { top: null, front: null, side: null });
    const [lowerTex, setLowerTex] = useState<CoverTextures>(startingLowerTex || { top: null, front: null, side: null });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentTex = activeCover === 'upper' ? upperTex : lowerTex;
    const setCurrentTex = activeCover === 'upper' ? setUpperTex : setLowerTex;
    const faceCoords = activeCover === 'upper' ? upperCoords : lowerCoords;
    const setFaceCoords = activeCover === 'upper' ? setUpperCoords : setLowerCoords;
    const selectedImage = activeCover === 'upper' ? upperSource : lowerSource;
    const setSelectedImage = activeCover === 'upper' ? setUpperSource : setLowerSource;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSelectedImage(url);
            setFaceCoords(null);
            setProgress('');
        }
    };

    const imageToBase64 = async (src: string): Promise<string> => {
        const r = await fetch(src); const b = await r.blob();
        return new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(rd.result as string); rd.onerror = rej; rd.readAsDataURL(b); });
    };

    const handleDetect = useCallback(async () => {
        if (!selectedImage) return;
        setIsDetecting(true);
        try {
            setProgress(`🔍 ${COVER_LABELS[activeCover]} AI 면 감지 중...`);
            const base64 = await imageToBase64(selectedImage);
            const res = await fetch('/api/generate-face-texture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64 }) });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setFaceCoords(result.faceCoords);
            setProgress('✅ 감지 완료! 꼭짓점을 드래그하여 조정하세요.');
        } catch {
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
            if (faceCoords.topSurface.visible) newTex.top = perspectiveCrop(img, faceCoords.topSurface.corners, W, H, 1024, 1024);
            if (faceCoords.frontPanel.visible) newTex.front = perspectiveCrop(img, faceCoords.frontPanel.corners, W, H, 1024, 400);
            if (faceCoords.sidePanel.visible) newTex.side = perspectiveCrop(img, faceCoords.sidePanel.corners, W, H, 1024, 400);
            setCurrentTex(newTex);
            setProgress(`🎉 ${COVER_LABELS[activeCover]} 텍스처 추출 완료!`);
        } catch (err: any) { setProgress(`❌ 오류: ${err.message}`); }
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

    const hasAnyTexture = (upperTex.top || upperTex.front || upperTex.side || lowerTex.top || lowerTex.front || lowerTex.side);

    const btnBase: React.CSSProperties = { borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', fontSize: 12 };
    const zoomBtnStyle: React.CSSProperties = { ...btnBase, background: '#1e293b', color: '#e2e8f0', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };

    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDraggingPan, setIsDraggingPan] = useState(false);

    const handlePanDown = useCallback((e: React.PointerEvent) => {
        setIsDraggingPan(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, []);
    const handlePanMove = useCallback((e: React.PointerEvent) => {
        if (isDraggingPan) {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        }
    }, [isDraggingPan]);
    const handlePanUp = useCallback((e: React.PointerEvent) => {
        setIsDraggingPan(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);
    const resetView = useCallback(() => {
        setScale(1);
        setPan({ x: 0, y: 0 });
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', background: '#0f172a' }}>
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>✂️</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>텍스처 추출기</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>— {coverLabel}</span>
                    </div>
                    {/* Toast Message */}
                    {toastMsg && (
                        <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: '#fff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            {toastMsg}
                        </div>
                    )}
                    <button onClick={onClose} style={{ ...btnBase, background: 'transparent', color: '#64748b', padding: '4px 10px', fontSize: 16 }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left Controls */}
                    <div style={{ width: 200, borderRight: '1px solid #1e293b', overflow: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, color: '#e2e8f0', flexShrink: 0 }}>
                        {/* Cover Tabs */}
                        <div style={{ display: 'flex', gap: 3 }}>
                            {(['upper', 'lower'] as CoverType[]).map(c => (
                                <button key={c} onClick={() => { setActiveCover(c); setProgress(''); }}
                                    style={{ ...btnBase, flex: 1, padding: '7px 4px', fontSize: 10, border: `1.5px solid ${COVER_COLORS[c]}${activeCover === c ? '' : '33'}`, background: activeCover === c ? `${COVER_COLORS[c]}20` : 'transparent', color: activeCover === c ? COVER_COLORS[c] : '#475569' }}>
                                    {activeCover === c ? '●' : '○'} {COVER_LABELS[c]}
                                </button>
                            ))}
                        </div>

                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ ...btnBase, padding: '9px', border: `1.5px dashed ${COVER_COLORS[activeCover]}44`, background: `${COVER_COLORS[activeCover]}08`, color: COVER_COLORS[activeCover] }}>📤 사진 업로드</button>

                        {selectedImage && (
                            <>
                                <button onClick={handleDetect} disabled={isDetecting} style={{ ...btnBase, padding: '8px', background: isDetecting ? '#065f46' : `linear-gradient(135deg, ${COVER_COLORS[activeCover]}, ${COVER_COLORS[activeCover]}cc)`, color: '#fff', cursor: isDetecting ? 'wait' : 'pointer' }}>{isDetecting ? '⏳ 감지중...' : '🔍 AI 면 감지'}</button>
                                {faceCoords && (
                                    <button onClick={handleCrop} style={{ ...btnBase, padding: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>✂️ {COVER_LABELS[activeCover]} 크롭</button>
                                )}
                            </>
                        )}

                        {/* Face Toggles */}
                        {faceCoords && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>면 선택</span>
                                {(['topSurface', 'frontPanel', 'sidePanel'] as FaceKey[]).map(f => (
                                    <button key={f} onClick={() => toggleFace(f)} style={{ ...btnBase, padding: '4px 6px', fontSize: 10, border: `1px solid ${FACE_COLORS[f]}30`, background: faceCoords[f].visible ? `${FACE_COLORS[f]}15` : 'transparent', color: faceCoords[f].visible ? FACE_COLORS[f] : '#334155', textAlign: 'left' }}>
                                        {faceCoords[f].visible ? '✓' : '○'} {FACE_LABELS[f]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 실시간 좌표값 표시 */}
                        {faceCoords && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: '#0f172a', borderRadius: 6, padding: 6, border: '1px solid #1e293b' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>📍 좌표값 ({COVER_LABELS[activeCover]})</span>
                                    <button
                                        onClick={() => {
                                            const coordData: Record<string, any> = {};
                                            (['topSurface', 'frontPanel', 'sidePanel'] as FaceKey[]).forEach(f => {
                                                const fd = faceCoords[f];
                                                coordData[f] = {
                                                    visible: fd.visible,
                                                    corners: {
                                                        topLeft: { x: Math.round(fd.corners.topLeft.x * 10) / 10, y: Math.round(fd.corners.topLeft.y * 10) / 10 },
                                                        topRight: { x: Math.round(fd.corners.topRight.x * 10) / 10, y: Math.round(fd.corners.topRight.y * 10) / 10 },
                                                        bottomRight: { x: Math.round(fd.corners.bottomRight.x * 10) / 10, y: Math.round(fd.corners.bottomRight.y * 10) / 10 },
                                                        bottomLeft: { x: Math.round(fd.corners.bottomLeft.x * 10) / 10, y: Math.round(fd.corners.bottomLeft.y * 10) / 10 },
                                                    }
                                                };
                                            });
                                            const json = JSON.stringify(coordData, null, 2);
                                            navigator.clipboard.writeText(json);
                                            setToastMsg('📋 좌표가 클립보드에 복사되었습니다!');
                                            setTimeout(() => setToastMsg(''), 2000);
                                        }}
                                        style={{ ...btnBase, padding: '2px 8px', fontSize: 9, background: '#334155', color: '#e2e8f0' }}
                                    >
                                        📋 복사
                                    </button>
                                </div>
                                {(['topSurface', 'frontPanel', 'sidePanel'] as FaceKey[]).map(f => {
                                    const fd = faceCoords[f];
                                    if (!fd.visible) return null;
                                    return (
                                        <div key={f} style={{ fontSize: 9, color: FACE_COLORS[f], fontFamily: 'monospace', lineHeight: 1.5 }}>
                                            <div style={{ fontWeight: 700, marginBottom: 1 }}>{FACE_LABELS[f]}:</div>
                                            <div style={{ color: '#cbd5e1', paddingLeft: 4 }}>
                                                TL({fd.corners.topLeft.x.toFixed(1)}, {fd.corners.topLeft.y.toFixed(1)})
                                                TR({fd.corners.topRight.x.toFixed(1)}, {fd.corners.topRight.y.toFixed(1)})
                                            </div>
                                            <div style={{ color: '#cbd5e1', paddingLeft: 4 }}>
                                                BL({fd.corners.bottomLeft.x.toFixed(1)}, {fd.corners.bottomLeft.y.toFixed(1)})
                                                BR({fd.corners.bottomRight.x.toFixed(1)}, {fd.corners.bottomRight.y.toFixed(1)})
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {progress && <div style={{ padding: '5px 8px', borderRadius: 4, background: `${COVER_COLORS[activeCover]}15`, fontSize: 10, color: COVER_COLORS[activeCover] }}>{progress}</div>}

                        {/* Texture Previews */}
                        {(['upper', 'lower'] as CoverType[]).map(ct => {
                            const tex = ct === 'upper' ? upperTex : lowerTex;
                            if (!tex.top && !tex.front && !tex.side) return null;
                            return (
                                <div key={ct}>
                                    <span style={{ fontSize: 9, color: COVER_COLORS[ct], fontWeight: 700 }}>{COVER_LABELS[ct]} ✓</span>
                                    <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                                        {tex.top && <img src={tex.top} alt="top" style={{ flex: 1, borderRadius: 3, border: `1px solid ${COVER_COLORS[ct]}33` }} />}
                                        {tex.front && <img src={tex.front} alt="front" style={{ flex: 1, borderRadius: 3, border: `1px solid ${COVER_COLORS[ct]}33` }} />}
                                        {tex.side && <img src={tex.side} alt="side" style={{ flex: 1, borderRadius: 3, border: `1px solid ${COVER_COLORS[ct]}33` }} />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Image Editor Area */}
                    <div
                        style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'repeating-conic-gradient(#1a1f2e 0% 25%, #151a28 0% 50%) 0 0 / 30px 30px', cursor: isDraggingPan ? 'grabbing' : 'grab' }}
                        onWheel={e => { e.stopPropagation(); setScale(s => Math.max(0.1, Math.min(10, s - e.deltaY * 0.002))); }}
                        onPointerDown={handlePanDown}
                        onPointerMove={handlePanMove}
                        onPointerUp={handlePanUp}
                        onPointerCancel={handlePanUp}
                    >
                        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8, background: 'rgba(15, 23, 42, 0.8)', padding: 6, borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                            <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} style={zoomBtnStyle} title="축소">➖</button>
                            <button onClick={resetView} style={{ ...zoomBtnStyle, width: 'auto', padding: '0 12px', fontSize: 11 }} title="초기화">{Math.round(scale * 100)}%</button>
                            <button onClick={() => setScale(s => Math.min(10, s + 0.2))} style={zoomBtnStyle} title="확대">➕</button>
                        </div>
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {selectedImage ? (
                                <div style={{ position: 'relative', transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: 'center', transition: isDraggingPan ? 'none' : 'transform 0.1s' }}>
                                    <img src={selectedImage} alt="원본" draggable={false} style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                                    {faceCoords && <CornerEditor faceCoords={faceCoords} onChange={setFaceCoords} />}
                                    <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 4, background: `${COVER_COLORS[activeCover]}cc`, color: '#fff', fontSize: 10, fontWeight: 700 }}>{COVER_LABELS[activeCover]} 편집 중</div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: '#334155' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>매트리스 커버 사진을 업로드하세요</div>
                                    <div style={{ fontSize: 12, marginTop: 4 }}>상단/하단 커버의 텍스처를 각각 추출합니다</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                        {hasAnyTexture ? '✅ 텍스처가 준비되었습니다' : '커버 사진에서 텍스처를 추출하세요'}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => {
                            const saveKey = coverId || structureType;
                            setDefaultTextures(saveKey, upperTex, lowerTex, upperCoords, lowerCoords, { upper: upperSource, lower: lowerSource });
                            setToastMsg(`"${coverLabel}" 커버 기본 텍스쳐로 저장되었습니다.`);
                            setTimeout(() => setToastMsg(''), 3000);
                        }} disabled={!hasAnyTexture} style={{ ...btnBase, padding: '8px 20px', background: hasAnyTexture ? '#3b82f6' : '#1e293b', color: hasAnyTexture ? '#fff' : '#475569', cursor: hasAnyTexture ? 'pointer' : 'not-allowed' }}>
                            Default로 저장
                        </button>
                        <button onClick={onClose} style={{ ...btnBase, padding: '8px 20px', background: '#1e293b', color: '#94a3b8' }}>취소</button>
                        <button onClick={() => { onSave(upperTex, lowerTex, upperCoords, lowerCoords, upperSource, lowerSource); onClose(); }} disabled={!hasAnyTexture}
                            style={{ ...btnBase, padding: '8px 24px', background: hasAnyTexture ? 'linear-gradient(135deg,#059669,#0d9488)' : '#1e293b', color: hasAnyTexture ? '#fff' : '#475569', cursor: hasAnyTexture ? 'pointer' : 'not-allowed' }}>
                            ✅ 분해도에 적용
                        </button>
                    </div>
                </div>
            </div >
        </div >
    );
}
