'use client';

import { useState, type ReactNode } from 'react';

/* ──────────────────────────────────────────────
   범용 옵션 추가 모달
   필드 목록을 props로 받아 동적 폼을 생성합니다.
   ────────────────────────────────────────────── */

export interface FieldDef {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    placeholder?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
}

interface AddOptionModalProps {
    title: string;
    fields: FieldDef[];
    onSave: (values: Record<string, string>) => void;
    onClose: () => void;
}

export default function AddOptionModal({ title, fields, onSave, onClose }: AddOptionModalProps) {
    const [values, setValues] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        fields.forEach(f => { init[f.key] = f.type === 'select' && f.options?.length ? f.options[0].value : ''; });
        return init;
    });

    const handleSubmit = () => {
        // 필수 필드 확인
        const missing = fields.filter(f => f.required !== false && !values[f.key]?.trim());
        if (missing.length > 0) {
            alert(`다음 항목을 입력해주세요: ${missing.map(f => f.label).join(', ')}`);
            return;
        }
        onSave(values);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 16, padding: 28, width: 380,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
            }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                    ➕ {title}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {fields.map(field => (
                        <div key={field.key}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>
                                {field.label} {field.required !== false && <span style={{ color: '#ef4444' }}>*</span>}
                            </label>
                            {field.type === 'select' ? (
                                <select
                                    value={values[field.key]}
                                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '9px 12px', fontSize: 13,
                                        border: '1px solid #e2e8f0', borderRadius: 8,
                                        background: '#f8fafc', color: '#0f172a', outline: 'none',
                                    }}
                                >
                                    {field.options?.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type={field.type}
                                    value={values[field.key]}
                                    onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                    placeholder={field.placeholder || ''}
                                    style={{
                                        width: '100%', padding: '9px 12px', fontSize: 13,
                                        border: '1px solid #e2e8f0', borderRadius: 8,
                                        background: '#f8fafc', color: '#0f172a', outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 600,
                        background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
                        borderRadius: 8, cursor: 'pointer',
                    }}>
                        취소
                    </button>
                    <button onClick={handleSubmit} style={{
                        flex: 2, padding: '10px 0', fontSize: 13, fontWeight: 600,
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none',
                        borderRadius: 8, cursor: 'pointer',
                    }}>
                        추가
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── 인라인 "+" 버튼 ── */
export function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
    return (
        <button
            onClick={onClick}
            title={label || '새 항목 추가'}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 14px', fontSize: 12, fontWeight: 600,
                color: '#6366f1', background: 'rgba(99, 102, 241, 0.06)',
                border: '1.5px dashed rgba(99, 102, 241, 0.3)',
                borderRadius: 8, cursor: 'pointer',
                transition: 'all 0.2s',
                width: '100%',
            }}
            onMouseOver={e => { (e.target as HTMLElement).style.background = 'rgba(99, 102, 241, 0.12)'; }}
            onMouseOut={e => { (e.target as HTMLElement).style.background = 'rgba(99, 102, 241, 0.06)'; }}
        >
            ＋ {label || '추가'}
        </button>
    );
}

/* ── 삭제 버튼 (커스텀 항목에만 표시) ── */
export function DeleteBadge({ onClick }: { onClick: () => void }) {
    return (
        <span
            onClick={e => { e.stopPropagation(); onClick(); }}
            title="삭제"
            style={{
                position: 'absolute', top: 4, right: 4,
                width: 18, height: 18, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseOver={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseOut={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; }}
        >
            ✕
        </span>
    );
}
