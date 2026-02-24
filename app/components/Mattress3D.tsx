'use client';

import * as THREE from 'three';
import React, { useState, useMemo, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { useDesignStore } from '../lib/store';
import { CORE_OPTIONS, TOP_FOAM_OPTIONS, COVER_OPTIONS, calcCoreDimensions } from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';

// --- Constants ---
const SCALE = 0.001; // mm to meters
const GAP_EXPLODED = 0.225;
const HOLE_RADIUS = 0.06; // 60mm radius (Ø120)

function Box({ position, args, color, opacity = 1, transparent = false, label, radius = 0 }: any) {
    if (radius > 0) {
        return (
            <RoundedBox position={position} args={args} radius={radius} smoothness={4} castShadow receiveShadow>
                <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} transparent={transparent} opacity={opacity} />
            </RoundedBox>
        );
    }
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} transparent={transparent} opacity={opacity} />
        </mesh>
    );
}

function CoreBox({ position, args, color }: any) {
    return (
        <RoundedBox
            position={position}
            args={args}
            radius={0.07}
            smoothness={4}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={color}
                roughness={0.6}
                metalness={0.1}
            />
        </RoundedBox>
    );
}

function GuardBox({ position, args, color, radius = 0.002 }: any) {
    return (
        <RoundedBox
            position={position}
            args={args}
            radius={Math.max(radius, 0.002)}
            smoothness={radius > 0.02 ? 4 : 2}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={color}
                roughness={0.6}
                metalness={0.1}
            />
        </RoundedBox>
    );
}

function PerforatedGuardFoam({ position, width, height, depth, holes, color, radius = 0 }: any) {
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        const w2 = width / 2;
        const h2 = height / 2;

        const r = Math.min(radius, w2, h2);

        if (r > 0) {
            shape.moveTo(-w2 + r, -h2);
            shape.lineTo(w2 - r, -h2);
            shape.quadraticCurveTo(w2, -h2, w2, -h2 + r);
            shape.lineTo(w2, h2 - r);
            shape.quadraticCurveTo(w2, h2, w2 - r, h2);
            shape.lineTo(-w2 + r, h2);
            shape.quadraticCurveTo(-w2, h2, -w2, h2 - r);
            shape.lineTo(-w2, -h2 + r);
            shape.quadraticCurveTo(-w2, -h2, -w2 + r, -h2);
        } else {
            shape.moveTo(-w2, -h2);
            shape.lineTo(w2, -h2);
            shape.lineTo(w2, h2);
            shape.lineTo(-w2, h2);
            shape.lineTo(-w2, -h2);
        }

        holes.forEach((hx: number) => {
            const holePath = new THREE.Path();
            holePath.absarc(hx, 0, HOLE_RADIUS, 0, Math.PI * 2, true);
            shape.holes.push(holePath);
        });

        const extrudeSettings = {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.002,
            bevelSize: 0.000,
            bevelOffset: 0,
            bevelSegments: 2,
            curveSegments: 24
        };

        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.translate(0, 0, -depth / 2);
        return geo;
    }, [width, height, depth, holes]);

    return (
        <mesh position={position} geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
        </mesh>
    );
}


function MattressModel({ explodeGap }: { explodeGap: number }) {
    const {
        customWidth, customDepth, coreId, isDual,
        topFoamEnabled, topFoamOptionId, topFoamRadius,
        guardFoamEnabled, guardFoamThickness, guardFoamRadius,
        bottomFoamEnabled, bottomFoamThickness, bottomFoamRadius,
    } = useDesignStore();
    const customOpts = useCustomOptionsStore();

    if (!customWidth || !customDepth) return null;

    const W = customWidth * SCALE;
    const D = customDepth * SCALE;
    const gfT = guardFoamThickness * SCALE;
    const gfEnabled = guardFoamEnabled === true;

    const allCores = [...CORE_OPTIONS, ...customOpts.cores];
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...customOpts.topFoams];

    const coreOption = allCores.find(c => c.id === coreId);
    const topFoamOpt = allTopFoams.find(o => o.id === topFoamOptionId);

    const coreH_mm = coreOption?.height || 200;
    const topT_mm = topFoamEnabled && topFoamOpt ? topFoamOpt.thickness : 0;
    const botT_mm = bottomFoamEnabled ? bottomFoamThickness : 0;

    const coreH = coreH_mm * SCALE;
    const topT = topT_mm * SCALE;
    const botT = botT_mm * SCALE;

    const CO = {
        core: '#FFFDD0',
        guard: '#ea580c',
        top: '#16a34a',
        bot: '#0d9488',
    };

    // 추가: 3D 모델 자체에도 약간의 기본 간격을 줍니다 (0.05 등)
    let currentY = 0;
    const baseGap = 0.05; // 3D 부품간 기본 이격 거리
    const actualGap = explodeGap + baseGap; // 슬라이더 값 + 기본 간격

    const botY = currentY + botT / 2;
    currentY += botT;
    if (botT > 0) currentY += actualGap;

    const guardY = currentY + coreH / 2;
    const coreLift = actualGap * 1.333;
    const coreY = guardY + coreLift;

    currentY += coreH;
    currentY += actualGap + coreLift;

    const topY = currentY + topT / 2;
    currentY += topT;
    if (topT > 0) currentY += actualGap;

    const dims = calcCoreDimensions(customWidth, customDepth, guardFoamThickness, isDual, gfEnabled);
    const coreW = dims.coreW * SCALE;
    const coreD = dims.coreD * SCALE;
    const gdLen = dims.guardD_len * SCALE;

    const renderCoreLayer = () => {
        const parts = [];

        if (gfEnabled) {
            const holePositions: number[] = [];
            if (isDual) {
                const offsetX = gfT / 2 + coreW / 2;
                holePositions.push(-offsetX, offsetX);
            } else {
                holePositions.push(0);
            }

            parts.push(
                <PerforatedGuardFoam
                    key="gf-top"
                    position={[0, guardY, D / 2 - gfT / 2]}
                    width={W} height={coreH} depth={gfT}
                    holes={holePositions} color={CO.guard} radius={guardFoamRadius * SCALE}
                />
            );

            parts.push(
                <GuardBox key="gf-bot" position={[0, guardY, -D / 2 + gfT / 2]} args={[W, coreH, gfT]} color={CO.guard} radius={guardFoamRadius * SCALE} />
            );

            const leftX = -W / 2 + gfT / 2;
            const rightX = W / 2 - gfT / 2;

            parts.push(
                <GuardBox key="gf-left" position={[leftX, guardY, 0]} args={[gfT, coreH, gdLen]} color={CO.guard} radius={guardFoamRadius * SCALE} />,
                <GuardBox key="gf-right" position={[rightX, guardY, 0]} args={[gfT, coreH, gdLen]} color={CO.guard} radius={guardFoamRadius * SCALE} />
            );

            if (isDual) {
                parts.push(
                    <GuardBox key="gf-center" position={[0, guardY, 0]} args={[gfT, coreH, gdLen]} color={CO.guard} />
                );
            }
        } else if (isDual) {
            parts.push(
                <GuardBox key="gf-center-only" position={[0, guardY, 0]} args={[gfT, coreH, D]} color={CO.guard} />
            );
        }

        if (isDual) {
            const offsetX = gfT / 2 + coreW / 2;
            const coreExp = actualGap * 0.222;

            parts.push(
                <CoreBox key="core-l" position={[-offsetX - coreExp, coreY, 0]} args={[coreW, coreH, coreD]} color={CO.core} />,
                <CoreBox key="core-r" position={[offsetX + coreExp, coreY, 0]} args={[coreW, coreH, coreD]} color={CO.core} />
            );
        } else {
            parts.push(
                <CoreBox key="core-s" position={[0, coreY, 0]} args={[coreW, coreH, coreD]} color={CO.core} />
            );
        }

        return parts;
    };

    return (
        <group dispose={null}>
            {bottomFoamEnabled && botT > 0 && (
                <Box position={[0, botY, 0]} args={[W, botT, D]} color={CO.bot} label="Bottom Foam" radius={bottomFoamRadius * SCALE} />
            )}

            {renderCoreLayer()}

            {topFoamEnabled && topT > 0 && (
                (() => {
                    const layers = topFoamOpt?.layers;
                    if (layers) {
                        try {
                            const layerHeightsMM = layers.split(':').map(v => Number(v) * 10).reverse();
                            const layerHeights = layerHeightsMM.map(h => h * SCALE);
                            let currentLayerY = topY - (topT / 2);
                            return (
                                <group>
                                    {layerHeights.map((h, i) => {
                                        const centerY = currentLayerY + h / 2;
                                        currentLayerY += h;
                                        const color = i === 0 ? '#16a34a' : '#4ade80';
                                        return (
                                            <Box key={`top-${i}`} position={[0, centerY, 0]} args={[W, h, D]}
                                                color={color} opacity={0.9} label={`Top Foam L${i + 1}`} radius={topFoamRadius * SCALE} />
                                        );
                                    })}
                                </group>
                            );
                        } catch {
                            return <Box position={[0, topY, 0]} args={[W, topT, D]} color={CO.top} label="Top Foam" radius={topFoamRadius * SCALE} />;
                        }
                    }
                    return <Box position={[0, topY, 0]} args={[W, topT, D]} color={CO.top} label="Top Foam" radius={topFoamRadius * SCALE} />;
                })()
            )}
        </group>
    );
}

/* ── Canvas 캡처 헬퍼 ── */
function CanvasCapture({ onReady }: { onReady: (gl: THREE.WebGLRenderer) => void }) {
    const { gl } = useThree();
    useEffect(() => { onReady(gl); }, [gl, onReady]);
    return null;
}

/* ══════════════════════════════════════ */
/* 외부 인터페이스                          */
/* ══════════════════════════════════════ */
export interface Mattress3DHandle {
    capture: () => Promise<string>; // returns base64 dataURL
}

export interface Mattress3DProps {
    className?: string;
    forcedExploded?: boolean;  // 외부 제어용 분해 뷰
    hideControls?: boolean;    // 버튼 숨기기 (개발요청서용)
}

// ── 이미지 파이핑(경계선) Y축 퍼센트 스캔 헬퍼 ──
async function detectSplitRatio(imageUrl: string): Promise<number> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(46); // fallback

            // 이미지를 작게 리사이즈하여 스캔 영역 및 연산 축소
            const W = 100;
            const H = 200;
            canvas.width = W;
            canvas.height = H;
            ctx.drawImage(img, 0, 0, W, H);

            const imgData = ctx.getImageData(0, 0, W, H);
            const data = imgData.data;

            let maxDiff = 0;
            let bestY = Math.floor(H * 0.46); // default 46% near center

            // 가장 대비(Contrast)가 큰 가로줄(경계선/파이핑)을 탐색합니다. (대략 35% ~ 60% 높이 사이 중앙 영역)
            const startY = Math.floor(H * 0.35);
            const endY = Math.floor(H * 0.60);

            for (let y = startY; y < endY; y++) {
                let diffSum = 0;
                for (let x = 0; x < W; x++) {
                    const idx1 = (y * W + x) * 4;
                    const idx2 = ((y + 1) * W + x) * 4;
                    // 위 픽셀과 아래 픽셀의 밝기 차이 누적
                    const luma1 = 0.299 * data[idx1] + 0.587 * data[idx1 + 1] + 0.114 * data[idx1 + 2];
                    const luma2 = 0.299 * data[idx2] + 0.587 * data[idx2 + 1] + 0.114 * data[idx2 + 2];
                    diffSum += Math.abs(luma1 - luma2);
                }
                if (diffSum > maxDiff) {
                    maxDiff = diffSum;
                    bestY = y;
                }
            }

            // 구한 bestY를 퍼센트로 환산 (위에서부터 픽셀 Y 위치)
            const percentage = (bestY / H) * 100;
            // 상식적인 범위를 벗어나면 기본값 46 사용
            if (percentage < 30 || percentage > 70) {
                resolve(46);
            } else {
                resolve(percentage);
            }
        };
        img.onerror = () => resolve(46);
        img.src = imageUrl;
    });
}

const Mattress3D = forwardRef<Mattress3DHandle, Mattress3DProps>(function Mattress3D(
    { className, forcedExploded, hideControls },
    ref
) {
    const [internalGap, setInternalGap] = useState(0);
    const explodeGap = forcedExploded ? 0.225 : internalGap;
    const glRef = useRef<THREE.WebGLRenderer | null>(null);

    const { coverId, customCoverImages } = useDesignStore();
    const customOpts = useCustomOptionsStore();
    const [splitRatio, setSplitRatio] = useState(46);

    const coverOption = [...COVER_OPTIONS, ...customOpts.covers].find(c => c.id === coverId);
    // AI 생성된 이미지가 있다면 최우선, 아니면 기본 커버 이미지 경로
    const currentCoverImg = (coverId && customCoverImages[coverId]) ? customCoverImages[coverId] : coverOption?.image;

    // 커버 이미지가 변경될 때마다 경계선(Split Ratio) 동적 스캔
    useEffect(() => {
        if (currentCoverImg) {
            detectSplitRatio(currentCoverImg).then((ratio) => {
                setSplitRatio(ratio);
            });
        }
    }, [currentCoverImg]);

    useImperativeHandle(ref, () => ({
        capture: async () => {
            if (!glRef.current) return '';
            // Force a render then grab the canvas
            const canvas = glRef.current.domElement;
            return canvas.toDataURL('image/png');
        }
    }));

    return (
        <div className={`relative ${className || ''}`} style={{ borderRadius: 12, overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            {!hideControls && (
                <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 items-center">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">부품 간격 조절</span>
                        <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.01"
                            value={internalGap}
                            onChange={(e) => setInternalGap(parseFloat(e.target.value))}
                            className="w-24 accent-indigo-600"
                        />
                    </div>
                </div>
            )}
            {!hideControls && (
                <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
                    <span className="text-xs font-bold text-slate-400">3D PREVIEW</span>
                </div>
            )}

            {/* 3D Canvas 레이어 (샌드위치 중간) */}
            <div className="absolute inset-0 z-10 transition-transform duration-300" style={{ transform: `translateY(${explodeGap * 40}px) scale(${1 - explodeGap * 0.4})` }}>
                <Canvas shadows camera={{ position: [2.5, 1.8, 3.0], fov: 45 }} gl={{ preserveDrawingBuffer: true, alpha: true }}>
                    <CanvasCapture onReady={(gl) => { glRef.current = gl; }} />
                    <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2} enableZoom={false} enablePan={false} />
                    <Environment preset="city" />
                    <ambientLight intensity={0.4} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                    <Center>
                        <MattressModel explodeGap={explodeGap} />
                    </Center>
                    <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2} far={4} />
                </Canvas>
            </div>

            {/* 상하단 커버 이미지 오버레이 */}
            {currentCoverImg && (
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden flex items-center justify-center">
                    {/* 상단 이미지 (Top Cover) */}
                    <div
                        className="absolute inset-0 transition-transform duration-300 ease-out flex items-center justify-center"
                        style={{
                            clipPath: `inset(0 0 ${100 - splitRatio}% 0)`,
                            transform: `translateY(-${explodeGap * 400}px) scale(0.95)`,
                        }}
                    >
                        <img src={currentCoverImg} alt="Top Cover" className="max-w-[120%] max-h-[120%] object-contain drop-shadow-2xl" />
                    </div>

                    {/* 하단 이미지 (Bottom Cover) */}
                    <div
                        className="absolute inset-0 transition-transform duration-300 ease-out flex items-center justify-center"
                        style={{
                            clipPath: `inset(${splitRatio}% 0 0 0)`,
                            transform: `translateY(${explodeGap * 150}px) scale(0.95)`,
                        }}
                    >
                        <img src={currentCoverImg} alt="Bottom Cover" className="max-w-[120%] max-h-[120%] object-contain drop-shadow-xl" />
                    </div>
                </div>
            )}
        </div>
    );
});

export default Mattress3D;
