'use client';
// ============================================================
// /bom 화면 공통 UI 조각 (인라인 스타일, 허브/빌더 팔레트)
// ============================================================
import React from 'react';

export const FONT = "'Inter','Pretendard',-apple-system,system-ui,sans-serif";
export const C = { bg: '#e8edf2', card: '#ffffff', primary: '#4f46e5', green: '#059669', red: '#dc2626', text: '#0f172a', sub: '#64748b', line: '#e2e8f0', soft: '#f8fafc' };

export const fmtWon = (n: number | null | undefined) => (n == null ? '-' : `₩${Math.round(n).toLocaleString('ko-KR')}`);

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', ...style }}>{children}</div>;
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' };
export function Btn({ variant = 'secondary', size = 'md', style, ...rest }: BtnProps) {
    const base: React.CSSProperties = {
        fontFamily: FONT, fontWeight: 700, borderRadius: 20, cursor: rest.disabled ? 'not-allowed' : 'pointer', opacity: rest.disabled ? 0.5 : 1,
        padding: size === 'sm' ? '4px 12px' : '8px 18px', fontSize: size === 'sm' ? 11 : 13, transition: 'all 0.15s', border: '1px solid transparent',
    };
    const look: Record<string, React.CSSProperties> = {
        primary: { background: C.primary, color: '#fff' },
        secondary: { background: 'rgba(79,70,229,0.08)', color: C.primary, border: '1px solid rgba(79,70,229,0.15)' },
        danger: { background: 'rgba(239,68,68,0.08)', color: C.red, border: '1px solid rgba(239,68,68,0.15)' },
        ghost: { background: 'transparent', color: C.sub, border: `1px solid ${C.line}` },
    };
    return <button {...rest} style={{ ...base, ...look[variant], ...style }} />;
}

export function Badge({ tone = 'muted', children }: { tone?: 'ok' | 'warn' | 'danger' | 'info' | 'muted'; children: React.ReactNode }) {
    const look: Record<string, React.CSSProperties> = {
        ok: { background: 'rgba(5,150,105,0.08)', color: C.green }, warn: { background: 'rgba(245,158,11,0.12)', color: '#b45309' },
        danger: { background: 'rgba(239,68,68,0.08)', color: C.red }, info: { background: 'rgba(79,70,229,0.08)', color: C.primary },
        muted: { background: '#f1f5f9', color: C.sub },
    };
    return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap', ...look[tone] }}>{children}</span>;
}

export interface Column<T> { key: string; header: string; width?: number | string; align?: 'left' | 'right' | 'center'; render?: (row: T) => React.ReactNode }
export function Table<T>({ columns, rows, rowKey, empty = '데이터가 없습니다.', onRowClick }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; empty?: string; onRowClick?: (r: T) => void }) {
    const cell: React.CSSProperties = { padding: '8px 10px', fontSize: 12, borderBottom: `1px solid ${C.line}`, verticalAlign: 'middle' };
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT }}>
                <thead><tr>{columns.map(c => <th key={c.key} style={{ ...cell, textAlign: c.align ?? 'left', color: C.sub, fontWeight: 700, background: C.soft, width: c.width }}>{c.header}</th>)}</tr></thead>
                <tbody>
                    {rows.length === 0 && <tr><td colSpan={columns.length} style={{ ...cell, textAlign: 'center', color: C.sub, padding: 24 }}>{empty}</td></tr>}
                    {rows.map(r => (
                        <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                            onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = C.soft; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            {columns.map(c => <td key={c.key} style={{ ...cell, textAlign: c.align ?? 'left', color: C.text }}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function Modal({ title, onClose, children, width = 640 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="animate-in" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px -12px rgba(0,0,0,0.25)', fontFamily: FONT }}>
                <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid #f1f5f9`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: '#f1f5f9', color: C.sub, border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 24, overflowY: 'auto' }}>{children}</div>
            </div>
        </div>
    );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: C.sub, fontWeight: 600 }}>
            {label}{children}{hint && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{hint}</span>}
        </label>
    );
}
const inputStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderRadius: 8, border: `1px solid #cbd5e1`, outline: 'none', color: C.text, fontFamily: FONT, background: '#fff' };
export function TextInput(p: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...p} style={{ ...inputStyle, ...p.style }} />; }
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} style={{ ...inputStyle, ...p.style }} />; }
export function Spinner({ label = '불러오는 중…' }: { label?: string }) { return <div style={{ padding: 24, textAlign: 'center', color: C.sub, fontSize: 13 }}>{label}</div>; }
export function ErrorBox({ error }: { error: string | null }) { return error ? <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', color: C.red, fontSize: 12, fontWeight: 600 }}>{error}</div> : null; }
export function PageTitle({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div><h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>{title}</h1>{desc && <p style={{ fontSize: 13, color: C.sub, margin: '4px 0 0' }}>{desc}</p>}</div>
            <div style={{ display: 'flex', gap: 8 }}>{right}</div>
        </div>
    );
}
