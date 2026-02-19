'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDesignStore } from '../lib/store';
import {
    SIZE_PRESETS, CORE_OPTIONS, COVER_OPTIONS, TOP_FOAM_OPTIONS,
    CONTROLLER_OPTIONS, PACKAGING_OPTIONS, DELIVERY_OPTIONS,
    calcCoreDimensions,
} from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';
import MattressDrawing from './MattressDrawing';
import Mattress3D, { Mattress3DHandle } from './Mattress3D';

/* ── 인쇄용 A4 페이지 스타일 ── */
const PAGE_STYLE: React.CSSProperties = {
    width: '210mm',
    minHeight: '297mm',
    padding: '20mm 18mm',
    boxSizing: 'border-box',
    background: '#ffffff',
    position: 'relative',
};

const SECTION_TITLE: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 800,
    borderLeft: '4px solid #4f46e5',
    paddingLeft: 12,
    marginBottom: 16,
    color: '#1e293b',
    letterSpacing: '0.3px',
};

interface DevelopmentRequestModalProps {
    onClose: () => void;
}

export default function DevelopmentRequestModal({ onClose }: DevelopmentRequestModalProps) {
    const state = useDesignStore();
    const custom = useCustomOptionsStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const allSizes = [...SIZE_PRESETS, ...custom.sizes];
    const allCores = [...CORE_OPTIONS, ...custom.cores];
    const allCovers = [...COVER_OPTIONS, ...custom.covers];
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...custom.topFoams];
    const allControllers = [...CONTROLLER_OPTIONS, ...custom.controllers];
    const allPackagings = [...PACKAGING_OPTIONS, ...custom.packagings];
    const allDeliveries = [...DELIVERY_OPTIONS, ...custom.deliveries];

    const sizePreset = allSizes.find((s) => s.id === state.sizePresetId);
    const core = allCores.find((c) => c.id === state.coreId);
    const cover = allCovers.find((c) => c.id === state.coverId);
    const topFoam = allTopFoams.find((o) => o.id === state.topFoamOptionId);
    const ctrl = allControllers.find((c) => c.id === state.controllerId);
    const pkg = allPackagings.find((p) => p.id === state.packagingId);
    const dlv = allDeliveries.find((d) => d.id === state.deliveryId);

    const gfEnabled = state.guardFoamEnabled === true;
    const dims = state.customWidth > 0
        ? calcCoreDimensions(state.customWidth, state.customDepth, state.guardFoamThickness, state.isDual, gfEnabled)
        : null;

    // 3D 캡처
    const normalRef = useRef<Mattress3DHandle>(null);
    const explodedRef = useRef<Mattress3DHandle>(null);
    const [normalImg, setNormalImg] = useState<string>('');
    const [explodedImg, setExplodedImg] = useState<string>('');
    const [capturing, setCapturing] = useState(true);

    const captureImages = useCallback(async () => {
        await new Promise(r => setTimeout(r, 2000));
        if (normalRef.current) {
            const img = await normalRef.current.capture();
            setNormalImg(img);
        }
        if (explodedRef.current) {
            const img = await explodedRef.current.capture();
            setExplodedImg(img);
        }
        setCapturing(false);
    }, []);

    useEffect(() => { captureImages(); }, [captureImages]);

    /* ── 디자인 컨셉: 커버 이미지 & 키워드 분석 ── */
    // 우선순위: 1) AI 생성 이미지 (customCoverImages) → 2) COVER_OPTIONS 기본 이미지
    const coverImageUrl = (state.coverId && state.customCoverImages[state.coverId])
        ? state.customCoverImages[state.coverId]
        : cover?.image || '';
    const [designKeywords, setDesignKeywords] = useState<string>('');
    const [keywordsLoading, setKeywordsLoading] = useState(false);
    const [keywordsError, setKeywordsError] = useState<string | null>(null);

    useEffect(() => {
        if (!coverImageUrl) return;
        setKeywordsLoading(true);
        setKeywordsError(null);

        const analyzeImage = async () => {
            try {
                let bodyPayload: Record<string, string> = {};

                if (coverImageUrl.startsWith('data:')) {
                    // data URL (AI 생성 이미지)
                    bodyPayload = { imageBase64: coverImageUrl };
                } else {
                    // 정적 이미지 경로 → 브라우저에서 base64로 변환
                    const res = await fetch(coverImageUrl);
                    if (!res.ok) throw new Error('이미지 로드 실패');
                    const blob = await res.blob();
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                    bodyPayload = { imageBase64: base64 };
                }

                const res = await fetch('/api/analyze-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload),
                });
                const data = await res.json();

                if (!res.ok) {
                    setKeywordsError(data.error || '분석 실패');
                } else {
                    setDesignKeywords(data.keywords || '');
                }
            } catch (err: any) {
                setKeywordsError(err.message || '네트워크 오류');
            } finally {
                setKeywordsLoading(false);
            }
        };

        analyzeImage();
    }, [coverImageUrl]);

    /* ── 특이사항 (사용자 입력) ── */
    const [specialNotes, setSpecialNotes] = useState('');
    const [notesSaved, setNotesSaved] = useState(false);

    const handleSaveNotes = () => {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2500);
    };

    /* ── 스펙 데이터 ── */
    const totalH = (state.bottomFoamEnabled ? state.bottomFoamThickness : 0)
        + (core?.height || 0)
        + (state.topFoamEnabled && topFoam ? topFoam.thickness : 0);

    const specRows = [
        {
            category: '사이즈',
            items: [
                { label: '사이즈 규격', value: sizePreset?.label || 'Custom', detail: `W ${state.customWidth} × D ${state.customDepth} mm` },
                { label: '전체 높이 (H)', value: `${totalH} mm`, detail: core ? `코어 ${core.height}mm 기준` : '' },
                { label: '구조', value: state.isDual ? 'Dual Core (좌우 분리형)' : 'Single Core (일체형)', detail: '' },
            ]
        },
        {
            category: '내장재',
            items: [
                { label: '상단폼 (Top Foam)', value: state.topFoamEnabled && topFoam ? topFoam.label : '미적용', detail: state.topFoamEnabled && topFoam ? `${topFoam.thickness}mm — ${topFoam.description || ''}` : '' },
                { label: '가드폼 (Guard Foam)', value: gfEnabled ? `${state.guardFoamThickness}mm` : '미적용', detail: gfEnabled ? `경도: ${state.guardFoamHardness || '-'}` : '' },
                { label: '코어 (Core / Spring)', value: core?.label || '-', detail: core?.description || '' },
                { label: '하단폼 (Bottom Foam)', value: state.bottomFoamEnabled ? `${state.bottomFoamThickness}mm` : '미적용', detail: state.bottomFoamEnabled ? `경도: ${state.bottomFoamHardness || '-'}` : '' },
            ]
        },
        {
            category: '외장재',
            items: [
                { label: '커버 (Cover)', value: cover?.label || '-', detail: cover?.description || '' },
            ]
        },
        {
            category: '부속/배송',
            items: [
                { label: '컨트롤러', value: ctrl?.label || '-', detail: '' },
                { label: '포장', value: pkg?.label || '-', detail: '' },
                { label: '배송', value: dlv?.label || '-', detail: '' },
            ]
        },
    ];

    /* ── 부품 치수 ── */
    const partRows = dims ? [
        { label: '코어 (Core)', value: `${dims.coreW} × ${dims.coreD} × ${core?.height || '-'} mm`, qty: state.isDual ? '2ea (L/R)' : '1ea' },
        ...(dims.guardD_count > 0 ? [{
            label: '가드폼D (세로)',
            value: `${state.guardFoamThickness} × ${dims.guardD_len} × ${core?.height || '-'} mm`,
            qty: `${dims.guardD_count}ea`
        }] : []),
        ...(dims.guardW_count > 0 ? [{
            label: '가드폼W (가로)',
            value: `${state.guardFoamThickness} × ${dims.guardW_len} × ${core?.height || '-'} mm`,
            qty: `${dims.guardW_count}ea (Head Ø120 타공)`
        }] : []),
        ...(state.topFoamEnabled && topFoam ? [{
            label: '상단폼',
            value: `${state.customWidth} × ${state.customDepth} × ${topFoam.thickness} mm`,
            qty: '1ea'
        }] : []),
        ...(state.bottomFoamEnabled ? [{
            label: '하단폼',
            value: `${state.customWidth} × ${state.customDepth} × ${state.bottomFoamThickness} mm`,
            qty: '1ea'
        }] : []),
    ] : [];

    const handlePrint = () => { window.print(); };

    /* ── Cell Style 헬퍼 ── */
    const cellBase: React.CSSProperties = {
        border: '1px solid #cbd5e1',
        padding: '8px 14px',
        fontSize: 12,
        lineHeight: '1.5',
        verticalAlign: 'middle',
    };

    /* ── 모달 콘텐츠 ── */
    const modalContent = (
        <div id="dev-request-root"
            style={{
                position: 'fixed', inset: 0, zIndex: 99999,
                background: 'rgba(0,0,0,0.5)',
                overflowY: 'auto',
                display: 'flex', justifyContent: 'center',
            }}>
            <div style={{ paddingTop: 20, paddingBottom: 40 }}>

                {/* ══════════════════════════════════════ */}
                {/*  PAGE 1 — 디자인 컨셉 + 상세 스펙      */}
                {/* ══════════════════════════════════════ */}
                <div style={PAGE_STYLE} className="dev-request-page shadow-2xl">

                    <div className="no-print" style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, zIndex: 10 }}>
                        <button onClick={onClose}
                            style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            닫기
                        </button>
                        <button onClick={handlePrint}
                            style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            인쇄 / PDF 저장
                        </button>

                    </div>

                    {/* ── Header ── */}
                    <header style={{ borderBottom: '3px solid #1e293b', paddingBottom: 14, marginBottom: 24 }}>
                        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px', margin: 0 }}>
                            매트리스 개발 요청서
                        </h1>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: '#64748b' }}>
                            <span>Project: <strong style={{ color: '#0f172a' }}>{sizePreset?.label || 'Custom'} — {state.isDual ? 'Dual' : 'Single'}</strong></span>
                            <span>Date: <strong style={{ color: '#0f172a' }}>{new Date().toLocaleDateString()}</strong></span>
                        </div>
                    </header>

                    {/* ── 1. 디자인 컨셉 ── */}
                    <section style={{ marginBottom: 24 }}>
                        <h2 style={SECTION_TITLE}>1. 디자인 컨셉 (Design Concept)</h2>

                        <div style={{ padding: '0 8px' }}>
                            {/* 커버 이미지 — 전체 너비 크게 */}
                            <div style={{
                                width: '100%', maxHeight: 360,
                                border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden',
                                background: '#f8fafc',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {coverImageUrl ? (
                                    <img
                                        src={coverImageUrl}
                                        alt="커버 디자인"
                                        style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 40 }}>
                                        커버 이미지 없음
                                    </div>
                                )}
                            </div>

                            {/* Design Keywords — 이미지 하단 */}
                            <div style={{
                                marginTop: 12,
                                padding: '12px 18px',
                                background: 'linear-gradient(135deg, #f8fafc, #f0f4ff)',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                                        Design Keywords
                                    </div>
                                    <div style={{ width: 1, height: 16, background: '#cbd5e1' }} />
                                    <div style={{ flex: 1 }}>
                                        {keywordsLoading ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 12 }}>
                                                <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                디자인 키워드 분석 중...
                                            </div>
                                        ) : keywordsError ? (
                                            <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                                                {cover?.label || '커버'} — {cover?.description || ''}
                                            </div>
                                        ) : designKeywords ? (
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: '1.6' }}>
                                                {designKeywords}
                                            </div>
                                        ) : (
                                            <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                                                {cover?.label || '커버'} — {cover?.description || ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                                    커버: <strong style={{ color: '#475569' }}>{cover?.label || '-'}</strong>
                                    {cover?.grade && <> · 등급: <strong style={{ color: '#475569' }}>{cover.grade}</strong></>}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 2. 상세 스펙 ── */}
                    <section style={{ marginBottom: 24 }}>
                        <h2 style={SECTION_TITLE}>2. 상세 스펙 (Specifications)</h2>

                        <div style={{ padding: '0 8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #94a3b8' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <th style={{ ...cellBase, width: '14%', fontWeight: 700, textAlign: 'center', color: '#475569', borderBottom: '2px solid #94a3b8' }}>구분</th>
                                        <th style={{ ...cellBase, width: '22%', fontWeight: 700, textAlign: 'left', color: '#475569', borderBottom: '2px solid #94a3b8' }}>항목</th>
                                        <th style={{ ...cellBase, width: '30%', fontWeight: 700, textAlign: 'left', color: '#475569', borderBottom: '2px solid #94a3b8' }}>선택 옵션</th>
                                        <th style={{ ...cellBase, fontWeight: 700, textAlign: 'left', color: '#475569', borderBottom: '2px solid #94a3b8' }}>세부 사항</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {specRows.map((group, gIdx) => (
                                        group.items.map((item, iIdx) => (
                                            <tr key={`${gIdx}-${iIdx}`} style={{ background: gIdx % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                                                {iIdx === 0 && (
                                                    <td rowSpan={group.items.length}
                                                        style={{
                                                            ...cellBase,
                                                            fontWeight: 700,
                                                            fontSize: 11,
                                                            textAlign: 'center',
                                                            color: '#4f46e5',
                                                            background: gIdx % 2 === 0 ? '#f8faff' : '#f0f4ff',
                                                            verticalAlign: 'middle',
                                                            letterSpacing: '1px',
                                                        }}>
                                                        {group.category}
                                                    </td>
                                                )}
                                                <td style={{ ...cellBase, fontWeight: 600, color: '#334155', paddingLeft: 16 }}>{item.label}</td>
                                                <td style={{ ...cellBase, fontWeight: 700, color: '#0f172a', paddingLeft: 16 }}>{item.value}</td>
                                                <td style={{ ...cellBase, color: '#64748b', paddingLeft: 16, fontSize: 11 }}>{item.detail}</td>
                                            </tr>
                                        ))
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 부품별 상세 치수 */}
                        {partRows.length > 0 && (
                            <div style={{ marginTop: 16, padding: '0 8px' }}>
                                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, paddingLeft: 4 }}>
                                    ▸ 부품별 상세 치수 (Parts Dimensions)
                                </h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ ...cellBase, width: '25%', fontWeight: 600, fontSize: 11, color: '#475569', textAlign: 'left', paddingLeft: 16, borderBottom: '1px solid #cbd5e1' }}>부품명</th>
                                            <th style={{ ...cellBase, width: '45%', fontWeight: 600, fontSize: 11, color: '#475569', textAlign: 'left', paddingLeft: 16, borderBottom: '1px solid #cbd5e1' }}>치수 (W×D×H)</th>
                                            <th style={{ ...cellBase, fontWeight: 600, fontSize: 11, color: '#475569', textAlign: 'left', paddingLeft: 16, borderBottom: '1px solid #cbd5e1' }}>수량 / 비고</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {partRows.map((row, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                                <td style={{ ...cellBase, fontWeight: 600, color: '#475569', paddingLeft: 16 }}>{row.label}</td>
                                                <td style={{ ...cellBase, fontFamily: "'Courier New', monospace", color: '#0f172a', paddingLeft: 16 }}>{row.value}</td>
                                                <td style={{ ...cellBase, color: '#64748b', paddingLeft: 16, fontSize: 11 }}>{row.qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Page 1 Footer */}
                    <div style={{ position: 'absolute', bottom: '12mm', left: '18mm', right: '18mm', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
                        <span>매트리스 개발 요청서</span>
                        <span>1 / 2</span>
                    </div>
                </div>


                {/* ══════════════════════════════════════ */}
                {/*  PAGE 2 — 3D 프리뷰 + 기술도면 + 특이사항 */}
                {/* ══════════════════════════════════════ */}
                <div style={{ ...PAGE_STYLE, marginTop: 0 }} className="dev-request-page shadow-2xl print-page-break">

                    {/* ── 3. 3D 프리뷰 ── */}
                    <section style={{ marginBottom: 24 }}>
                        <h2 style={SECTION_TITLE}>3. 3D 프리뷰 (3D Preview)</h2>

                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* Normal View */}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, paddingLeft: 2 }}>
                                    ▸ 일반 뷰
                                </h3>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 4, background: '#f8fafc', minHeight: 180 }}>
                                    {capturing ? (
                                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
                                                <p style={{ fontSize: 11 }}>캡처 중...</p>
                                            </div>
                                        </div>
                                    ) : normalImg ? (
                                        <img src={normalImg} alt="3D Normal View" style={{ width: '100%', borderRadius: 4, display: 'block' }} />
                                    ) : (
                                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
                                            캡처 실패
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Exploded View */}
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, paddingLeft: 2 }}>
                                    ▸ 분해 뷰
                                </h3>
                                <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 4, background: '#f8fafc', minHeight: 180 }}>
                                    {capturing ? (
                                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                <div style={{ fontSize: 24, marginBottom: 6 }}>⏳</div>
                                                <p style={{ fontSize: 11 }}>캡처 중...</p>
                                            </div>
                                        </div>
                                    ) : explodedImg ? (
                                        <img src={explodedImg} alt="3D Exploded View" style={{ width: '100%', borderRadius: 4, display: 'block' }} />
                                    ) : (
                                        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
                                            캡처 실패
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── 4. 기술 도면 (2D) ── */}
                    <section style={{ marginBottom: 24 }}>
                        <h2 style={SECTION_TITLE}>4. 기술 도면 (2D Technical Drawing)</h2>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 6 }}>
                            <MattressDrawing className="w-full" />
                        </div>
                    </section>

                    {/* ── 5. 특이사항 (사용자 입력) ── */}
                    <section style={{ padding: '0 8px' }}>
                        <h2 style={SECTION_TITLE}>5. 특이사항 (Special Notes)</h2>
                        <div style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: 6,
                            padding: '14px 18px',
                            background: '#fafbfc',
                        }}>
                            {/* 인쇄 시에는 텍스트만 표시 */}
                            <div className="print-only" style={{ display: 'none' }}>
                                <p style={{ fontSize: 12, color: '#1e293b', lineHeight: '1.8', margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {specialNotes || '(특이사항 없음)'}
                                </p>
                            </div>

                            {/* 화면에서는 입력 가능 */}
                            <div className="no-print">
                                <textarea
                                    value={specialNotes}
                                    onChange={(e) => { setSpecialNotes(e.target.value); setNotesSaved(false); }}
                                    placeholder="특이사항을 입력하세요. (예: 특수 원단 요청, 추가 요구사항 등)"
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        lineHeight: '1.8',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                        color: '#1e293b',
                                        background: '#fff',
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 8 }}>
                                    {notesSaved && (
                                        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                                            ✅ 저장 완료
                                        </span>
                                    )}
                                    <button
                                        onClick={handleSaveNotes}
                                        style={{
                                            padding: '7px 20px',
                                            background: specialNotes.trim() ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#e2e8f0',
                                            color: specialNotes.trim() ? '#fff' : '#94a3b8',
                                            border: 'none',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: specialNotes.trim() ? 'pointer' : 'default',
                                            transition: 'all 0.15s',
                                        }}
                                        disabled={!specialNotes.trim()}
                                    >
                                        💾 저장
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Page 2 Footer */}
                    <div style={{ position: 'absolute', bottom: '12mm', left: '18mm', right: '18mm', borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#94a3b8' }}>
                        <span>Generated by Antigravity Mattress Agent — {new Date().toLocaleString()}</span>
                        <span>2 / 2</span>
                    </div>
                </div>

                {/* ── 하단 액션 버튼 (브로셔 만들기) ── */}


                {/* ── 3D 캡처용 숨겨진 Canvas ── */}
                <div className="no-print" style={{ position: 'fixed', left: -9999, top: -9999, width: 800, height: 600 }}>
                    <Mattress3D ref={normalRef} forcedExploded={false} hideControls className="w-full h-full" />
                </div>
                <div className="no-print" style={{ position: 'fixed', left: -9999, top: -9999, width: 800, height: 600 }}>
                    <Mattress3D ref={explodedRef} forcedExploded={true} hideControls className="w-full h-full" />
                </div>

                {/* 스피너 애니메이션 */}
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    @media print {
                        .print-only { display: block !important; }
                    }
                `}</style>

            </div>
        </div>
    );

    /* ── Portal: body 바로 아래에 렌더링 ── */
    if (!mounted) return null;
    return createPortal(modalContent, document.body);
}
