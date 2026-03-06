'use client';

import React, { useEffect } from 'react';
import { useDesignStore } from '../lib/store';
import { usePricingStore } from '../lib/pricingStore';
import {
    SIZE_PRESETS,
    CORE_OPTIONS, COVER_OPTIONS, TOP_FOAM_OPTIONS,
    CONTROLLER_OPTIONS, SENSOR_OPTIONS, PACKAGING_OPTIONS, DELIVERY_OPTIONS,
    calcCoreDimensions,
} from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';

/** 통화 포맷 (₩) */
function formatPrice(price: number): string {
    if (price === 0) return '-';
    return `₩${price.toLocaleString('ko-KR')}`;
}

export default function PricingPanel() {
    const designState = useDesignStore();
    const custom = useCustomOptionsStore();
    const { calculateSummary, hydrate, isLoaded } = usePricingStore();

    useEffect(() => { hydrate(); }, [hydrate]);

    // 옵션 이름 lookup
    const allCores = [...CORE_OPTIONS, ...custom.cores];
    const allCovers = [...COVER_OPTIONS, ...custom.covers];
    const allTopFoams = [...TOP_FOAM_OPTIONS, ...custom.topFoams];
    const allControllers = [...CONTROLLER_OPTIONS, ...custom.controllers];
    const allSensors = [...SENSOR_OPTIONS, ...custom.sensors];
    const allPackagings = [...PACKAGING_OPTIONS, ...custom.packagings];
    const allDeliveries = [...DELIVERY_OPTIONS, ...custom.deliveries];

    const summary = calculateSummary(designState);

    const getDisplayName = (categoryId: string, optionName: string): string => {
        switch (categoryId) {
            case 'foam_top': return allTopFoams.find(f => f.id === optionName)?.label || optionName;
            case 'string': return allCores.find(c => c.id === optionName)?.label || optionName;
            case 'cover': return allCovers.find(c => c.id === optionName)?.label || optionName;
            case 'controller': return allControllers.find(c => c.id === optionName)?.label || optionName;
            case 'sensor': return allSensors.find(s => s.id === optionName)?.label || optionName;
            case 'packaging': return allPackagings.find(p => p.id === optionName)?.label || optionName;
            case 'delivery': return allDeliveries.find(d => d.id === optionName)?.label || optionName;
            default: return optionName;
        }
    };

    if (!isLoaded) return null;

    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginTop: 12,
        }}>
            {/* 타이틀 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: 0 }}>
                    💰 예상 단가
                </h3>
            </div>

            {/* 부품별 단가 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {summary.items.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
                        부품을 선택하면 단가가 표시됩니다
                    </div>
                ) : (
                    summary.items.map((item, idx) => (
                        <div key={idx} style={{
                            display: 'flex', flexDirection: 'column', gap: 4,
                            padding: '10px 0', borderBottom: idx < summary.items.length - 1 ? '1px dashed #e2e8f0' : 'none'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{item.categoryName}</span>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>{getDisplayName(item.categoryId, item.optionName)}</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatPrice(item.unitPrice)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {item.specs && <span style={{ fontSize: 10, color: '#94a3b8' }}>규격: {item.specs}</span>}
                                    {item.formula && <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>수식: {item.formula}</span>}
                                </div>
                                {item.quantity && item.quantity > 1 && (
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#0ea5e9', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                                        x{item.quantity}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 합계 */}
            {summary.items.length > 0 && (
                <>
                    <div style={{
                        marginTop: 12, paddingTop: 12,
                        borderTop: '1px dashed #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                            합계
                        </span>
                        <span style={{
                            fontSize: 16, fontWeight: 800, color: '#059669',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {formatPrice(summary.totalUnitPrice)}
                        </span>
                    </div>
                </>
            )}

            {isLoaded && summary.totalUnitPrice > 0 && (
                <div style={{ marginTop: 24 }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 12,
                        textAlign: 'center',
                        color: '#334155'
                    }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', borderTop: '1px solid #e2e8f0', fontWeight: 600 }}>
                                <th style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>규격</th>
                                <th style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>D</th>
                                <th style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>W</th>
                                <th style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>H</th>
                                <th style={{ padding: '8px 4px' }}>1k (공급가)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                // Domestic: SS, Q, K, LK / Overseas: T, F, Q, K, CK
                                const allSizes = [...SIZE_PRESETS, ...custom.sizes];
                                const sizePreset = allSizes.find(s => s.id === designState.sizePresetId);
                                const isKR = sizePreset?.region === '국내' || !sizePreset; // Assume KR if not found

                                const sizeData: { label: string, w: number, d: number, h: number, price: number }[] = [];
                                const addSizeData = (label: string, w: number, d: number) => {
                                    const tempState = { ...designState, customWidth: w, customDepth: d };
                                    const tempSummary = calculateSummary(tempState);
                                    sizeData.push({
                                        label, w, d, h: 250, // placeholder H temp
                                        price: tempSummary.totalUnitPrice
                                    });
                                };

                                if (isKR) {
                                    addSizeData('SS', 1100, 2000);
                                    addSizeData('Q', 1500, 2000);
                                    addSizeData('K', 1600, 2000);
                                    addSizeData('LK', 1800, 2000);
                                } else {
                                    addSizeData('T', 990, 1905);
                                    addSizeData('F', 1370, 1905);
                                    addSizeData('Q', 1525, 2030);
                                    addSizeData('K', 1930, 2030);
                                    addSizeData('CK', 1830, 2135);
                                }

                                return sizeData.map((row, idx) => (
                                    <tr key={row.label} style={{ borderBottom: '1px dotted #cbd5e1', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                        <td style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1', fontWeight: 600 }}>{row.label}</td>
                                        <td style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>{row.w.toLocaleString()}</td>
                                        <td style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>{row.d.toLocaleString()}</td>
                                        <td style={{ padding: '8px 4px', borderRight: '1px dotted #cbd5e1' }}>{row.h}</td>
                                        <td style={{ padding: '8px 4px', paddingRight: 16 }}>{formatPrice(row.price).replace('₩', '')}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 샘플 데이터 안내 */}
            <div style={{
                marginTop: 12, padding: '6px 10px',
                background: '#fffbeb', borderRadius: 6,
                border: '1px solid #fde68a',
            }}>
                <span style={{ fontSize: 9, color: '#92400e' }}>
                    ⚠️ 현재 샘플 단가가 적용되어 있습니다. 실제 단가는 단가 관리에서 수정해주세요.
                </span>
            </div>
        </div>
    );
}
