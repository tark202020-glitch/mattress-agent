'use client';

import { useEffect, useRef } from 'react';
import { useDesignStore } from './store';
import { PREDEFINED_EXTRACTION_DATA, type FaceCoords } from './defaultExtractData';

/**
 * perspectiveCrop: 원근 보정 크롭 유틸
 */
function perspectiveCrop(
    sourceImage: HTMLImageElement,
    corners: { topLeft: { x: number; y: number }; topRight: { x: number; y: number }; bottomRight: { x: number; y: number }; bottomLeft: { x: number; y: number } },
    imgW: number, imgH: number, outputW: number, outputH: number
): string {
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    const sx = [corners.topLeft.x / 100 * imgW, corners.topRight.x / 100 * imgW, corners.bottomRight.x / 100 * imgW, corners.bottomLeft.x / 100 * imgW];
    const sy = [corners.topLeft.y / 100 * imgH, corners.topRight.y / 100 * imgH, corners.bottomRight.y / 100 * imgH, corners.bottomLeft.y / 100 * imgH];
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imgW;
    srcCanvas.height = imgH;
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
                dstData.data[di] = srcData.data[si];
                dstData.data[di + 1] = srcData.data[si + 1];
                dstData.data[di + 2] = srcData.data[si + 2];
                dstData.data[di + 3] = srcData.data[si + 3];
            }
        }
    }
    ctx.putImageData(dstData, 0, 0);
    return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

async function autoCropCover(
    imageUrl: string,
    coords: FaceCoords
): Promise<{ top: string | null; front: string | null; side: string | null }> {
    const img = await loadImage(imageUrl);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const result: { top: string | null; front: string | null; side: string | null } = { top: null, front: null, side: null };

    if (coords.topSurface.visible) {
        result.top = perspectiveCrop(img, coords.topSurface.corners, W, H, 1024, 1024);
    }
    if (coords.frontPanel.visible) {
        result.front = perspectiveCrop(img, coords.frontPanel.corners, W, H, 1024, 400);
    }
    if (coords.sidePanel.visible) {
        result.side = perspectiveCrop(img, coords.sidePanel.corners, W, H, 1024, 400);
    }

    return result;
}

/**
 * useAutoInitTextures: 앱 시작 시 프리셋 커버들의 텍스처를 자동으로 크롭하여 default로 저장
 * - localStorage에 이미 저장된 default가 있으면 스킵
 * - 상단(upper) + 하단(lower) 각각 분리 크롭 지원
 */
export function useAutoInitTextures() {
    const setDefaultTextures = useDesignStore(s => s.setDefaultTextures);
    const initDone = useRef(false);

    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        const runInit = async () => {
            const currentDefaults = useDesignStore.getState().defaultTextures;
            const entries = Object.entries(PREDEFINED_EXTRACTION_DATA);
            let newCount = 0;

            for (const [coverId, data] of entries) {
                // 이미 저장된 default가 있으면 스킵
                if (currentDefaults[coverId]?.upper?.top) {
                    continue;
                }

                try {
                    console.log(`[AutoInit] 🔄 ${coverId} 텍스처 자동 크롭 중...`);

                    // 상단 커버 크롭
                    const upperTex = await autoCropCover(data.image, data.upperCoords);

                    // 하단 커버 크롭 (데이터가 있는 경우만)
                    let lowerTex: { top: string | null; front: string | null; side: string | null } = { top: null, front: null, side: null };
                    const lowerImg = data.lowerImage || data.image;
                    if (data.lowerCoords) {
                        lowerTex = await autoCropCover(lowerImg, data.lowerCoords);
                    }

                    setDefaultTextures(
                        coverId,
                        upperTex,
                        lowerTex,
                        data.upperCoords,
                        data.lowerCoords || null,
                        { upper: data.image, lower: data.lowerCoords ? lowerImg : null }
                    );
                    newCount++;
                    console.log(`[AutoInit] ✅ ${coverId} 텍스처 자동 초기화 완료`);
                } catch (err) {
                    console.warn(`[AutoInit] ⚠️ ${coverId} 자동 크롭 실패:`, err);
                }
            }

            if (newCount > 0) {
                console.log(`[AutoInit] 🎉 ${newCount}개 커버의 텍스처를 자동 초기화했습니다.`);
            }
        };

        setTimeout(runInit, 200);
    }, [setDefaultTextures]);
}
