'use client';

import { useDesignStore } from '../lib/store';
import { CORE_OPTIONS, COVER_OPTIONS, TOP_FOAM_OPTIONS, SIZE_PRESETS, calcCoreDimensions } from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';

/**
 * 매트리스 공식 도면 — Single / Dual 지원
 */
interface MattressDrawingProps {
    className?: string; // Add className prop
    onlyView?: 'TOP' | 'FRONT';
}

export default function MattressDrawing({ className, onlyView }: MattressDrawingProps) {
    const {
        title, setTitle, sizePresetId, customWidth, customDepth, coreId, isDual,
        topFoamEnabled, topFoamOptionId,
        guardFoamEnabled, guardFoamThickness,
        bottomFoamEnabled, bottomFoamThickness,
        coverId,
    } = useDesignStore();
    const customOpts = useCustomOptionsStore();

    if (!customWidth || !customDepth) {
        return (
            <div style={{ minHeight: 500, background: '#0a0e14', borderRadius: 12, border: '1px solid #1e2a38', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center" style={{ color: '#556677' }}>
                    <div className="text-5xl mb-4">📐</div>
                    <p className="text-sm">사이즈를 선택하면 실시간 도면이 표시됩니다</p>
                </div>
            </div>
        );
    }

    // ── 커스텀 옵션 병합 ──
    const allCores = [...CORE_OPTIONS, ...customOpts.cores];
    const allCovers = [...COVER_OPTIONS, ...customOpts.covers];
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...customOpts.topFoams];
    const allSizes = [...SIZE_PRESETS, ...customOpts.sizes];

    // ── 실측 치수 ──
    const W = customWidth;
    const D = customDepth;
    const coreOption = allCores.find(c => c.id === coreId);
    const coverOption = allCovers.find(c => c.id === coverId);
    const topFoamOpt = allTopFoams.find(o => o.id === topFoamOptionId);
    const sizePreset = allSizes.find(s => s.id === sizePresetId);

    const gfT = guardFoamThickness;
    const gfEnabled = guardFoamEnabled === true;
    const topT = topFoamEnabled && topFoamOpt ? topFoamOpt.thickness : 0;
    const botT = bottomFoamEnabled ? bottomFoamThickness : 0;
    const coreH = coreOption?.height || 200;
    const coverTopT = coverOption?.coverTopThickness || 30;
    const totalH = botT + coreH + topT;

    const dims = calcCoreDimensions(W, D, gfT, isDual, gfEnabled);

    // ── 스타일 (White Print Mode) ──
    const L = { THIN: 0.5, MED: 1, THICK: 1.5 };
    const CO = {
        dim: '#525252',        // 치수선: Neutral Dark Grey
        label: '#000000',      // 텍스트: Black
        muted: '#64748b',      // 보조 텍스트: Slate Grey
        accent: '#2563eb',     // Accent: Blue (전문적인 느낌)
        core: coreOption?.color || '#3b82f6',
        topFoam: '#16a34a',    // Top: Green
        guard: '#ea580c',      // Guard: Orange
        botFoam: '#0d9488',    // Bot: Teal
        cover: coverOption?.color || '#a1a1aa', // Cover: Neutral
        // Print Specific
        paper: '#ffffff',
        border: '#e2e8f0',
        tbArgs: '#0f172a',     // Title Block Lines
    };
    const FONT = "'Courier New', monospace";
    const DFONT = 10;

    // ── 레이아웃 ──
    const BD = 14;
    const GAP = 40;
    const DIM_SP = 50;
    const LBL_H = 30;
    const TB_H = 60;

    const tvMaxW = 300;
    const tvMaxH = 400;
    const tvScale = Math.min(tvMaxW / W, tvMaxH / D);
    const tvW = Math.round(W * tvScale);
    const tvD = Math.round(D * tvScale);
    const tvX = BD + 30;
    const tvY = BD + 20 + LBL_H;

    const fvScaleW = tvScale;
    const fvScaleH = Math.max(120 / totalH, 0.4);
    const fvW = Math.round(W * fvScaleW);
    const fvH = Math.round(totalH * fvScaleH);
    const fvX = tvX;
    const fvY = tvY + tvD + DIM_SP + GAP + LBL_H;

    const ptScale = tvScale * 0.35;
    const rightX = tvX + tvW + DIM_SP + GAP + 20;
    let ptCur = tvY;

    const ptCW = Math.round(dims.coreW * ptScale);
    const ptCH = Math.round(dims.coreD * ptScale);
    const ptCoreY = ptCur;
    ptCur += ptCH + 50;

    const ptFW = Math.round(W * ptScale);
    const ptFH = Math.round(D * ptScale);
    const ptFoamY = ptCur;
    ptCur += ptFH + 50;

    const ptGdW = Math.max(Math.round(gfT * ptScale), 5);
    const ptGdH = Math.round(dims.guardD_len * ptScale);
    const ptGdY = ptCur;
    if (dims.guardD_count > 0) ptCur += ptGdH + 50;

    const ptGwW = Math.round(dims.guardW_len * ptScale);
    // Front View로 변경하여 타공(Hole)을 시각화하기 위해 coreH 높이 사용
    const ptGwH = Math.round(coreH * ptScale);
    const ptGwY = ptCur;
    if (dims.guardW_count > 0) ptCur += ptGwH * 2 + 20 + 40;

    const contentBot = Math.max(fvY + fvH + DIM_SP + 20, ptCur + 20);
    const SVG_H = contentBot + TB_H + BD + 10;
    const SVG_W = Math.max(rightX + Math.max(ptCW, ptFW, ptGwW) + 280 + BD, 920);
    const tbY = SVG_H - BD - TB_H;

    // ── 치수선 헬퍼 ──
    const DimH = ({ x1, x2, y, label, ext }: { x1: number; x2: number; y: number; label: string; ext?: number }) => (
        <g>
            {(ext || 0) > 0 && (<>
                <line x1={x1} y1={y - ext!} x2={x1} y2={y + 4} stroke={CO.dim} strokeWidth={L.THIN} strokeDasharray="1,2" />
                <line x1={x2} y1={y - ext!} x2={x2} y2={y + 4} stroke={CO.dim} strokeWidth={L.THIN} strokeDasharray="1,2" />
            </>)}
            <line x1={x1 + 4} y1={y} x2={x2 - 4} y2={y} stroke={CO.dim} strokeWidth={L.THIN} />
            <polygon points={`${x1},${y} ${x1 + 5},${y - 1.8} ${x1 + 5},${y + 1.8}`} fill={CO.dim} />
            <polygon points={`${x2},${y} ${x2 - 5},${y - 1.8} ${x2 - 5},${y + 1.8}`} fill={CO.dim} />
            <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fill={CO.dim} fontSize={DFONT} fontFamily={FONT}>{label}</text>
        </g>
    );

    const DimV = ({ x, y1, y2, label, ext }: { x: number; y1: number; y2: number; label: string; ext?: number }) => (
        <g>
            {(ext || 0) > 0 && (<>
                <line x1={x - ext!} y1={y1} x2={x + 4} y2={y1} stroke={CO.dim} strokeWidth={L.THIN} strokeDasharray="1,2" />
                <line x1={x - ext!} y1={y2} x2={x + 4} y2={y2} stroke={CO.dim} strokeWidth={L.THIN} strokeDasharray="1,2" />
            </>)}
            <line x1={x} y1={y1 + 4} x2={x} y2={y2 - 4} stroke={CO.dim} strokeWidth={L.THIN} />
            <polygon points={`${x},${y1} ${x - 1.8},${y1 + 5} ${x + 1.8},${y1 + 5}`} fill={CO.dim} />
            <polygon points={`${x},${y2} ${x - 1.8},${y2 - 5} ${x + 1.8},${y2 - 5}`} fill={CO.dim} />
            <text x={x + 8} y={(y1 + y2) / 2 + 4} fill={CO.dim} fontSize={DFONT} fontFamily={FONT}>{label}</text>
        </g>
    );

    const gfDrawT = Math.round(gfT * tvScale);
    const coreDrawW = Math.round(dims.coreW * tvScale);
    const coreDrawD = Math.round(dims.coreD * tvScale);

    // Calculate Dynamic ViewBox
    let finalViewBox = `0 0 ${SVG_W} ${SVG_H}`;
    if (onlyView === 'TOP') {
        const h = tvY + tvD + DIM_SP + 40;
        finalViewBox = `0 0 ${SVG_W} ${h}`;
    } else if (onlyView === 'FRONT') {
        const h = fvH + TB_H + 100;
        const yStart = fvY - 40;
        finalViewBox = `0 ${yStart} ${SVG_W} ${h}`;
    }

    return (
        <div className={`shadow-sm transition-all ${className || ''}`} style={{ background: '#ffffff', borderRadius: 4, border: '1px solid #e2e8f0', padding: 0, overflow: 'hidden' }}>
            <svg viewBox={finalViewBox} width="100%" style={{ display: 'block' }}>
                <defs>
                    <pattern id="hatch-core" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <line x1="0" y1="0" x2="0" y2="8" stroke={CO.core} strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                    <pattern id="hatch-topfoam" width="6" height="6" patternUnits="userSpaceOnUse">
                        <circle cx="3" cy="3" r="1" fill={CO.topFoam} opacity="0.3" />
                    </pattern>
                    <pattern id="hatch-guard" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                        <line x1="0" y1="0" x2="0" y2="6" stroke={CO.guard} strokeWidth="0.5" opacity="0.35" />
                    </pattern>
                    <pattern id="hatch-bottom" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                        <line x1="0" y1="0" x2="0" y2="6" stroke={CO.botFoam} strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                </defs>

                {/* BORDER */}
                <rect x={BD} y={BD} width={SVG_W - BD * 2} height={SVG_H - BD * 2} fill="none" stroke="#334455" strokeWidth={L.THICK} />
                <rect x={BD + 2} y={BD + 2} width={SVG_W - BD * 2 - 4} height={SVG_H - BD * 2 - 4} fill="none" stroke="#1e2a38" strokeWidth={L.THIN} />


                {/* ═══ TOP VIEW ═══ */}
                {(!onlyView || onlyView === 'TOP') && (
                    <g>
                        <text x={tvX} y={tvY - 14} fill={CO.label} fontSize="13" fontWeight="700" letterSpacing="0.5">
                            TOP VIEW {isDual ? '(Dual)' : '(Single)'}
                        </text>
                        <line x1={tvX} y1={tvY - 10} x2={tvX + (isDual ? 110 : 80)} y2={tvY - 10} stroke={CO.accent} strokeWidth={L.MED} />

                        {/* Outer Boundary (Cover) */}
                        <rect x={tvX} y={tvY} width={tvW} height={tvD} rx={3}
                            fill="none" stroke={CO.cover} strokeWidth={L.THICK} opacity={0.6} />

                        {gfEnabled ? (
                            <>
                                {/* 1. Top Bar (Full Width) */}
                                <rect x={tvX} y={tvY} width={tvW} height={gfDrawT}
                                    fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.8} />

                                {/* 2. Bottom Bar (Full Width) */}
                                <rect x={tvX} y={tvY + tvD - gfDrawT} width={tvW} height={gfDrawT}
                                    fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.8} />

                                {/* 3. Left Bar (Between Top/Bottom) */}
                                <rect x={tvX} y={tvY + gfDrawT} width={gfDrawT} height={tvD - 2 * gfDrawT}
                                    fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.8} />

                                {/* 4. Right Bar (Between Top/Bottom) */}
                                <rect x={tvX + tvW - gfDrawT} y={tvY + gfDrawT} width={gfDrawT} height={tvD - 2 * gfDrawT}
                                    fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.8} />

                                {isDual ? (
                                    <>
                                        {/* Center Guard Bar */}
                                        <rect x={tvX + gfDrawT + coreDrawW} y={tvY + gfDrawT} width={gfDrawT} height={tvD - 2 * gfDrawT}
                                            fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.8} />

                                        {/* String L */}
                                        <rect x={tvX + gfDrawT} y={tvY + gfDrawT} width={coreDrawW} height={coreDrawD} rx={2}
                                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                                        <text x={tvX + gfDrawT + coreDrawW / 2} y={tvY + tvD / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="9" fontFamily={FONT} opacity={0.8}>스트링 L</text>

                                        {/* String R */}
                                        <rect x={tvX + gfDrawT + coreDrawW + gfDrawT} y={tvY + gfDrawT} width={coreDrawW} height={coreDrawD} rx={2}
                                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                                        <text x={tvX + gfDrawT + coreDrawW + gfDrawT + coreDrawW / 2} y={tvY + tvD / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="9" fontFamily={FONT} opacity={0.8}>스트링 R</text>
                                    </>
                                ) : (
                                    <>
                                        {/* Single Core */}
                                        <rect x={tvX + gfDrawT} y={tvY + gfDrawT} width={coreDrawW} height={coreDrawD} rx={2}
                                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                                        <text x={tvX + tvW / 2} y={tvY + tvD / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="11" fontFamily={FONT} opacity={0.8}>
                                            스트링 {coreOption?.label || ''}
                                        </text>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                {/* No Guard Foam */}
                                {isDual ? (
                                    <>
                                        {/* 중앙 구분 가드폼 (Dual 필수) */}
                                        <rect x={tvX + coreDrawW} y={tvY} width={gfDrawT} height={tvD}
                                            fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.8} />

                                        {/* String L */}
                                        <rect x={tvX} y={tvY} width={coreDrawW} height={coreDrawD} rx={2}
                                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                                        <text x={tvX + coreDrawW / 2} y={tvY + tvD / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="9" fontFamily={FONT} opacity={0.8}>
                                            스트링 L
                                        </text>

                                        {/* String R */}
                                        <rect x={tvX + coreDrawW + gfDrawT} y={tvY} width={coreDrawW} height={coreDrawD} rx={2}
                                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                                        <text x={tvX + coreDrawW + gfDrawT + coreDrawW / 2} y={tvY + tvD / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="9" fontFamily={FONT} opacity={0.8}>
                                            스트링 R
                                        </text>
                                    </>
                                ) : (
                                    <>
                                        <rect x={tvX} y={tvY} width={coreDrawW} height={coreDrawD} rx={2}
                                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                                        <text x={tvX + tvW / 2} y={tvY + tvD / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="11" fontFamily={FONT} opacity={0.8}>
                                            스트링 {coreOption?.label || ''}
                                        </text>
                                    </>
                                )}
                            </>
                        )}

                        <line x1={tvX - 8} y1={tvY + tvD / 2} x2={tvX + tvW + 8} y2={tvY + tvD / 2}
                            stroke={CO.muted} strokeWidth={L.THIN} strokeDasharray="8,3,2,3" />
                        <line x1={tvX + tvW / 2} y1={tvY - 8} x2={tvX + tvW / 2} y2={tvY + tvD + 8}
                            stroke={CO.muted} strokeWidth={L.THIN} strokeDasharray="8,3,2,3" />

                        <DimH x1={tvX} x2={tvX + tvW} y={tvY + tvD + 24} label={`W : ${W}`} ext={16} />
                        <DimV x={tvX + tvW + 24} y1={tvY} y2={tvY + tvD} label={`D : ${D}`} ext={16} />
                        {gfEnabled && gfDrawT > 6 && (
                            <DimH x1={tvX} x2={tvX + gfDrawT} y={tvY - 10} label={`${gfT}`} />
                        )}


                    </g>
                )}


                {/* ═══ FRONT VIEW ═══ */}
                {(!onlyView || onlyView === 'FRONT') && (
                    <g>
                        <text x={fvX} y={fvY - 14} fill={CO.label} fontSize="13" fontWeight="700" letterSpacing="0.5">FRONT VIEW</text>
                        <line x1={fvX} y1={fvY - 10} x2={fvX + 85} y2={fvY - 10} stroke={CO.accent} strokeWidth={L.MED} />

                        <rect x={fvX} y={fvY} width={fvW} height={fvH} rx={2}
                            fill="none" stroke={CO.cover} strokeWidth={L.THICK} opacity={0.6} />

                        {(() => {
                            const pad = 2;
                            const innerW = fvW - pad * 2;
                            const gfDrawW2 = Math.round(gfT * fvScaleW);
                            const topDrawH = Math.round(topT * fvScaleH);
                            const coreDrawH2 = Math.round(coreH * fvScaleH);
                            const botDrawH = Math.round(botT * fvScaleH);

                            let yp = fvY + pad;
                            const topY = yp; yp += topDrawH;
                            const coreYF = yp; yp += coreDrawH2;
                            const botYF = yp;

                            return (
                                <>
                                    {topFoamEnabled && topT > 0 && topDrawH > 0 && (
                                        (() => {
                                            if (topFoamOpt?.layers) {
                                                const layers = topFoamOpt.layers.split(':').map(Number); // [2, 5]
                                                let curY = topY;
                                                return (
                                                    <>
                                                        {layers.map((v, i) => {
                                                            const h = Math.round(v * 10 * fvScaleH);
                                                            // Layer 0 (Top): Lighter, Layer 1 (Bottom): Darker
                                                            const opacity = i % 2 === 0 ? 0.5 : 0.8;
                                                            const el = (
                                                                <rect key={`tf-${i}`} x={fvX + pad} y={curY} width={innerW} height={h}
                                                                    fill="url(#hatch-topfoam)" stroke={CO.topFoam} strokeWidth={L.MED} opacity={opacity} />
                                                            );
                                                            curY += h;
                                                            return el;
                                                        })}
                                                    </>
                                                );
                                            } else {
                                                return (
                                                    <rect x={fvX + pad} y={topY} width={innerW} height={topDrawH}
                                                        fill="url(#hatch-topfoam)" stroke={CO.topFoam} strokeWidth={L.MED} opacity={0.7} />
                                                );
                                            }
                                        })()
                                    )}
                                    {topFoamEnabled && topT > 0 && topDrawH > 12 && (
                                        <text x={fvX + fvW / 2} y={topY + topDrawH / 2 + 4}
                                            textAnchor="middle" fill={CO.topFoam} fontSize="9" fontFamily={FONT}>상단폼 {topT}mm</text>
                                    )}

                                    <rect
                                        x={fvX + pad + (gfEnabled ? gfDrawW2 : 0)} y={coreYF}
                                        width={innerW - (gfEnabled ? gfDrawW2 * 2 : 0)} height={coreDrawH2}
                                        fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7}
                                    />
                                    {coreDrawH2 > 12 && (
                                        <text x={fvX + fvW / 2} y={coreYF + coreDrawH2 / 2 + 4}
                                            textAnchor="middle" fill={CO.core} fontSize="9" fontFamily={FONT}>코어 {coreH}mm</text>
                                    )}
                                    {gfEnabled && gfDrawW2 > 0 && (
                                        <>
                                            <rect x={fvX + pad} y={coreYF} width={gfDrawW2} height={coreDrawH2}
                                                fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.7} />
                                            <rect x={fvX + pad + innerW - gfDrawW2} y={coreYF} width={gfDrawW2} height={coreDrawH2}
                                                fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.7} />
                                        </>
                                    )}

                                    {bottomFoamEnabled && botT > 0 && botDrawH > 0 && (
                                        <rect x={fvX + pad} y={botYF} width={innerW} height={botDrawH}
                                            fill="url(#hatch-bottom)" stroke={CO.botFoam} strokeWidth={L.MED} opacity={0.7} />
                                    )}
                                    {bottomFoamEnabled && botT > 0 && botDrawH > 12 && (
                                        <text x={fvX + fvW / 2} y={botYF + botDrawH / 2 + 4}
                                            textAnchor="middle" fill={CO.botFoam} fontSize="9" fontFamily={FONT}>하단폼 {botT}mm</text>
                                    )}

                                    {topFoamEnabled && topT > 0 && topDrawH > 6 && (
                                        <DimV x={fvX - 14} y1={topY} y2={topY + topDrawH} label={`${topT}`} />
                                    )}
                                    {coreDrawH2 > 6 && (
                                        <DimV x={fvX - 14} y1={coreYF} y2={coreYF + coreDrawH2} label={`${coreH}`} />
                                    )}
                                    {bottomFoamEnabled && botT > 0 && botDrawH > 6 && (
                                        <DimV x={fvX - 14} y1={botYF} y2={botYF + botDrawH} label={`${botT}`} />
                                    )}
                                </>
                            );
                        })()}

                        <DimV x={fvX + fvW + 24} y1={fvY} y2={fvY + fvH} label={`H : ${totalH}`} ext={16} />
                        {(() => {
                            const p: string[] = [];
                            if (topT > 0) p.push(String(topT));
                            p.push(String(coreH));
                            if (botT > 0) p.push(String(botT));
                            return p.length > 1 ? (
                                <text x={fvX + fvW + 34} y={(fvY + fvY + fvH) / 2 + 18}
                                    fill={CO.muted} fontSize="9" fontFamily={FONT}>({p.join('+')})</text>
                            ) : null;
                        })()}
                        <text x={fvX} y={fvY + fvH + 16} fill={CO.muted} fontSize="8" fontFamily={FONT} fontStyle="italic">
                            ※ 커버 상단 두께 약 {coverTopT}mm 예측
                        </text>


                    </g>
                )}


                {/* ═══ PARTS DETAIL & TITLE BLOCK (Only show if full view) ═══ */}
                {!onlyView && (
                    <g>
                        <text x={rightX} y={tvY - 14} fill={CO.label} fontSize="13" fontWeight="700" letterSpacing="0.5">PARTS DETAIL</text>
                        <line x1={rightX} y1={tvY - 10} x2={rightX + 100} y2={tvY - 10} stroke={CO.accent} strokeWidth={L.MED} />

                        <rect x={rightX} y={ptCoreY} width={ptCW} height={ptCH} rx={2}
                            fill="url(#hatch-core)" stroke={CO.core} strokeWidth={L.MED} opacity={0.7} />
                        <line x1={rightX + ptCW / 2} y1={ptCoreY} x2={rightX + ptCW / 2} y2={ptCoreY + ptCH}
                            stroke={CO.muted} strokeWidth={L.THIN} strokeDasharray="4,2,1,2" />
                        <text x={rightX + ptCW + 14} y={ptCoreY + 14} fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>
                            코어 {dims.coreW} × {dims.coreD} × {coreH}
                        </text>
                        <text x={rightX + ptCW + 14} y={ptCoreY + 28} fill={CO.muted} fontSize="9" fontFamily={FONT}>
                            {isDual
                                ? (gfEnabled ? `= (${W}-3×${gfT})/2 × (${D}-2×${gfT})` : `= (${W}-${gfT})/2 × ${D}`)
                                : (gfEnabled ? `= (${W}-2×${gfT}) × (${D}-2×${gfT})` : `= ${W} × ${D}`)}
                        </text>
                        {isDual && (
                            <text x={rightX + ptCW + 14} y={ptCoreY + 42} fill={CO.accent} fontSize="9" fontFamily={FONT} fontWeight="600">
                                × 2ea (L/R)
                            </text>
                        )}

                        <rect x={rightX} y={ptFoamY} width={ptFW} height={ptFH} rx={2}
                            fill="url(#hatch-topfoam)" stroke={CO.topFoam} strokeWidth={L.MED} opacity={0.6} />
                        <text x={rightX + ptFW + 14} y={ptFoamY + 14} fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>
                            {topFoamEnabled && topT > 0
                                ? `상단폼 ${W} × ${D} × ${topT}${topFoamOpt?.layers ? ` (${topFoamOpt.layers.split(':').map(v => Number(v) * 10).join('+')})` : ''}`
                                : '상단폼 미적용'}
                        </text>
                        <text x={rightX + ptFW + 14} y={ptFoamY + 30} fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>
                            {bottomFoamEnabled && botT > 0 ? `하단폼 ${W} × ${D} × ${botT}` : '하단폼 미적용'}
                        </text>

                        {dims.guardD_count > 0 && (
                            <>
                                {Array.from({ length: Math.min(dims.guardD_count, 3) }).map((_, i) => (
                                    <rect key={`gd${i}`} x={rightX + (ptGdW + 5) * i} y={ptGdY} width={ptGdW} height={ptGdH} rx={1}
                                        fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.7} />
                                ))}
                                <text x={rightX + (ptGdW + 5) * dims.guardD_count + 10} y={ptGdY + 14}
                                    fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>
                                    가드폼D {gfT} × {dims.guardD_len} × {coreH}
                                </text>
                                <text x={rightX + (ptGdW + 5) * dims.guardD_count + 10} y={ptGdY + 28}
                                    fill={CO.muted} fontSize="9" fontFamily={FONT}>
                                    × {dims.guardD_count}ea{isDual && !gfEnabled ? ' (중앙 구분)' : isDual && gfEnabled ? ' (좌+중앙+우)' : ''}
                                </text>
                            </>
                        )}

                        {dims.guardW_count > 0 && (
                            <>
                                {Array.from({ length: dims.guardW_count }).map((_, i) => {
                                    // 타공 위치 계산
                                    // 가드폼 W는 Width 방향 길이이므로 W 관련 변수 사용
                                    // Single: 중앙 1개
                                    // Dual: 좌/우 코어의 중앙에 각각 1개 (총 2개)
                                    const sX = ptGwW / dims.guardW_len;
                                    const hR = 60 * sX; // Ø120 -> r=60
                                    const holeCy = ptGwY + (ptGwH + 5) * i + ptGwH / 2;

                                    // 첫 번째 가드폼(Head)에만 타공 적용
                                    const showHole = i === 0;

                                    let holes: number[] = [];
                                    if (showHole) {
                                        if (isDual) {
                                            // Dual: 2 holes
                                            // Logic: 좌측 가드(gfT) + 좌측 코어 절반(coreW/2)
                                            // Right: 좌측 가드 + 좌측 코어 + 중앙 가드 + 우측 코어 절반
                                            const coreW = (W - 3 * gfT) / 2;
                                            holes.push((gfT + coreW / 2) * sX);
                                            holes.push((gfT + coreW + gfT + coreW / 2) * sX);
                                        } else {
                                            // Single: 1 hole (Center)
                                            holes.push((W / 2) * sX);
                                        }
                                    }

                                    return (
                                        <g key={`gw${i}`}>
                                            <rect x={rightX} y={ptGwY + (ptGwH + 5) * i}
                                                width={ptGwW} height={ptGwH} rx={1}
                                                fill="url(#hatch-guard)" stroke={CO.guard} strokeWidth={L.MED} opacity={0.7} />

                                            {holes.map((hx, idx) => (
                                                <g key={`h${idx}`}>
                                                    <circle cx={rightX + hx} cy={holeCy} r={hR}
                                                        fill="none" stroke={CO.label} strokeWidth={L.MED}
                                                        strokeDasharray="2,1" />
                                                    {/* Center Mark (+ shape) */}
                                                    <line x1={rightX + hx - hR / 2} y1={holeCy} x2={rightX + hx + hR / 2} y2={holeCy} stroke={CO.label} strokeWidth={0.5} opacity={0.8} />
                                                    <line x1={rightX + hx} y1={holeCy - hR / 2} x2={rightX + hx} y2={holeCy + hR / 2} stroke={CO.label} strokeWidth={0.5} opacity={0.8} />
                                                </g>
                                            ))}

                                            {/* 치수선 추가 (Dimension Lines) */}
                                            {showHole && (() => {
                                                const dimY = ptGwY + (ptGwH + 5) * i + ptGwH + 12;
                                                if (isDual) {
                                                    const coreW = (W - 3 * gfT) / 2;
                                                    const dist = Math.round(gfT + coreW / 2);
                                                    // Left & Right Distances
                                                    return (
                                                        <>
                                                            <DimH x1={rightX} x2={rightX + holes[0]} y={dimY} label={`${dist}`} />
                                                            <DimH x1={rightX + holes[1]} x2={rightX + ptGwW} y={dimY} label={`${dist}`} />
                                                        </>
                                                    );
                                                } else {
                                                    // Center Distance
                                                    const dist = Math.round(W / 2);
                                                    return (
                                                        <>
                                                            <DimH x1={rightX} x2={rightX + holes[0]} y={dimY} label={`${dist}`} />
                                                            <DimH x1={rightX + holes[0]} x2={rightX + ptGwW} y={dimY} label={`${dist}`} />
                                                        </>
                                                    );
                                                }
                                            })()}
                                        </g>
                                    );
                                })}
                                <text x={rightX + ptGwW + 14} y={ptGwY + 14}
                                    fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>
                                    가드폼W {gfT} × {dims.guardW_len} × {coreH} (Front View)
                                </text>
                                <text x={rightX + ptGwW + 14} y={ptGwY + 28}
                                    fill={CO.muted} fontSize="8" fontFamily={FONT} fontStyle="italic">
                                    × {dims.guardW_count}ea (Head 1ea Ø120 타공)
                                </text>
                            </>
                        )}


                        {/* ═══ TITLE BLOCK (Professional Style) ═══ */}
                        <rect x={BD} y={tbY} width={SVG_W - BD * 2} height={TB_H}
                            fill="none" stroke={CO.tbArgs} strokeWidth={2} />

                        {/* 구분선 */}
                        <line x1={BD + 220} y1={tbY} x2={BD + 220} y2={tbY + TB_H} stroke={CO.tbArgs} strokeWidth={1} />
                        <line x1={BD + 500} y1={tbY} x2={BD + 500} y2={tbY + TB_H} stroke={CO.tbArgs} strokeWidth={1} />
                        <line x1={BD + 680} y1={tbY} x2={BD + 680} y2={tbY + TB_H} stroke={CO.tbArgs} strokeWidth={1} />
                        <line x1={BD} y1={tbY + TB_H / 2} x2={SVG_W - BD} y2={tbY + TB_H / 2} stroke={CO.tbArgs} strokeWidth={1} />

                        {/* TITLE — 편집 가능 foreignObject */}
                        <text x={BD + 10} y={tbY + 15} fill={CO.muted} fontSize="7" fontFamily={FONT} fontWeight="600">TITLE</text>
                        <foreignObject x={BD + 4} y={tbY + 18} width={210} height={24}>
                            <input
                                value={title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                                placeholder="도면 제목 입력..."
                                style={{
                                    width: '100%', height: '100%',
                                    background: 'transparent', border: 'none', outline: 'none',
                                    color: '#000000', fontSize: 11, fontWeight: 700,
                                    fontFamily: "'Inter', sans-serif",
                                    padding: '0 4px',
                                }}
                            />
                        </foreignObject>
                        <text x={BD + 10} y={tbY + 54} fill={CO.label} fontSize="8" fontFamily={FONT}>
                            {sizePreset?.label || 'Custom'} / {isDual ? 'Dual' : 'Single'} / {coreOption?.label || '-'}
                        </text>

                        <text x={BD + 230} y={tbY + 18} fill={CO.muted} fontSize="7" fontFamily={FONT} fontWeight="600">SIZE (mm)</text>
                        <text x={BD + 230} y={tbY + 36} fill={CO.label} fontSize="11" fontWeight="700" fontFamily={FONT}>
                            W {W} × D {D} × H {totalH}
                        </text>
                        <text x={BD + 230} y={tbY + 54} fill={CO.muted} fontSize="8" fontFamily={FONT}>
                            (Cover Top +{coverTopT}mm)
                        </text>

                        <text x={BD + 510} y={tbY + 18} fill={CO.muted} fontSize="7" fontFamily={FONT} fontWeight="600">SCALE</text>
                        <text x={BD + 510} y={tbY + 36} fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>NTS (Not to Scale)</text>
                        <text x={BD + 510} y={tbY + 54} fill={CO.muted} fontSize="8" fontFamily={FONT}>UNIT: mm</text>

                        <text x={BD + 690} y={tbY + 18} fill={CO.muted} fontSize="7" fontFamily={FONT} fontWeight="600">DWG NO.</text>
                        <text x={BD + 690} y={tbY + 36} fill={CO.label} fontSize="10" fontWeight="600" fontFamily={FONT}>
                            MDA-{sizePresetId || '000'}-{isDual ? 'D' : 'S'}01-REV.A
                        </text>
                        <text x={BD + 690} y={tbY + 54} fill={CO.muted} fontSize="8" fontFamily={FONT}>{new Date().toLocaleDateString()}</text>
                    </g>
                )}
            </svg>
        </div>
    );
}
