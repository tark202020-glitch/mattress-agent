'use client';

import * as THREE from 'three';
import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { useDesignStore } from '../lib/store';
import { CORE_OPTIONS, TOP_FOAM_OPTIONS, COVER_OPTIONS, calcCoreDimensions } from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';

// --- Constants ---
const SCALE = 0.001;
const LAYER_GAP = 0.18;  // 레이어 간 분해 간격

/* ══════════════════════════════════════ */
/*  재질별 Box 컴포넌트                      */
/* ══════════════════════════════════════ */

function FoamBox({ position, args, color, radius = 0.01, roughness = 0.85, opacity = 1 }: any) {
    return (
        <RoundedBox
            position={position}
            args={args}
            radius={Math.max(radius, 0.002)}
            smoothness={4}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={color}
                roughness={roughness}
                metalness={0.02}
                transparent={opacity < 1}
                opacity={opacity}
            />
        </RoundedBox>
    );
}

/* 커버 박스 - 텍스처 적용 가능 */
function CoverBox({ position, args, color, textureUrl, radius = 0.015 }: any) {
    const texture = useMemo(() => {
        if (!textureUrl) return null;
        const loader = new THREE.TextureLoader();
        const tex = loader.load(textureUrl);
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }, [textureUrl]);

    return (
        <RoundedBox
            position={position}
            args={args}
            radius={Math.max(radius, 0.005)}
            smoothness={4}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={texture ? '#ffffff' : color}
                map={texture}
                roughness={0.7}
                metalness={0.05}
            />
        </RoundedBox>
    );
}

/* 코어 박스 */
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
                roughness={0.5}
                metalness={0.15}
            />
        </RoundedBox>
    );
}

/* 가드폼 */
function GuardBox({ position, args, color, radius = 0.002 }: any) {
    return (
        <RoundedBox
            position={position}
            args={args}
            radius={Math.max(radius, 0.002)}
            smoothness={2}
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


/* ══════════════════════════════════════ */
/*  분해도 애니메이션 매니저                    */
/* ══════════════════════════════════════ */

function ExplodedModel({ isExploded }: { isExploded: boolean }) {
    const {
        customWidth, customDepth, coreId, isDual, coverId,
        topFoamEnabled, topFoamOptionId, topFoamRadius,
        guardFoamEnabled, guardFoamThickness, guardFoamRadius,
        bottomFoamEnabled, bottomFoamThickness, bottomFoamRadius,
        customCoverImages,
    } = useDesignStore();
    const customOpts = useCustomOptionsStore();

    const explodeRef = useRef(0);
    const groupRef = useRef<THREE.Group>(null);

    // 부드러운 분해 애니메이션
    useFrame(() => {
        const target = isExploded ? 1 : 0;
        explodeRef.current += (target - explodeRef.current) * 0.06;
    });

    if (!customWidth || !customDepth) return null;

    const W = customWidth * SCALE;
    const D = customDepth * SCALE;
    const gfT = guardFoamThickness * SCALE;
    const gfEnabled = guardFoamEnabled === true;

    const allCores = [...CORE_OPTIONS, ...customOpts.cores];
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...customOpts.topFoams];
    const allCovers = [...COVER_OPTIONS, ...customOpts.covers];

    const coreOption = allCores.find(c => c.id === coreId);
    const topFoamOpt = allTopFoams.find(o => o.id === topFoamOptionId);
    const coverOption = allCovers.find(c => c.id === coverId);

    const coreH_mm = coreOption?.height || 200;
    const topT_mm = topFoamEnabled && topFoamOpt ? topFoamOpt.thickness : 0;
    const botT_mm = bottomFoamEnabled ? bottomFoamThickness : 0;
    const coverT_mm = 15; // 커버 두께 (고정)

    const coreH = coreH_mm * SCALE;
    const topT = topT_mm * SCALE;
    const botT = botT_mm * SCALE;
    const coverT = coverT_mm * SCALE;

    // 커버 이미지
    const coverImg = (coverId && customCoverImages[coverId]) ? customCoverImages[coverId] : coverOption?.image;
    const coverColor = coverOption?.color || '#D4C5A9';

    // 색상
    const CO = {
        core: '#FFFDD0',
        guard: '#ea580c',
        top: '#16a34a',
        topLight: '#4ade80',
        bot: '#0d9488',
        coverTop: coverColor,
        coverBot: '#c9b896',
    };

    const dims = calcCoreDimensions(customWidth, customDepth, guardFoamThickness, isDual, gfEnabled);
    const coreW = dims.coreW * SCALE;
    const coreD = dims.coreD * SCALE;
    const gdLen = dims.guardD_len * SCALE;

    return (
        <AnimatedExplodedGroup
            ref={groupRef}
            explodeRef={explodeRef}
            W={W} D={D}
            coreH={coreH} coreW={coreW} coreD={coreD}
            topT={topT} botT={botT} coverT={coverT}
            gfT={gfT} gfEnabled={gfEnabled} gdLen={gdLen}
            isDual={isDual}
            topFoamEnabled={topFoamEnabled}
            topFoamOpt={topFoamOpt}
            topFoamRadius={topFoamRadius}
            bottomFoamEnabled={bottomFoamEnabled}
            bottomFoamRadius={bottomFoamRadius}
            guardFoamRadius={guardFoamRadius}
            coverImg={coverImg}
            CO={CO}
        />
    );
}

/* 애니메이션 적용 그룹 */
const AnimatedExplodedGroup = React.forwardRef(function AnimatedExplodedGroup(
    { explodeRef, W, D, coreH, coreW, coreD, topT, botT, coverT, gfT, gfEnabled, gdLen, isDual,
        topFoamEnabled, topFoamOpt, topFoamRadius, bottomFoamEnabled, bottomFoamRadius, guardFoamRadius,
        coverImg, CO }: any,
    ref: any
) {
    const bottomCoverRef = useRef<THREE.Group>(null);
    const bottomFoamRef = useRef<THREE.Group>(null);
    const coreGroupRef = useRef<THREE.Group>(null);
    const topFoamRef = useRef<THREE.Group>(null);
    const topCoverRef = useRef<THREE.Group>(null);

    useFrame(() => {
        const t = explodeRef.current;
        const gap = LAYER_GAP * t;

        // 레이어 Y 위치 계산 (아래→위)
        let y = 0;

        // 1. 하단 커버
        if (bottomCoverRef.current) {
            bottomCoverRef.current.position.y = y - gap * 2;
        }
        y += coverT;

        // 2. 하단폼
        if (bottomFoamRef.current) {
            bottomFoamRef.current.position.y = y + botT / 2 - gap * 1;
        }
        y += botT > 0 ? botT : 0;

        // 3. 가드폼 + 코어 (중앙 기준)
        if (coreGroupRef.current) {
            coreGroupRef.current.position.y = y + coreH / 2;
        }
        y += coreH;

        // 4. 상단폼
        if (topFoamRef.current) {
            topFoamRef.current.position.y = y + topT / 2 + gap * 1;
        }
        y += topT > 0 ? topT : 0;

        // 5. 상단 커버
        if (topCoverRef.current) {
            topCoverRef.current.position.y = y + coverT / 2 + gap * 2;
        }
    });

    return (
        <group ref={ref} dispose={null}>
            {/* 1. 하단 커버 */}
            <group ref={bottomCoverRef}>
                <CoverBox
                    position={[0, coverT / 2, 0]}
                    args={[W, coverT, D]}
                    color={CO.coverBot}
                    radius={0.01}
                />
            </group>

            {/* 2. 하단폼 */}
            {bottomFoamEnabled && botT > 0 && (
                <group ref={bottomFoamRef}>
                    <FoamBox
                        position={[0, 0, 0]}
                        args={[W, botT, D]}
                        color={CO.bot}
                        radius={bottomFoamRadius * SCALE}
                        roughness={0.9}
                    />
                </group>
            )}

            {/* 3. 코어 + 가드폼 */}
            <group ref={coreGroupRef}>
                {/* 가드폼 */}
                {gfEnabled && (
                    <>
                        {/* 전후 가드폼 */}
                        <GuardBox
                            position={[0, 0, D / 2 - gfT / 2]}
                            args={[W, coreH, gfT]}
                            color={CO.guard}
                            radius={guardFoamRadius * SCALE}
                        />
                        <GuardBox
                            position={[0, 0, -D / 2 + gfT / 2]}
                            args={[W, coreH, gfT]}
                            color={CO.guard}
                            radius={guardFoamRadius * SCALE}
                        />
                        {/* 좌우 가드폼 */}
                        <GuardBox
                            position={[-W / 2 + gfT / 2, 0, 0]}
                            args={[gfT, coreH, gdLen]}
                            color={CO.guard}
                            radius={guardFoamRadius * SCALE}
                        />
                        <GuardBox
                            position={[W / 2 - gfT / 2, 0, 0]}
                            args={[gfT, coreH, gdLen]}
                            color={CO.guard}
                            radius={guardFoamRadius * SCALE}
                        />
                        {/* Dual 중앙 가드폼 */}
                        {isDual && (
                            <GuardBox
                                position={[0, 0, 0]}
                                args={[gfT, coreH, gdLen]}
                                color={CO.guard}
                            />
                        )}
                    </>
                )}

                {/* Dual 중앙 가드폼 (가드폼 없이 Dual만) */}
                {!gfEnabled && isDual && (
                    <GuardBox
                        position={[0, 0, 0]}
                        args={[gfT, coreH, D]}
                        color={CO.guard}
                    />
                )}

                {/* 코어 */}
                {isDual ? (
                    <>
                        <CoreBox
                            position={[-(gfT / 2 + coreW / 2), 0, 0]}
                            args={[coreW, coreH, coreD]}
                            color={CO.core}
                        />
                        <CoreBox
                            position={[gfT / 2 + coreW / 2, 0, 0]}
                            args={[coreW, coreH, coreD]}
                            color={CO.core}
                        />
                    </>
                ) : (
                    <CoreBox
                        position={[0, 0, 0]}
                        args={[coreW, coreH, coreD]}
                        color={CO.core}
                    />
                )}
            </group>

            {/* 4. 상단폼 */}
            {topFoamEnabled && topT > 0 && (
                <group ref={topFoamRef}>
                    {topFoamOpt?.layers ? (
                        (() => {
                            try {
                                const layerHeightsMM = topFoamOpt.layers.split(':').map((v: string) => Number(v) * 10).reverse();
                                const layerHeights = layerHeightsMM.map((h: number) => h * SCALE);
                                let currentLayerY = -(topT / 2);
                                return (
                                    <>
                                        {layerHeights.map((h: number, i: number) => {
                                            const centerY = currentLayerY + h / 2;
                                            currentLayerY += h;
                                            const color = i === 0 ? CO.top : CO.topLight;
                                            return (
                                                <FoamBox
                                                    key={`top-${i}`}
                                                    position={[0, centerY, 0]}
                                                    args={[W, h, D]}
                                                    color={color}
                                                    opacity={0.9}
                                                    radius={topFoamRadius * SCALE}
                                                />
                                            );
                                        })}
                                    </>
                                );
                            } catch {
                                return (
                                    <FoamBox
                                        position={[0, 0, 0]}
                                        args={[W, topT, D]}
                                        color={CO.top}
                                        radius={topFoamRadius * SCALE}
                                    />
                                );
                            }
                        })()
                    ) : (
                        <FoamBox
                            position={[0, 0, 0]}
                            args={[W, topT, D]}
                            color={CO.top}
                            radius={topFoamRadius * SCALE}
                        />
                    )}
                </group>
            )}

            {/* 5. 상단 커버 */}
            <group ref={topCoverRef}>
                <CoverBox
                    position={[0, 0, 0]}
                    args={[W, coverT, D]}
                    color={CO.coverTop}
                    textureUrl={coverImg}
                    radius={0.015}
                />
            </group>
        </group>
    );
});


/* ══════════════════════════════════════ */
/*  메인 분해도 뷰어                         */
/* ══════════════════════════════════════ */

export interface MattressExplodedViewProps {
    className?: string;
}

export default function MattressExplodedView({ className }: MattressExplodedViewProps) {
    const [isExploded, setIsExploded] = useState(true);
    const { customWidth } = useDesignStore();

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                background: '#f0f4f8',
                border: '1px solid #e2e8f0',
                minHeight: 400,
            }}
        >
            {/* Controls */}
            <div style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}>
                <button
                    onClick={() => setIsExploded(!isExploded)}
                    style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                        background: isExploded
                            ? 'linear-gradient(135deg, #059669, #0d9488)'
                            : 'rgba(255,255,255,0.95)',
                        color: isExploded ? '#fff' : '#475569',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.3s',
                    }}
                >
                    {isExploded ? '🔍 분해 상태' : '📦 조립 상태'}
                </button>
            </div>

            {/* Badge */}
            <div style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                zIndex: 20,
                pointerEvents: 'none',
            }}>
                <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94a3b8',
                    letterSpacing: '0.05em',
                    background: 'rgba(255,255,255,0.8)',
                    padding: '4px 10px',
                    borderRadius: 8,
                    backdropFilter: 'blur(4px)',
                }}>
                    EXPLODED VIEW
                </span>
            </div>

            {/* 미선택 상태 */}
            {!customWidth && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                    background: 'rgba(248,250,252,0.9)',
                }}>
                    <div style={{
                        textAlign: 'center',
                        color: '#94a3b8',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📐</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>사이즈를 먼저 선택해주세요</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>매트리스 사양을 설정하면 분해도가 표시됩니다</div>
                    </div>
                </div>
            )}

            {/* 3D Canvas */}
            <Canvas
                shadows
                camera={{ position: [2.2, 1.6, 2.8], fov: 40 }}
                gl={{ preserveDrawingBuffer: true, alpha: true, antialias: true }}
                style={{ background: 'transparent' }}
            >
                <OrbitControls
                    minPolarAngle={Math.PI / 6}
                    maxPolarAngle={Math.PI / 2.2}
                    enableZoom={true}
                    enablePan={true}
                    minDistance={1.5}
                    maxDistance={6}
                />
                <Environment preset="city" />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.2} castShadow />
                <spotLight position={[-5, 8, -5]} angle={0.3} penumbra={1} intensity={0.4} />
                <Center>
                    <ExplodedModel isExploded={isExploded} />
                </Center>
                <ContactShadows position={[0, -0.05, 0]} opacity={0.3} scale={10} blur={2.5} far={4} />

                {/* 바닥 그리드 */}
                <gridHelper args={[10, 20, '#ddd', '#eee']} position={[0, -0.05, 0]} />
            </Canvas>
        </div>
    );
}
