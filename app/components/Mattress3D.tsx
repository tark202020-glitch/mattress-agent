'use client';

import * as THREE from 'three';
import React, { useState, useMemo, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import { useDesignStore } from '../lib/store';
import { CORE_OPTIONS, TOP_FOAM_OPTIONS, COVER_OPTIONS, DESIGNER_COVER_OPTIONS, calcCoreDimensions } from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';
import { usePathname } from 'next/navigation';

// --- Constants ---
const SCALE = 0.001; // mm to meters
const GAP_EXPLODED = 0.225;
const HOLE_RADIUS = 0.06; // 60mm radius (Ø120)

/* ══════════════════════════════════════ */
/*  폼 재질 텍스쳐 생성 유틸              */
/* ══════════════════════════════════════ */
let _foamNoiseTex: THREE.CanvasTexture | null = null;
function getFoamNoiseTexture(): THREE.CanvasTexture {
    if (_foamNoiseTex) return _foamNoiseTex;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    // 미세 기공 + 스펀지 느낌
    for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
            const v = 200 + Math.floor(Math.random() * 56);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    // 큰 기공 (약간의 어두운 점)
    for (let i = 0; i < 60; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        const r = 2 + Math.random() * 4;
        ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.06})`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    _foamNoiseTex = tex;
    return tex;
}

let _foamRoughnessTex: THREE.CanvasTexture | null = null;
function getFoamRoughnessTexture(): THREE.CanvasTexture {
    if (_foamRoughnessTex) return _foamRoughnessTex;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    // 밝을수록 거칠고, 어두울수록 매끈 (roughness map)
    for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
            const v = 170 + Math.floor(Math.random() * 70);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, 2, 2);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    _foamRoughnessTex = tex;
    return tex;
}

function Box({ position, args, color, opacity = 1, transparent = false, label, radius = 0 }: any) {
    const foamNoise = useMemo(() => getFoamNoiseTexture(), []);
    const foamRoughness = useMemo(() => getFoamRoughnessTexture(), []);
    const isTransparent = transparent || opacity < 1;

    if (radius > 0) {
        return (
            <RoundedBox position={position} args={args} radius={radius} smoothness={4} castShadow receiveShadow>
                <meshStandardMaterial
                    color={color} roughness={0.85} metalness={0.02}
                    roughnessMap={foamRoughness} map={foamNoise}
                    transparent={isTransparent} opacity={opacity}
                    depthWrite={opacity > 0.5}
                />
            </RoundedBox>
        );
    }
    return (
        <mesh position={position} castShadow receiveShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial
                color={color} roughness={0.85} metalness={0.02}
                roughnessMap={foamRoughness} map={foamNoise}
                transparent={isTransparent} opacity={opacity}
                depthWrite={opacity > 0.5}
            />
        </mesh>
    );
}

function CoreBox({ position, args, color, opacity = 1 }: any) {
    const foamNoise = useMemo(() => getFoamNoiseTexture(), []);
    const isTransparent = opacity < 1;
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
                map={foamNoise}
                transparent={isTransparent}
                opacity={opacity}
                depthWrite={opacity > 0.5}
            />
        </RoundedBox>
    );
}

function GuardBox({ position, args, color, radius = 0.002, opacity = 1 }: any) {
    const foamRoughness = useMemo(() => getFoamRoughnessTexture(), []);
    const isTransparent = opacity < 1;
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
                roughness={0.75}
                metalness={0.05}
                roughnessMap={foamRoughness}
                transparent={isTransparent}
                opacity={opacity}
                depthWrite={opacity > 0.5}
            />
        </RoundedBox>
    );
}

function PerforatedGuardFoam({ position, width, height, depth, holes, color, radius = 0, opacity = 1 }: any) {
    const foamRoughness = useMemo(() => getFoamRoughnessTexture(), []);
    const isTransparent = opacity < 1;
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
            <meshStandardMaterial
                color={color} roughness={0.75} metalness={0.05}
                roughnessMap={foamRoughness}
                transparent={isTransparent} opacity={opacity}
                depthWrite={opacity > 0.5}
            />
        </mesh>
    );
}

/* ══════════════════════════════════════ */
/*  커버 텍스처 시스템 (3D Preview용)       */
/* ══════════════════════════════════════ */

const textureCachePreview = new Map<string, THREE.Texture>();

function loadTextureFromUrl(url: string): Promise<THREE.Texture | null> {
    if (!url) return Promise.resolve(null);
    const cached = textureCachePreview.get(url);
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
            textureCachePreview.set(url, tex);
            resolve(tex);
        };
        img.onerror = () => {
            console.warn('[3D Preview] texture load failed:', url?.substring(0, 80));
            resolve(null);
        };
        img.src = url;
    });
}

function createQuiltedTexture(baseColor: string = '#f5f0eb'): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);
    const cellSize = 64;
    const half = cellSize / 2;
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
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1.5;
    for (let i = -size; i < size * 2; i += cellSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke();
    }
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
    const w = 512, h = 256;
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

function CoverBox({ position, args, color, isTop = true, topTextureUrl, sideTextureFrontUrl, sideTextureSideUrl }: {
    position: [number, number, number];
    args: [number, number, number];
    color: string;
    isTop?: boolean;
    topTextureUrl?: string | null;
    sideTextureFrontUrl?: string | null;
    sideTextureSideUrl?: string | null;
}) {
    const [W, H, D] = args;
    const [topTex, setTopTex] = useState<THREE.Texture | null>(null);
    const [frontTex, setFrontTex] = useState<THREE.Texture | null>(null);
    const [sideTex, setSideTex] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        if (!topTextureUrl) { setTopTex(null); return; }
        let cancelled = false;
        loadTextureFromUrl(topTextureUrl).then(tex => { if (!cancelled) setTopTex(tex); });
        return () => { cancelled = true; };
    }, [topTextureUrl]);

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

    const fallbackQuilted = useMemo(() => {
        return createQuiltedTexture(isTop ? '#f5f0eb' : '#d4c5a9');
    }, [isTop]);

    const fallbackRibbed = useMemo(() => {
        return createRibbedTexture(color || (isTop ? '#c4b59a' : '#5a5a5a'));
    }, [color, isTop]);

    const mats = useMemo(() => {
        const sideColor = color || (isTop ? '#c4b59a' : '#5a5a5a');
        const topColor = color || (isTop ? '#f5f0eb' : '#6a6a6a');
        const botColor = isTop ? '#d4c5a9' : '#4a4a4a';

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

        // BoxGeometry: 0:Right(+X), 1:Left(-X), 2:Top(+Y), 3:Bottom(-Y), 4:Front(+Z), 5:Back(-Z)
        return [
            matSide,                           // 0: Right (+X)
            matSide,                           // 1: Left (-X)
            isTop ? matTop : matInvisible,     // 2: Top (+Y)
            isTop ? matInvisible : matBot,     // 3: Bottom (-Y)
            matFront,                          // 4: Front (+Z)
            matFront                           // 5: Back (-Z)
        ];
    }, [topTex, frontTex, sideTex, fallbackQuilted, fallbackRibbed, color, isTop]);

    const t = 0.002;
    const wOut = W + 2 * t;
    const dOut = D + 2 * t;
    const hOut = H + t;

    return (
        <group position={position}>
            <StableTexturedBox
                position={[0, isTop ? -t / 2 : t / 2, 0]}
                args={[wOut, hOut, dOut]}
                mats={mats}
            />
        </group>
    );
}


function MattressModel({ explodeGap }: { explodeGap: number }) {
    const {
        customWidth, customDepth, coreId, isDual, coverId,
        topFoamEnabled, topFoamOptionId, topFoamRadius,
        guardFoamEnabled, guardFoamThickness, guardFoamRadius,
        bottomFoamEnabled, bottomFoamThickness, bottomFoamRadius,
        structureType, upperCoverTextures, lowerCoverTextures,
    } = useDesignStore();
    const customOpts = useCustomOptionsStore();
    const pathname = usePathname();
    const isDesigner = pathname === '/designer';
    const activeCovers = isDesigner ? DESIGNER_COVER_OPTIONS : COVER_OPTIONS;
    const allCovers = [...activeCovers, ...customOpts.covers];

    if (!customWidth || !customDepth) return null;

    const W = customWidth * SCALE;
    const D = customDepth * SCALE;
    const gfT = guardFoamThickness * SCALE;
    const gfEnabled = guardFoamEnabled === true;

    const allCores = [...CORE_OPTIONS, ...customOpts.cores];
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...customOpts.topFoams];

    const coreOption = allCores.find(c => c.id === coreId);
    const topFoamOpt = allTopFoams.find(o => o.id === topFoamOptionId);
    const coverOption = allCovers.find(c => c.id === coverId);

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

    let currentY = 0;
    // 추가: 3D 모델 기본 간격을 0으로 설정
    const baseGap = 0; // 3D 부품간 기본 이격 거리
    const actualGap = explodeGap + baseGap; // 슬라이더 값 + 기본 간격

    // ── 조립/분해 시 내부 폼 투명도 ──
    // gap이 0이면 폼이 완전 투명 (커버만 보임), gap이 커지면 점점 불투명
    const foamOpacity = coverId ? Math.min(1, explodeGap * 10) : 1;

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
                    opacity={foamOpacity}
                />
            );

            parts.push(
                <GuardBox key="gf-bot" position={[0, guardY, -D / 2 + gfT / 2]} args={[W, coreH, gfT]} color={CO.guard} radius={guardFoamRadius * SCALE} opacity={foamOpacity} />
            );

            const leftX = -W / 2 + gfT / 2;
            const rightX = W / 2 - gfT / 2;

            parts.push(
                <GuardBox key="gf-left" position={[leftX, guardY, 0]} args={[gfT, coreH, gdLen]} color={CO.guard} radius={guardFoamRadius * SCALE} opacity={foamOpacity} />,
                <GuardBox key="gf-right" position={[rightX, guardY, 0]} args={[gfT, coreH, gdLen]} color={CO.guard} radius={guardFoamRadius * SCALE} opacity={foamOpacity} />
            );

            if (isDual) {
                parts.push(
                    <GuardBox key="gf-center" position={[0, guardY, 0]} args={[gfT, coreH, gdLen]} color={CO.guard} opacity={foamOpacity} />
                );
            }
        } else if (isDual) {
            parts.push(
                <GuardBox key="gf-center-only" position={[0, guardY, 0]} args={[gfT, coreH, D]} color={CO.guard} opacity={foamOpacity} />
            );
        }

        if (isDual) {
            const offsetX = gfT / 2 + coreW / 2;
            const coreExp = actualGap * 0.222;

            parts.push(
                <CoreBox key="core-l" position={[-offsetX - coreExp, coreY, 0]} args={[coreW, coreH, coreD]} color={CO.core} opacity={foamOpacity} />,
                <CoreBox key="core-r" position={[offsetX + coreExp, coreY, 0]} args={[coreW, coreH, coreD]} color={CO.core} opacity={foamOpacity} />
            );
        } else {
            parts.push(
                <CoreBox key="core-s" position={[0, coreY, 0]} args={[coreW, coreH, coreD]} color={CO.core} opacity={foamOpacity} />
            );
        }

        return parts;
    };

    // ── 커버 레이어 계산 ──
    const isBasic = structureType === 'basic';
    // 커버 두께 계산 (coreH_mm, topT_mm, botT_mm는 위에서 이미 선언됨)
    const topCoverT_mm = isBasic ? (coreH_mm + topT_mm) : (topT_mm + 50);
    const botCoverT_mm = isBasic ? 0 : (coreH_mm + botT_mm);
    const topCoverT = topCoverT_mm * SCALE;
    const botCoverT = botCoverT_mm * SCALE;

    // 커버 위치 계산
    const coverColor = coverOption?.color || '#D4C5A9';

    // 상단 커버 오프셋: topFoam 위에 올리기
    const topCoverBaseY = currentY + topCoverT / 2;
    if (topCoverT > 0) currentY += topCoverT + actualGap;

    // 하단 커버 위치
    const botCoverY = -(botCoverT / 2 + actualGap * 0.5);

    // 텍스처 URL 결정: upperCoverTextures(추출기 결과) > 커버 옵션의 기본 이미지
    const topTexUrl = upperCoverTextures?.top || coverOption?.topImage || null;
    const frontTexUrl = upperCoverTextures?.front || coverOption?.sideImageFront || null;
    const sideTexUrl = upperCoverTextures?.side || coverOption?.sideImageSide || null;
    const lowerTopTexUrl = lowerCoverTextures?.top || null;
    const lowerFrontTexUrl = lowerCoverTextures?.front || coverOption?.sideImageFront || null;
    const lowerSideTexUrl = lowerCoverTextures?.side || coverOption?.sideImageSide || null;

    return (
        <group dispose={null}>
            {/* 하단 커버 (Basic 제외) */}
            {!isBasic && coverId && botCoverT > 0 && (
                <CoverBox
                    position={[0, botCoverY, 0]}
                    args={[W, botCoverT, D]}
                    color={coverColor}
                    isTop={false}
                    topTextureUrl={lowerTopTexUrl}
                    sideTextureFrontUrl={lowerFrontTexUrl}
                    sideTextureSideUrl={lowerSideTexUrl}
                />
            )}

            {bottomFoamEnabled && botT > 0 && foamOpacity > 0.01 && (
                <Box position={[0, botY, 0]} args={[W, botT, D]} color={CO.bot} label="Bottom Foam" radius={bottomFoamRadius * SCALE} opacity={foamOpacity} />
            )}

            {foamOpacity > 0.01 && renderCoreLayer()}

            {topFoamEnabled && topT > 0 && foamOpacity > 0.01 && (
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
                                                color={color} opacity={foamOpacity} label={`Top Foam L${i + 1}`} radius={topFoamRadius * SCALE} />
                                        );
                                    })}
                                </group>
                            );
                        } catch {
                            return <Box position={[0, topY, 0]} args={[W, topT, D]} color={CO.top} label="Top Foam" radius={topFoamRadius * SCALE} opacity={foamOpacity} />;
                        }
                    }
                    return <Box position={[0, topY, 0]} args={[W, topT, D]} color={CO.top} label="Top Foam" radius={topFoamRadius * SCALE} opacity={foamOpacity} />;
                })()
            )}

            {/* 상단 커버 */}
            {coverId && (
                <CoverBox
                    position={[0, topCoverBaseY, 0]}
                    args={[
                        W + 10 * SCALE,
                        isBasic ? (topCoverT > 0 ? topCoverT : 0.001) : (topT > 0 ? topT : 0.001),
                        D + 10 * SCALE
                    ]}
                    color={coverColor}
                    isTop={true}
                    topTextureUrl={topTexUrl}
                    sideTextureFrontUrl={frontTexUrl}
                    sideTextureSideUrl={sideTexUrl}
                />
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

/* ── 밝기(Exposure) 실시간 제어 ── */
function ExposureController({ exposure }: { exposure: number }) {
    const { gl } = useThree();
    useEffect(() => {
        gl.toneMappingExposure = exposure;
    }, [gl, exposure]);
    return null;
}

/* ── 카메라 좌표 추적기 ── */
function CameraTracker({ cameraRef }: { cameraRef: React.MutableRefObject<{ position: [number, number, number]; target: [number, number, number] }> }) {
    const { camera } = useThree();
    useEffect(() => {
        const update = () => {
            cameraRef.current = {
                position: [camera.position.x, camera.position.y, camera.position.z],
                target: [0, 0, 0], // OrbitControls default target
            };
        };
        update();
        const id = setInterval(update, 500);
        return () => clearInterval(id);
    }, [camera, cameraRef]);
    return null;
}


const Mattress3D = forwardRef<Mattress3DHandle, Mattress3DProps>(function Mattress3D(
    { className, forcedExploded, hideControls },
    ref
) {
    const [internalGap, setInternalGap] = useState(0.1);
    const [brightness, setBrightness] = useState(0.5);
    const explodeGap = forcedExploded ? 0.225 : internalGap;
    const glRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef({ position: [2.5, 1.8, 3.0] as [number, number, number], target: [0, 0, 0] as [number, number, number] });

    const handleSaveDefaults = () => {
        const pos = cameraRef.current.position.map(v => Number(v.toFixed(3)));
        const defaults = {
            camera: { position: pos, fov: 45 },
            explodeGap: Number(internalGap.toFixed(3)),
            brightness: Number(brightness.toFixed(2)),
        };
        console.log('\n%c📌 3D Preview 기본값 저장', 'color:#4f46e5;font-weight:bold;font-size:14px');
        console.log('%c아래 값을 복사해서 알려주세요:', 'color:#666');
        console.log(JSON.stringify(defaults, null, 2));
        alert(`📌 현재 설정이 콘솔에 출력되었습니다!\n\n카메라: [${pos}]\n부품간격: ${defaults.explodeGap}\n밝기: ${defaults.brightness}\n\nF12 > Console 탭에서 확인하세요.`);
    };



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
                    <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1 items-center">
                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">밝기 조절</span>
                        <input
                            type="range"
                            min="0.2"
                            max="2.0"
                            step="0.05"
                            value={brightness}
                            onChange={(e) => setBrightness(parseFloat(e.target.value))}
                            className="w-24 accent-amber-500"
                        />
                    </div>
                    <button
                        onClick={handleSaveDefaults}
                        className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                        📌 현재 설정 저장
                    </button>
                </div>
            )}
            {!hideControls && (
                <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
                    <span className="text-xs font-bold text-slate-400">3D PREVIEW</span>
                </div>
            )}

            {/* 3D Canvas 레이어 (샌드위치 중간) */}
            <div className="absolute inset-0 z-10 transition-transform duration-300" style={{ transform: `translateY(${explodeGap * 40}px) scale(${1 - explodeGap * 0.4})` }}>
                <Canvas shadows camera={{ position: [1.866, 1.022, 2.226], fov: 45 }} gl={{ preserveDrawingBuffer: true, alpha: true }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.5; }}>
                    <CanvasCapture onReady={(gl) => { glRef.current = gl; }} />
                    <ExposureController exposure={brightness} />
                    <CameraTracker cameraRef={cameraRef} />
                    <OrbitControls minPolarAngle={0} maxPolarAngle={Math.PI / 2} enableZoom={true} enablePan={true} />
                    <Environment preset="studio" />
                    <ambientLight intensity={0.3} />
                    {/* 3점 조명 시스템 */}
                    <spotLight position={[5, 8, 5]} angle={0.2} penumbra={1} intensity={0.8} castShadow shadow-mapSize={[2048, 2048]} />
                    <directionalLight position={[-3, 4, -2]} intensity={0.25} color="#e8e4ff" />
                    <pointLight position={[0, -2, 3]} intensity={0.15} color="#fff5e6" />
                    <Center>
                        <MattressModel explodeGap={explodeGap} />
                    </Center>
                    <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2} far={4} />
                </Canvas>
            </div>
        </div>
    );
});

export default Mattress3D;
