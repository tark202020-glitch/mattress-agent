'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePricingStore } from '../lib/pricingStore';
import type { PriceCategory, PriceItem } from '../types/pricing';
import * as XLSX from 'xlsx';

/** 통화 포맷 */
function fmt(n?: number): string {
    if (typeof n !== 'number') return '0';
    return n.toLocaleString('ko-KR');
}

interface Props {
    onClose: () => void;
}

export default function PricingManageModal({ onClose }: Props) {
    const { categories, replaceAllData, updateItemFormula, resetToDefault, lastUpdated, hydrate } = usePricingStore();
    const [activeTab, setActiveTab] = useState<string>('');
    const [editingCell, setEditingCell] = useState<{ itemId: string; field: 'constant' | 'basePrice' | 'formulaString' } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { hydrate(); }, [hydrate]);
    useEffect(() => { if (!activeTab && categories.length > 0) setActiveTab(categories[0].id); }, [categories, activeTab]);

    const activeCat = categories.find(c => c.id === activeTab);

    // ── 셀 편집 ──
    const startEdit = (itemId: string, field: 'constant' | 'basePrice' | 'formulaString', currentValue: string | number) => {
        setEditingCell({ itemId, field });
        setEditValue(String(currentValue));
    };

    const commitEdit = () => {
        if (editingCell) {
            const item = activeCat?.items.find(i => i.id === editingCell.itemId);
            if (item) {
                let newConstant = item.constant;
                let newBasePrice = item.basePrice;
                let newFormulaString = item.formulaString;

                if (editingCell.field === 'constant') {
                    const parsed = parseFloat(editValue);
                    if (!isNaN(parsed)) newConstant = parsed;
                } else if (editingCell.field === 'basePrice') {
                    const parsed = parseInt(editValue.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(parsed)) newBasePrice = parsed;
                } else if (editingCell.field === 'formulaString') {
                    newFormulaString = editValue;
                }

                updateItemFormula(item.id, newConstant, newBasePrice, newFormulaString);
            }
        }
        setEditingCell(null);
    };

    // ── XLSX 다운로드 (단일 시트) ──
    const handleDownload = () => {
        const wb = XLSX.utils.book_new();
        const rows: Record<string, string | number>[] = [];

        categories.forEach(cat => {
            cat.items.forEach(item => {
                rows.push({
                    '카테고리': cat.displayName,
                    'ID': item.id,
                    '옵션ID': item.optionId,
                    '품목': item.name,
                    '계산식타입': item.formulaType,
                    '계산식': item.formulaString,
                    '상수': item.constant,
                    '기본금': item.basePrice,
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, '단가표');
        XLSX.writeFile(wb, `단가표_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // ── XLSX 업로드 (단일 시트) ──
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const updatedCategories: PriceCategory[] = JSON.parse(JSON.stringify(categories)); // deep copy

            let parsedCount = 0;
            const wsName = wb.SheetNames[0]; // 첫 번째 시트만 사용
            const ws = wb.Sheets[wsName];
            const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

            rows.forEach(row => {
                const itemId = String(row['ID'] || '');
                if (!itemId) return;

                // 해당 아이템 찾기
                for (const cat of updatedCategories) {
                    const item = cat.items.find(i => i.id === itemId);
                    if (item) {
                        const newFormulaType = row['계산식타입'] as typeof item.formulaType;
                        const newFormulaStr = row['계산식'] !== undefined ? String(row['계산식']) : item.formulaString;
                        const newConstantStr = String(row['상수'] !== undefined ? row['상수'] : item.constant);
                        const newBasePriceStr = String(row['기본금'] !== undefined ? row['기본금'] : item.basePrice);

                        let updated = false;

                        if (newFormulaType && ['VOLUME', 'FIXED', 'WIDTH_STEP'].includes(newFormulaType)) {
                            item.formulaType = newFormulaType;
                            updated = true;
                        }

                        if (newFormulaStr) {
                            item.formulaString = newFormulaStr;
                            updated = true;
                        }

                        const parsedConst = parseFloat(newConstantStr);
                        if (!isNaN(parsedConst)) {
                            item.constant = parsedConst;
                            updated = true;
                        }

                        const parsedBase = parseInt(newBasePriceStr.replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(parsedBase)) {
                            item.basePrice = parsedBase;
                            updated = true;
                        }

                        if (updated) parsedCount++;
                        break;
                    }
                }
            });

            replaceAllData(updatedCategories);
            setUploadMsg(`✅ ${parsedCount}개 품목이 업데이트되었습니다.`);
            setTimeout(() => setUploadMsg(null), 3000);
        } catch (err) {
            setUploadMsg(`❌ 파일 파싱 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
            setTimeout(() => setUploadMsg(null), 5000);
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        }} onClick={onClose}>
            <div
                style={{
                    width: 900, maxHeight: '85vh',
                    background: '#fff', borderRadius: 16,
                    boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
                    flexShrink: 0,
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            💰 부품별 단가 관리 (수식 기반)
                        </h2>
                        {lastUpdated && (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                최근 수정: {new Date(lastUpdated).toLocaleString('ko-KR')}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleUpload}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                fontSize: 11, fontWeight: 600, padding: '6px 12px',
                                borderRadius: 6, border: '1px solid #d1d5db',
                                background: '#f9fafb', cursor: 'pointer', color: '#374151',
                            }}
                        >📤 XLSX 업로드</button>
                        <button
                            onClick={handleDownload}
                            style={{
                                fontSize: 11, fontWeight: 600, padding: '6px 12px',
                                borderRadius: 6, border: '1px solid #d1d5db',
                                background: '#f9fafb', cursor: 'pointer', color: '#374151',
                            }}
                        >📥 다운로드</button>
                        <button
                            onClick={() => { if (confirm('샘플 단가로 초기화하시겠습니까?')) resetToDefault(); }}
                            style={{
                                fontSize: 11, fontWeight: 600, padding: '6px 12px',
                                borderRadius: 6, border: '1px solid #fca5a5',
                                background: '#fef2f2', cursor: 'pointer', color: '#dc2626',
                            }}
                        >🔄 초기화</button>
                        <button
                            onClick={onClose}
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                border: 'none', background: '#f1f5f9', cursor: 'pointer',
                                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#64748b',
                            }}
                        >✕</button>
                    </div>
                </div>

                {/* 업로드 메시지 */}
                {uploadMsg && (
                    <div style={{
                        padding: '8px 24px', fontSize: 12, fontWeight: 600,
                        background: uploadMsg.startsWith('✅') ? '#ecfdf5' : '#fef2f2',
                        color: uploadMsg.startsWith('✅') ? '#065f46' : '#991b1b',
                    }}>
                        {uploadMsg}
                    </div>
                )}

                {/* ── 카테고리 탭 ── */}
                <div style={{
                    display: 'flex', gap: 4, padding: '12px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    flexShrink: 0, overflowX: 'auto',
                }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            style={{
                                fontSize: 12, fontWeight: 600, padding: '6px 14px',
                                borderRadius: 20, border: 'none', cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                background: activeTab === cat.id ? '#4f46e5' : '#f1f5f9',
                                color: activeTab === cat.id ? '#fff' : '#64748b',
                                transition: 'all 0.15s',
                            }}
                        >
                            {cat.displayName}
                        </button>
                    ))}
                </div>

                {/* ── 단가 테이블 ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                    {activeCat && (
                        <table style={{
                            width: '100%', borderCollapse: 'collapse',
                            fontSize: 12,
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ ...thStyle, width: '20%' }}>품목</th>
                                    <th style={{ ...thStyle, width: '10%', textAlign: 'center' }}>타입</th>
                                    <th style={{ ...thStyle, width: '35%', textAlign: 'left' }}>수식 설명</th>
                                    <th style={{ ...thStyle, width: '15%', textAlign: 'right' }}>상수</th>
                                    <th style={{ ...thStyle, width: '20%', textAlign: 'right' }}>기본가</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCat.items.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ ...tdStyle, fontWeight: 500 }}>{item.name}</td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            <span style={{
                                                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                                background: item.formulaType === 'VOLUME' ? '#dbeafe' : item.formulaType === 'FIXED' ? '#f3e8ff' : '#ffedd5',
                                                color: item.formulaType === 'VOLUME' ? '#1e40af' : item.formulaType === 'FIXED' ? '#6b21a8' : '#9a3412',
                                            }}>
                                                {item.formulaType}
                                            </span>
                                        </td>

                                        {/* 수식 문자열 */}
                                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                                            {editingCell?.itemId === item.id && editingCell?.field === 'formulaString' ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                    style={inputStyle}
                                                />
                                            ) : (
                                                <span onClick={() => startEdit(item.id, 'formulaString', item.formulaString)} style={clickableStyle}>
                                                    {item.formulaString}
                                                </span>
                                            )}
                                        </td>

                                        {/* 상수 */}
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            {editingCell?.itemId === item.id && editingCell?.field === 'constant' ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                    style={{ ...inputStyle, textAlign: 'right' }}
                                                />
                                            ) : (
                                                <span onClick={() => startEdit(item.id, 'constant', item.constant)} style={{ ...clickableStyle, fontVariantNumeric: 'tabular-nums' }}>
                                                    {item.constant}
                                                </span>
                                            )}
                                        </td>

                                        {/* 기본가 */}
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            {editingCell?.itemId === item.id && editingCell?.field === 'basePrice' ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                                    style={{ ...inputStyle, textAlign: 'right' }}
                                                />
                                            ) : (
                                                <span onClick={() => startEdit(item.id, 'basePrice', item.basePrice)} style={{ ...clickableStyle, fontVariantNumeric: 'tabular-nums' }}>
                                                    {fmt(item.basePrice)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 하단 버튼 */}
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end', background: '#f8fafc', flexShrink: 0
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 24px', background: '#334155', color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >닫기</button>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 10px',
    textAlign: 'left',
    color: '#64748b',
    fontWeight: 600,
    fontSize: 11,
};

const tdStyle: React.CSSProperties = {
    padding: '10px',
    color: '#334155',
};

const clickableStyle: React.CSSProperties = {
    cursor: 'pointer', padding: '2px 6px',
    borderRadius: 4, transition: 'background 0.1s', display: 'inline-block', minWidth: 40
};

const inputStyle: React.CSSProperties = {
    width: '100%', fontSize: 12,
    padding: '2px 6px', border: '1px solid #4f46e5',
    borderRadius: 4, outline: 'none',
};
