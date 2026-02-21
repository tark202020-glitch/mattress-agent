'use client';

import React, { useState } from 'react';
import { useDesignStore } from '../lib/store';
import { handleDownloadQuote } from '../lib/quoteHandlers';
import { usePricingStore } from '../lib/pricingStore';
import { useCustomOptionsStore } from '../lib/customOptionsStore';
import BrochureGenerator from './BrochureGenerator';

interface CompletionModalProps {
    onClose: () => void;
    onOpenDevRequest: () => void;
}

export default function CompletionModal({ onClose, onOpenDevRequest }: CompletionModalProps) {
    const designState = useDesignStore();
    const custom = useCustomOptionsStore();
    const { calculateSummary } = usePricingStore();

    const [showBrochureGen, setShowBrochureGen] = useState(false);

    const summary = calculateSummary(designState);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
            padding: 20,
        }}>
            <div
                className="animate-in"
                style={{
                    background: '#fff',
                    borderRadius: 20,
                    width: '100%', maxWidth: 720,
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 24px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                            설계 완료
                        </h2>
                        <p style={{ fontSize: 14, color: '#64748b' }}>모든 정보가 입력되었습니다.</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 16,
                            background: '#f1f5f9', color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer', transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>

                    <button
                        onClick={onOpenDevRequest}
                        style={{
                            flex: 1,
                            aspectRatio: '1/1',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 16,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: '#334155'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <span style={{ fontSize: 32 }}>📄</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>개발요청서 보기</span>
                    </button>

                    <button
                        onClick={() => setShowBrochureGen(true)}
                        style={{
                            flex: 1,
                            aspectRatio: '1/1',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: 16,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: '#0369a1'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f0f9ff'}
                    >
                        <span style={{ fontSize: 32 }}>📖</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>브로셔 만들기 (AI)</span>
                    </button>

                    <button
                        onClick={() => handleDownloadQuote(designState, custom, summary, calculateSummary)}
                        style={{
                            flex: 1,
                            aspectRatio: '1/1',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                            background: '#4f46e5',
                            border: '1px solid #4338ca',
                            borderRadius: 16,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: '#ffffff'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                        onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
                    >
                        <span style={{ fontSize: 32 }}>📊</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>견적서 엑셀 다운로드</span>
                    </button>

                </div>
            </div>

            {showBrochureGen && (
                <BrochureGenerator isOpen={showBrochureGen} onClose={() => setShowBrochureGen(false)} />
            )}
        </div>
    );
}

