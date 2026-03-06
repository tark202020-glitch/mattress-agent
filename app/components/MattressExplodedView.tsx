'use client';

import * as THREE from 'three';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { useDesignStore } from '../lib/store';
import { CORE_OPTIONS, TOP_FOAM_OPTIONS, COVER_OPTIONS, calcCoreDimensions, DESIGNER_COVER_OPTIONS } from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';
import { usePathname } from 'next/navigation';

// --- Constants ---
const SCALE = 0.001;
const LAYER_GAP = 0.18;  // 레이어 간 분해 간격

/* ══════════════════════════════════════ */
/*  재질별 Box 컴포넌트                      */
/* ══════════════════════════════════════ */

function FoamBox({ position, args, color, radius = 0.01, roughness = 0.85, opacity = 1 }: any) {
    const [W, H, D] = args;
    const maxRadius = Math.min(W / 2, H / 2, D / 2);
    const safeRadius = Math.max(0.0001, Math.min(radius, maxRadius * 0.95));

    return (
        <RoundedBox
            position={position}
            args={args}
            radius={safeRadius}
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

/* ══════════════════════════════════════ */
/*  커버 텍스처 시스템                         */
/* ══════════════════════════════════════ */

/* ---- 프로그래매틱 텍스처 생성 유틸 ---- */

function createQuiltedTexture(baseColor: string = '#f5f0eb'): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 배경
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    const cellSize = 64;
    const half = cellSize / 2;

    // 쿠션감 그라데이션
    for (let row = -1; row < size / cellSize + 1; row++) {
        for (let col = -1; col < size / cellSize + 1; col++) {
            const cx = col * cellSize + half;
            const cy = row * cellSize + half;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, half * 0.9);
            grad.addColorStop(0, 'rgba(255,255,255,0.4)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
            grad.addColorStop(0.85, 'rgba(0,0,0,0.08)');
            grad.addColorStop(1, 'rgba(0,0,0,0.15)');
            ctx.fillStyle = grad;
            ctx.fillRect(cx - half, cy - half, cellSize, cellSize);
        }
    }

    // 스티칭 대각선
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    for (let i = -size; i < size * 2; i += cellSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke();
    }

    // 터프팅 버튼
    for (let row = 0; row <= size / cellSize; row++) {
        for (let col = 0; col <= size / cellSize; col++) {
            const cx = col * cellSize;
            const cy = row * cellSize;
            const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
            bg.addColorStop(0, 'rgba(0,0,0,0.25)');
            bg.addColorStop(0.6, 'rgba(0,0,0,0.1)');
            bg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.arc(cx - 1, cy - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
}

function createRibbedTexture(baseColor: string = '#c4b59a'): THREE.CanvasTexture {
    const w = 512;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    const ribWidth = 18;
    const ribCount = Math.ceil(w / ribWidth);
    for (let i = 0; i < ribCount; i++) {
        const x = i * ribWidth;
        const g = ctx.createLinearGradient(x, 0, x + ribWidth, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.15)');
        g.addColorStop(0.15, 'rgba(0,0,0,0.04)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.1)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.1)');
        g.addColorStop(0.85, 'rgba(0,0,0,0.04)');
        g.addColorStop(1, 'rgba(0,0,0,0.15)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, ribWidth, h);
    }

    // 직물 노이즈
    for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
            ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
}

/* ══════════════════════════════════════ */
/*  텍스처 로딩 유틸 (안정적 로딩 + 캐시)     */
/* ══════════════════════════════════════ */

const textureCache = new Map<string, THREE.Texture>();

function loadTextureFromUrl(url: string): Promise<THREE.Texture | null> {
    if (!url) return Promise.resolve(null);
    const cached = textureCache.get(url);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
            textureCache.set(url, tex);
            resolve(tex);
        };
        img.onerror = () => {
            console.warn('[loadTexture] failed:', url?.substring(0, 80));
            resolve(null);
        };
        img.src = url;
    });
}

/* ══════════════════════════════════════ */
/*  안정적 텍스처 박스 (BoxGeometry 기반)     */
/* ══════════════════════════════════════ */

/**
 * StableTexturedBox: BoxGeometry 기반 6면 머티리얼 적용
 *
 * BoxGeometry의 면 인덱스는 항상 고정:
 *   0: +X (Right), 1: -X (Left)
 *   2: +Y (Top),   3: -Y (Bottom)
 *   4: +Z (Front),  5: -Z (Back)
 *
 * RoundedBox와 달리 groups/정점 공유 문제가 없어 UV가 절대 깨지지 않습니다.
 */
function StableTexturedBox({ position, args, mats }: {
    position: [number, number, number];
    args: [number, number, number];
    mats: THREE.Material[];
}) {
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={args} />
            {mats.map((mat, i) => (
                <primitive key={i} object={mat} attach={`material-${i}`} />
            ))}
        </mesh>
    );
}

/* ---- CoverBox: 뚜껑/바구니 형태 지오메트리 & 안정적 텍스처 매핑 ---- */
function CoverBox({ position, args, color, textureUrl, isTop = true, radius = 0.01, topTextureUrl, sideTextureFrontUrl, sideTextureSideUrl }: any) {
    const [W, H, D] = args as [number, number, number];
    const [topTex, setTopTex] = useState<THREE.Texture | null>(null);
    const [frontTex, setFrontTex] = useState<THREE.Texture | null>(null);
    const [sideTex, setSideTex] = useState<THREE.Texture | null>(null);

    // 텍스처 우선순위: 추출기 텍스처(topTextureUrl) > AI/커버 이미지(textureUrl)
    const finalTopUrl = topTextureUrl || textureUrl;

    // 안정적 텍스처 로딩 (캐시 활용)
    useEffect(() => {
        if (!finalTopUrl) { setTopTex(null); return; }
        let cancelled = false;
        loadTextureFromUrl(finalTopUrl).then(tex => { if (!cancelled) setTopTex(tex); });
        return () => { cancelled = true; };
    }, [finalTopUrl]);

    useEffect(() => {
        if (!sideTextureFrontUrl) { setFrontTex(null); return; }
        let cancelled = false;
        loadTextureFromUrl(sideTextureFrontUrl).then(tex => { if (!cancelled) setFrontTex(tex); });
        return () => { cancelled = true; };
    }, [sideTextureFrontUrl]);

    useEffect(() => {
        if (!sideTextureSideUrl) { setSideTex(null); return; }
        let cancelled = false;
        loadTextureFromUrl(sideTextureSideUrl).then(tex => { if (!cancelled) setSideTex(tex); });
        return () => { cancelled = true; };
    }, [sideTextureSideUrl]);

    // fallback 텍스처 생성 (한 번만 생성, 메모이제이션)
    const fallbackQuilted = useMemo(() => {
        return createQuiltedTexture(isTop ? '#f5f0eb' : '#d4c5a9');
    }, [isTop]);

    const fallbackRibbed = useMemo(() => {
        return createRibbedTexture(color || (isTop ? '#c4b59a' : '#5a5a5a'));
    }, [color, isTop]);

    // 6면 머티리얼 배열 (BoxGeometry 고정 인덱스)
    const mats = useMemo(() => {
        const sideColor = color || (isTop ? '#c4b59a' : '#5a5a5a');
        const topColor = color || (isTop ? '#f5f0eb' : '#6a6a6a');
        const botColor = isTop ? '#d4c5a9' : '#4a4a4a';

        // 텍스처가 있으면 color를 white로 → 텍스처 원색 유지
        const matSide = new THREE.MeshStandardMaterial({
            map: sideTex || fallbackRibbed,
            color: sideTex ? '#ffffff' : sideColor,
            roughness: 0.75,
            side: THREE.DoubleSide
        });
        const matFront = new THREE.MeshStandardMaterial({
            map: frontTex || fallbackRibbed,
            color: frontTex ? '#ffffff' : sideColor,
            roughness: 0.75,
            side: THREE.DoubleSide
        });

        const topMap = topTex || (isTop ? fallbackQuilted : null);
        const matTop = new THREE.MeshStandardMaterial({
            map: topMap,
            color: topTex ? '#ffffff' : topColor,
            roughness: 0.8,
            side: THREE.DoubleSide,
        });
        const matBot = new THREE.MeshStandardMaterial({
            color: botColor,
            roughness: 0.85,
            side: THREE.DoubleSide
        });
        const matInvisible = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false
        });

        // BoxGeometry 고정 면 인덱스:
        // 0: Right(+X), 1: Left(-X), 2: Top(+Y), 3: Bottom(-Y), 4: Front(+Z), 5: Back(-Z)
        return [
            matSide,                           // 0: Right (+X)
            matSide,                           // 1: Left (-X)
            isTop ? matTop : matInvisible,     // 2: Top (+Y)
            isTop ? matInvisible : matBot,     // 3: Bottom (-Y)
            matFront,                          // 4: Front (+Z)
            matFront                           // 5: Back (-Z)
        ];
    }, [topTex, frontTex, sideTex, fallbackQuilted, fallbackRibbed, color, isTop]);

    const t = 0.002; // 2mm 두께
    const wOut = W + 2 * t;
    const dOut = D + 2 * t;
    const hOut = H + t;

    return (
        <group position={position}>
            {/* 텍스처 캐리어: 안정적 BoxGeometry */}
            <StableTexturedBox
                position={[0, isTop ? -t / 2 : t / 2, 0]}
                args={[wOut, hOut, dOut]}
                mats={mats}
            />
        </group>
    );
}

/* 코어 박스 */
function CoreBox({ position, args, color }: any) {
    const [W, H, D] = args;
    const maxRadius = Math.min(W / 2, H / 2, D / 2);
    const safeRadius = Math.max(0.0001, Math.min(0.07, maxRadius * 0.95));

    return (
        <RoundedBox
            position={position}
            args={args}
            radius={safeRadius}
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

/* 센서 박스 */
function SensorBox({ position, args, color = '#ff0000' }: any) {
    const [W, H, D] = args;
    const maxRadius = Math.min(Math.abs(W) / 2, Math.abs(H) / 2, Math.abs(D) / 2);
    const safeRadius = Math.max(0.0001, Math.min(0.001, maxRadius * 0.95)); // 1mm 라운드

    return (
        <RoundedBox
            position={position}
            args={args}
            radius={safeRadius}
            smoothness={2}
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={color}
                roughness={0.7}
                metalness={0.1}
            />
        </RoundedBox>
    );
}

/* 가드폼 */
function GuardBox({ position, args, color, radius = 0.002 }: any) {
    const [W, H, D] = args;
    const maxRadius = Math.min(Math.abs(W) / 2, Math.abs(H) / 2, Math.abs(D) / 2);
    const safeRadius = Math.max(0.0001, Math.min(radius, maxRadius * 0.95));

    return (
        <RoundedBox
            position={position}
            args={args}
            radius={safeRadius}
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

function ExplodedModel({ isExploded, gaps }: { isExploded: boolean, gaps: any }) {
    const {
        customWidth, customDepth, coreId, isDual, coverId,
        topFoamEnabled, topFoamOptionId, topFoamRadius,
        guardFoamEnabled, guardFoamThickness, guardFoamRadius,
        bottomFoamEnabled, bottomFoamThickness, bottomFoamRadius,
        customCoverImages, structureType, sensorId,
        upperCoverTextures, lowerCoverTextures,
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
    const pathname = usePathname();
    const isDesigner = pathname === '/designer';
    const activeCovers = isDesigner ? DESIGNER_COVER_OPTIONS : COVER_OPTIONS;
    const allCovers = [...activeCovers, ...customOpts.covers];

    const coreOption = allCores.find(c => c.id === coreId);
    const topFoamOpt = allTopFoams.find(o => o.id === topFoamOptionId);
    const coverOption = allCovers.find(c => c.id === coverId);

    const coreH_mm = coreOption?.height || 200;
    const topT_mm = topFoamEnabled && topFoamOpt ? topFoamOpt.thickness : 0;
    const botT_mm = bottomFoamEnabled ? bottomFoamThickness : 0;
    // 커버 두께 계산: 내부 폼 레이어 기반
    const isBasic = structureType === 'basic';
    // 베이직: 상단 커버 = 코어(200mm) + 상단폼 두께 (전체를 감싸는 단일 커버)
    // 스탠다드/프리미엄: 상단 커버 = 상단폼 두께 + 50mm (뚜껑 형태)
    const topCoverT_mm = isBasic ? (coreH_mm + topT_mm) : (topT_mm + 50);
    // 하단 커버 = 코어 높이 + 하단폼 두께 (베이직은 하단 커버 없음)
    const botCoverT_mm = isBasic ? 0 : (coreH_mm + botT_mm);

    const coreH = coreH_mm * SCALE;
    const topT = topT_mm * SCALE;
    const botT = botT_mm * SCALE;
    const topCoverT = topCoverT_mm * SCALE;
    const botCoverT = botCoverT_mm * SCALE;

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

    let sensorArgs: [number, number, number] | null = null;
    if (sensorId === 'SENSOR_BAND_S') sensorArgs = [900 * SCALE, 3 * SCALE, 100 * SCALE];
    else if (sensorId === 'SENSOR_BAND_M') sensorArgs = [1200 * SCALE, 3 * SCALE, 100 * SCALE];
    else if (sensorId === 'SENSOR_BODY_P') sensorArgs = [800 * SCALE, 3 * SCALE, 1100 * SCALE];

    return (
        <AnimatedExplodedGroup
            ref={groupRef}
            explodeRef={explodeRef}
            W={W} D={D}
            coreH={coreH} coreW={coreW} coreD={coreD}
            topT={topT} botT={botT} topCoverT={topCoverT} botCoverT={botCoverT}
            gfT={gfT} gfEnabled={gfEnabled} gdLen={gdLen}
            isDual={isDual}
            isBasic={structureType === 'basic'}
            topFoamEnabled={topFoamEnabled}
            topFoamOpt={topFoamOpt}
            topFoamRadius={topFoamRadius}
            bottomFoamEnabled={bottomFoamEnabled}
            bottomFoamRadius={bottomFoamRadius}
            guardFoamRadius={guardFoamRadius}
            topTextureUrl={upperCoverTextures?.top || coverOption?.topImage}
            sideTextureFrontUrl={upperCoverTextures?.front || coverOption?.sideImageFront}
            sideTextureSideUrl={upperCoverTextures?.side || coverOption?.sideImageSide}
            lowerTopTextureUrl={lowerCoverTextures?.top}
            lowerSideTextureFrontUrl={lowerCoverTextures?.front || coverOption?.sideImageFront}
            lowerSideTextureSideUrl={lowerCoverTextures?.side || coverOption?.sideImageSide}
            customCoverImage={coverImg}
            sensorArgs={sensorArgs}
            CO={CO}
            {...gaps}
        />
    );
}

/* 애니메이션 적용 그룹 */
const AnimatedExplodedGroup = React.forwardRef(function AnimatedExplodedGroup(
    { explodeRef, W, D, coreH, coreW, coreD, topT, botT, topCoverT, botCoverT, gfT, gfEnabled, gdLen, isDual,
        isBasic, topFoamEnabled, topFoamOpt, topFoamRadius, bottomFoamEnabled, bottomFoamRadius, guardFoamRadius,
        topTextureUrl, sideTextureFrontUrl, sideTextureSideUrl,
        lowerTopTextureUrl, lowerSideTextureFrontUrl, lowerSideTextureSideUrl,
        customCoverImage, CO, sensorArgs,
        gapTopCover, gapTopFoam, gapInnerCore, gapBottomFoam, gapBottomCover }: any,
    ref: any
) {
    const bottomCoverRef = useRef<THREE.Group>(null);
    const bottomFoamRef = useRef<THREE.Group>(null);
    const coreGroupRef = useRef<THREE.Group>(null);
    const topFoamRef = useRef<THREE.Group>(null);
    const topCoverRef = useRef<THREE.Group>(null);
    const innerCoreRef = useRef<THREE.Group>(null);

    useFrame(() => {
        const t = explodeRef.current;

        const totalInnerH = botT + coreH + topT;
        const cy = totalInnerH / 2; // 모델의 전체 중심축을 중앙으로 정렬

        // 기준이 되는 y 센터 (조립 상태일 때의 위치)
        const coreBaseY = botT + coreH / 2;

        // 3. 코어 + 가드폼
        if (coreGroupRef.current) {
            coreGroupRef.current.position.y = (coreBaseY - cy);
        }

        // 코어 내부 메쉬 (스트링) - 지정된 커스텀 간격 반영
        if (innerCoreRef.current) {
            innerCoreRef.current.position.y = (gapInnerCore * SCALE) * t;
        }

        // 1. 하단 커버
        if (bottomCoverRef.current) {
            const baseCenterY = (botT + coreH) / 2;
            bottomCoverRef.current.position.y = (baseCenterY - cy) - (gapBottomCover * SCALE * t);
        }

        // 2. 하단폼
        if (botT > 0 && bottomFoamRef.current) {
            const baseCenterY = botT / 2;
            bottomFoamRef.current.position.y = (baseCenterY - cy) - (gapBottomFoam * SCALE * t);
        }

        // 4. 상단폼
        if (topT > 0 && topFoamRef.current) {
            const baseCenterY = botT + coreH + topT / 2;
            topFoamRef.current.position.y = (baseCenterY - cy) + (gapTopFoam * SCALE * t);
        }

        // 5. 상단 커버
        if (topCoverRef.current) {
            // 베이직: 코어+상단폼 전체를 감싸므로 코어 중앙에 배치
            // 스탠다드/프리미엄: 상단폼 중앙에 배치 (뚜껑 형태)
            const baseCenterY = isBasic
                ? (botT + (coreH + topT) / 2)
                : (botT + coreH + topT / 2);
            topCoverRef.current.position.y = (baseCenterY - cy) + (gapTopCover * SCALE * t);
        }
    });

    return (
        <group ref={ref} dispose={null}>
            {/* 1. 하단 커버 */}
            {!isBasic && (
                <group ref={bottomCoverRef}>
                    <CoverBox
                        position={[0, 0, 0]}
                        args={[W, coreH + botT > 0 ? coreH + botT : 0.001, D]}
                        color={CO.coverBot}
                        radius={bottomFoamRadius * SCALE}
                        topTextureUrl={lowerTopTextureUrl}
                        sideTextureFrontUrl={lowerSideTextureFrontUrl}
                        sideTextureSideUrl={lowerSideTextureSideUrl}
                        isTop={false}
                    />
                </group>
            )}

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

                {/* 코어 영역 (내부 메쉬 10cm 오프셋 용도) */}
                <group ref={innerCoreRef}>
                    {isDual ? (
                        <>
                            <CoreBox
                                position={[-(gfT / 2 + coreW / 2), 0, 0]}
                                args={[coreW, coreH, coreD]}
                                color={CO.core}
                            />
                            {sensorArgs && (
                                <SensorBox
                                    position={[-(gfT / 2 + coreW / 2), coreH / 2 + sensorArgs[1] / 2, -coreD / 2 + 600 * SCALE]}
                                    args={sensorArgs}
                                />
                            )}
                            <CoreBox
                                position={[gfT / 2 + coreW / 2, 0, 0]}
                                args={[coreW, coreH, coreD]}
                                color={CO.core}
                            />
                            {sensorArgs && (
                                <SensorBox
                                    position={[gfT / 2 + coreW / 2, coreH / 2 + sensorArgs[1] / 2, -coreD / 2 + 600 * SCALE]}
                                    args={sensorArgs}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <CoreBox
                                position={[0, 0, 0]}
                                args={[coreW, coreH, coreD]}
                                color={CO.core}
                            />
                            {sensorArgs && (
                                <SensorBox
                                    position={[0, coreH / 2 + sensorArgs[1] / 2, -coreD / 2 + 600 * SCALE]}
                                    args={sensorArgs}
                                />
                            )}
                        </>
                    )}
                </group>
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
                    args={[W + 10 * SCALE, isBasic ? (topCoverT > 0 ? topCoverT : 0.001) : (topT > 0 ? topT : 0.001), D + 10 * SCALE]}
                    color={CO.coverTop}
                    radius={topFoamRadius * SCALE}
                    textureUrl={customCoverImage}
                    topTextureUrl={topTextureUrl}
                    sideTextureFrontUrl={sideTextureFrontUrl}
                    sideTextureSideUrl={sideTextureSideUrl}
                    isTop={true}
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
    const { customWidth, topFoamEnabled, bottomFoamEnabled, structureType } = useDesignStore();

    // 부품별 이격 거리 (단위: mm)
    const [gapTopCover, setGapTopCover] = useState(100);
    const [gapTopFoam, setGapTopFoam] = useState(50);
    const [gapInnerCore, setGapInnerCore] = useState(100);
    const [gapBottomFoam, setGapBottomFoam] = useState(50);
    const [gapBottomCover, setGapBottomCover] = useState(100);

    const isBasic = structureType === 'basic';

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

                {/* 개별 슬라이더 패널 (분해 상태일 때만 표시) */}
                {isExploded && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.9)', padding: '12px 14px',
                        borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        display: 'flex', flexDirection: 'column', gap: 10, backdropFilter: 'blur(8px)', width: 220
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 2 }}>부품별 이격 간격 (mm)</div>

                        <GapSlider label="상단 커버 간격" value={gapTopCover} onChange={setGapTopCover} max={600} />
                        {topFoamEnabled && <GapSlider label="상단 폼 간격" value={gapTopFoam} onChange={setGapTopFoam} max={600} />}
                        <GapSlider label="코어(스트링) 상승" value={gapInnerCore} onChange={setGapInnerCore} max={600} />
                        {bottomFoamEnabled && <GapSlider label="하단 폼 간격" value={gapBottomFoam} onChange={setGapBottomFoam} max={600} />}
                        {!isBasic && <GapSlider label="하단 커버 간격" value={gapBottomCover} onChange={setGapBottomCover} max={600} />}
                    </div>
                )}
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
                    <ExplodedModel isExploded={isExploded} gaps={{ gapTopCover, gapTopFoam, gapInnerCore, gapBottomFoam, gapBottomCover }} />
                </Center>
            </Canvas>
        </div>
    );
}

// 헬퍼: 슬라이더 컴포넌트
function GapSlider({ label, value, onChange, max = 300 }: { label: string, value: number, onChange: (v: number) => void, max?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', fontWeight: 600 }}>
                <span>{label}</span>
                <span style={{ color: '#0ea5e9' }}>{value}mm</span>
            </div>
            <input
                type="range"
                min="0"
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#0ea5e9' }}
            />
        </div>
    );
}
