'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useDesignStore } from '../lib/store';
import { usePricingStore } from '../lib/pricingStore';
import { useCustomOptionsStore } from '../lib/customOptionsStore';
import { handleDownloadQuoteWithCondition } from '../lib/quoteHandlers';
import { SIZE_PRESETS } from '../lib/constants';

/* ══════════════════════════════════════ */
/*  견적서 조건설정 모달                      */
/* ══════════════════════════════════════ */

export interface QuoteCondition {
    laborRate: number;     // 노무비율 (%)
    materialRate: number;  // 재료비율 (%)
    salesRate: number;     // 판매비율 (%)
    marginRate: number;    // 마진율 (%)
}

interface QuoteConditionModalProps {
    onClose: () => void;
}

export default function QuoteConditionModal({ onClose }: QuoteConditionModalProps) {
    const designState = useDesignStore();
    const custom = useCustomOptionsStore();
    const { calculateSummary } = usePricingStore();

    const [condition, setCondition] = useState<QuoteCondition>({
        laborRate: 0,
        materialRate: 0,
        salesRate: 0,
        marginRate: 0,
    });
    const [downloading, setDownloading] = useState(false);

    // 사이즈별 원가 계산
    const allSizes = [...SIZE_PRESETS, ...custom.sizes];
    const sizePreset = allSizes.find(s => s.id === designState.sizePresetId);
    const isKR = sizePreset?.region === '국내' || !sizePreset;

    const sizeConfigs = useMemo(() => {
        const configs = isKR
            ? [
                { label: 'SS', w: 1100, d: 2000 },
                { label: 'Q', w: 1500, d: 2000 },
                { label: 'K', w: 1600, d: 2000 },
                { label: 'LK', w: 1800, d: 2000 },
            ]
            : [
                { label: 'T', w: 970, d: 1910 },
                { label: 'F', w: 1370, d: 1910 },
                { label: 'Q', w: 1520, d: 2030 },
                { label: 'K', w: 1930, d: 2030 },
                { label: 'CK', w: 1830, d: 2130 },
            ];

        return configs.map(cfg => {
            const temp = { ...designState, customWidth: cfg.w, customDepth: cfg.d };
            const summary = calculateSummary(temp);
            return { ...cfg, costPrice: summary.totalUnitPrice };
        });
    }, [isKR, designState, calculateSummary]);

    // 최종 견적가 계산
    const calcFinalPrice = useCallback((costPrice: number) => {
        const { laborRate, materialRate, salesRate, marginRate } = condition;
        const subtotal = costPrice * (1 + (laborRate + materialRate + salesRate) / 100);
        return Math.round(subtotal * (1 + marginRate / 100));
    }, [condition]);

    // 입력 핸들러
    const handleChange = (key: keyof QuoteCondition, value: string) => {
        const num = parseFloat(value) || 0;
        setCondition(prev => ({ ...prev, [key]: num }));
    };

    // 다운로드
    const handleDownload = async () => {
        setDownloading(true);
        try {
            await handleDownloadQuoteWithCondition(designState, custom, calculateSummary, condition);
            onClose();
        } catch (e) {
            console.error(e);
            alert('견적서 생성 실패');
        } finally {
            setDownloading(false);
        }
    };

    // 총 부가율 합계
    const totalAddRate = condition.laborRate + condition.materialRate + condition.salesRate;

    const inputStyle: React.CSSProperties = {
        width: 80, padding: '8px 10px', fontSize: 14, fontWeight: 700,
        textAlign: 'right', borderRadius: 8,
        border: '1px solid #cbd5e1', outline: 'none',
        transition: 'border-color 0.2s',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            padding: 20,
        }}>
            <div style={{
                background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
                boxShadow: '0 20px 60px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            📊 견적서 조건 설정
                        </h2>
                        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
                            노무·재료·판매비 비율과 마진율을 입력하면 최종 견적가가 산출됩니다.
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: 16,
                        background: '#f1f5f9', color: '#64748b', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: 16,
                    }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '70vh' }}>

                    {/* 비율 입력 영역 */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
                        marginBottom: 24, padding: '16px 20px',
                        background: 'linear-gradient(135deg, #f8fafc, #f0f4ff)',
                        borderRadius: 12, border: '1px solid #e2e8f0',
                    }}>
                        {[
                            { key: 'laborRate' as const, label: '노무비', icon: '👷', color: '#3b82f6' },
                            { key: 'materialRate' as const, label: '재료비', icon: '🧱', color: '#10b981' },
                            { key: 'salesRate' as const, label: '판매비', icon: '📦', color: '#f59e0b' },
                            { key: 'marginRate' as const, label: '마진', icon: '💰', color: '#8b5cf6' },
                        ].map(({ key, label, icon, color }) => (
                            <div key={key} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6, letterSpacing: '0.5px' }}>
                                    {icon} {label}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    <input
                                        type="number"
                                        value={condition[key] || ''}
                                        onChange={e => handleChange(key, e.target.value)}
                                        placeholder="0"
                                        style={{
                                            ...inputStyle,
                                            borderColor: condition[key] > 0 ? color : '#cbd5e1',
                                            color: condition[key] > 0 ? color : '#0f172a',
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = color}
                                        onBlur={e => e.currentTarget.style.borderColor = condition[key] > 0 ? color : '#cbd5e1'}
                                    />
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>%</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 사이즈별 가격 테이블 */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 10, overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>사이즈</th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>규격 (W×D)</th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>원가</th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>부가율 (+{totalAddRate}%)</th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>마진 (+{condition.marginRate}%)</th>
                                <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#4f46e5', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>최종 견적가</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sizeConfigs.map((sz, i) => {
                                const subtotal = Math.round(sz.costPrice * (1 + totalAddRate / 100));
                                const finalPrice = calcFinalPrice(sz.costPrice);
                                return (
                                    <tr key={sz.label} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                        <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, textAlign: 'center', color: '#0f172a', borderBottom: '1px solid #e2e8f0' }}>
                                            {sz.label}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'center', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                            {sz.w} × {sz.d}
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#334155', borderBottom: '1px solid #e2e8f0', fontFamily: "'Courier New', monospace" }}>
                                            {sz.costPrice.toLocaleString()}원
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#0369a1', borderBottom: '1px solid #e2e8f0', fontFamily: "'Courier New', monospace" }}>
                                            {subtotal.toLocaleString()}원
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#7c3aed', borderBottom: '1px solid #e2e8f0', fontFamily: "'Courier New', monospace" }}>
                                            +{(finalPrice - subtotal).toLocaleString()}원
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 15, fontWeight: 800, textAlign: 'right', color: '#4f46e5', borderBottom: '1px solid #e2e8f0', fontFamily: "'Courier New', monospace" }}>
                                            {finalPrice.toLocaleString()}원
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* 산출 공식 안내 */}
                    <div style={{
                        marginTop: 16, padding: '12px 16px',
                        background: '#fffbeb', border: '1px solid #fde68a',
                        borderRadius: 8, fontSize: 11, color: '#92400e', lineHeight: '1.6',
                    }}>
                        <strong>💡 산출 공식:</strong> 최종가 = 원가 × (1 + 노무% + 재료% + 판매%) × (1 + 마진%)
                        <br />
                        <span style={{ color: '#b45309' }}>※ 엑셀에는 <strong>최종 견적가</strong>만 표시됩니다.</span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'flex-end', gap: 10,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0',
                            background: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        style={{
                            padding: '10px 24px', borderRadius: 10, border: 'none',
                            background: downloading ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                            color: '#fff', fontSize: 13, fontWeight: 700,
                            cursor: downloading ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: downloading ? 'none' : '0 4px 12px rgba(79,70,229,0.3)',
                        }}
                    >
                        {downloading ? '⏳ 생성 중...' : '📥 엑셀 다운로드'}
                    </button>
                </div>
            </div>
        </div>
    );
}
