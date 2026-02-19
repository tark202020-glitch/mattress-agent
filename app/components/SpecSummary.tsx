'use client';

import React from 'react';
import { useDesignStore } from '../lib/store';
import DevelopmentRequestModal from './DevelopmentRequestModal';
import {
    SIZE_PRESETS, CORE_OPTIONS, COVER_OPTIONS, TOP_FOAM_OPTIONS,
    CONTROLLER_OPTIONS, PACKAGING_OPTIONS, DELIVERY_OPTIONS,
    calcCoreDimensions,
} from '../lib/constants';
import { useCustomOptionsStore } from '../lib/customOptionsStore';

export default function SpecSummary() {
    const state = useDesignStore();
    const custom = useCustomOptionsStore();

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

    const items = [
        {
            label: '사이즈',
            value: sizePreset?.label || null,
            sub: state.customWidth
                ? `${state.customWidth} × ${state.customDepth} mm${state.isDual ? ' (Dual)' : ''}`
                : null,
        },
        {
            label: '상단폼',
            value: state.topFoamEnabled === true
                ? (topFoam?.label || '선택중')
                : state.topFoamEnabled === false ? '미적용' : null,
        },
        {
            label: '가드폼',
            value: state.guardFoamEnabled === true
                ? `${state.guardFoamThickness}mm / ${state.guardFoamHardness}`
                : state.guardFoamEnabled === false
                    ? (state.isDual ? `중앙 구분만 (${state.guardFoamThickness}mm)` : '미적용')
                    : null,
        },
        {
            label: '하단폼',
            value: state.bottomFoamEnabled === true
                ? `${state.bottomFoamThickness}mm / ${state.bottomFoamHardness}`
                : state.bottomFoamEnabled === false ? '미적용' : null,
        },
        {
            label: '스트링',
            value: core
                ? `${core.label}${state.isDual ? ' × 2' : ''}`
                : null,
            sub: dims ? `${dims.coreW} × ${dims.coreD} × ${core?.height || 200}mm` : null,
        },
        { label: '커버', value: cover?.label || null },
        { label: '컨트롤러', value: ctrl?.label || null },
        { label: '포장', value: pkg?.label || null },
        { label: '배송', value: dlv?.label || null },
    ];

    const [showRequestModal, setShowRequestModal] = React.useState(false);

    return (
        <>
            <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 14 }}>
                    📋 선택 현황
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((item) => (
                        <div key={item.label} style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'flex-start', fontSize: 12,
                        }}>
                            <span style={{ color: '#94a3b8', flexShrink: 0, minWidth: 56 }}>{item.label}</span>
                            <div style={{ textAlign: 'right' }}>
                                {item.value ? (
                                    <>
                                        <span style={{ fontWeight: 500, color: '#0f172a' }}>{item.value}</span>
                                        {item.sub && (
                                            <div style={{ fontSize: 11, marginTop: 2, color: '#94a3b8' }}>{item.sub}</div>
                                        )}
                                    </>
                                ) : (
                                    <span style={{ color: '#cbd5e1' }}>—</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Development Request Trigger */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                    <button
                        onClick={() => setShowRequestModal(true)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: '#4f46e5',
                            color: 'white',
                            fontSize: 13,
                            fontWeight: 600,
                            borderRadius: 6,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                    >
                        <span>📄</span> 개발요청서 생성
                    </button>
                </div>
            </div>

            {showRequestModal && (
                <DevelopmentRequestModal onClose={() => setShowRequestModal(false)} />
            )}
        </>
    );
}


