# BOM 통합 1B (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1A에서 만든 `/api/bom/*` 위에 화면을 붙인다. 위자드 9단계 "BOM 확인"으로 상품을 저장하고, `/bom` 영역에서 상품·BOM·AVL·마스터·엑셀을 관리하며, 견적서·개발요청서를 DB BOM 기준으로 만든다. localStorage 단가표 UI(단가 관리 모달)와 레거시 견적 경로를 제거한다.

**Architecture:** 모든 `/bom` 화면은 `app/bom/layout.tsx` 안의 클라이언트 컴포넌트이며 `app/lib/bom/client.ts`의 `bomApi()`로 `/api/bom/*`만 호출한다(Supabase 직접 호출 없음). 공통 UI 조각은 `app/bom/_components/ui.tsx` 하나에 둔다(인라인 style 객체, 허브/빌더와 같은 팔레트). 위자드 9단계는 `buildBom`을 브라우저에서 실행해 미리보기를 만들고 저장은 `POST /api/bom/products/from-design`에 맡긴다. 견적 표시는 `buildBom + priceBom`을 AVL 행(`GET /api/bom/avl`)으로 클라이언트에서 계산해 기존 `PricingPanel` 자리를 대체한다.

**Tech Stack:** Next.js 16 App Router(클라이언트 컴포넌트), React 19, Zustand(`useDesignStore` 기존), 1A 모듈(`app/lib/bom/*`), Vitest(순수 로직만)

## Global Constraints

- 기획안 `G:\Antigravity_Google\Mattress_ADF\Mattress-Agent_BOM통합_기획안.md` 7장(화면·흐름)이 스펙. 라우트 표: `/bom`(1차는 `/bom/products`로 리다이렉트), `/bom/products`, `/bom/products/[code]`, `/bom/items`, `/bom/vendors`, `/bom/employees`, `/bom/avl`, `/bom/import`.
- API 계약은 1A 계획서 말미 "1B에 넘기는 인터페이스"와 실제 라우트 코드(`app/api/bom/**`)를 따른다. 응답 오류 형태는 `{ error: string, code?: string }`, 미로그인은 401.
- `bom_lines→items` 임베드 응답에서 품목 정보는 `line.items` 객체(`name, unit, category, revision`)에 들어 있다.
- 디자이너 페이지(`/designer`), AI 이미지, 브로슈어, 위자드 1~8단계 UI는 수정하지 않는다. `app/lib/constants.ts`는 `WIZARD_STEPS`에 9단계를 추가하는 것만 허용.
- `app/lib/pricingStore.ts`, `pricingData.ts`는 삭제하지 않는다(1A 동치 테스트가 사용). 단, 화면에서의 사용은 모두 제거한다.
- 스타일: 인라인 `style={{}}` 객체, 폰트 `'Inter','Pretendard',-apple-system,system-ui,sans-serif`, 배경 `#e8edf2`, 카드 `#ffffff` radius 16, 주색 `#4f46e5`, 보조 `#059669`, 위험 `#dc2626`, 텍스트 `#0f172a`/`#64748b`, 경계 `#e2e8f0`. `globals.css`의 `.btn-primary`, `.btn-secondary`, `.animate-in` 재사용 가능.
- 코드 주석·UI 문구 한국어. 커밋 메시지 `feat(bom-ui): …` / `fix(bom-ui): …` / `refactor(bom-ui): …` + 한국어 요약, 마지막 줄 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 각 Task의 검증: `npx tsc --noEmit` 오류 없음 + `npm test` 통과(기존 71건 + 신규). `npm run build`는 Task 1, 4, 9에서 실행. 화면 동작 확인은 컨트롤러가 로그인된 브라우저(dev 서버 `http://localhost:3000`)로 수행한다.

## File Structure

```
app/
├─ lib/bom/client.ts                      # T1  bomApi<T>() fetch 래퍼 + ApiError
├─ lib/bom/__tests__/client.test.ts       # T1
├─ lib/bom/useAvlPricing.ts               # T3  AVL 행 로드 + buildBom/priceBom 클라이언트 계산 훅
├─ bom/layout.tsx                         # T1  헤더(홈·로그아웃) + 탭 내비
├─ bom/page.tsx                           # T1  → /bom/products 리다이렉트
├─ bom/_components/ui.tsx                 # T1  Card, Table, Btn, Badge, Modal, Field, Select, Empty, Spinner
├─ bom/products/page.tsx                  # T2  상품 목록 (model_code 그룹)
├─ bom/products/[code]/page.tsx           # T2  상품 상세 (BOM 트리·단가 배지·버튼)
├─ bom/products/[code]/QuoteDialog.tsx    # T3  조건 입력 → POST documents/quote
├─ bom/items/page.tsx                     # T6
├─ bom/vendors/page.tsx                   # T6
├─ bom/employees/page.tsx                 # T6
├─ bom/_components/MasterTable.tsx        # T6  컬럼 정의 기반 CRUD 표
├─ bom/avl/page.tsx                       # T7
├─ bom/import/page.tsx                    # T8
├─ components/steps/StepBomConfirm.tsx    # T4  위자드 9단계
├─ components/PricingPanel.tsx            # T3  (수정) DB AVL 기반
├─ components/DevelopmentRequestModal.tsx # T5  (수정) BOM 표 섹션 + bom prop
├─ builder/page.tsx                       # T3/T4 (수정) 단가 관리 버튼 제거, 9단계
├─ components/StepIndicator.tsx           # T4  (수정) 9단계 텍스트
├─ lib/store.ts                           # T4  (수정) nextStep 상한 9
├─ lib/constants.ts                       # T4  (수정) WIZARD_STEPS 9단계
├─ hub/page.tsx                           # T1  (수정) 세 번째 카드
└─ middleware.ts                          # T1  (수정) /bom 보호
삭제(T3): components/PricingManageModal.tsx, components/CompletionModal.tsx, components/QuoteConditionModal.tsx, lib/quoteHandlers.ts, api/quote/generate/route.ts
```

---

### Task 1: 공통 기반 — API 클라이언트, /bom 레이아웃·UI 조각, 허브 카드, 미들웨어

**Files:**
- Create: `app/lib/bom/client.ts`, `app/lib/bom/__tests__/client.test.ts`
- Create: `app/bom/layout.tsx`, `app/bom/page.tsx`, `app/bom/_components/ui.tsx`
- Modify: `app/hub/page.tsx` (MENU_ITEMS에 카드 추가), `middleware.ts` (protectedPaths에 `/bom`)

**Interfaces:**
- Produces: `bomApi<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>` — `/api/bom` 접두어 자동, `json`이 있으면 `Content-Type: application/json` + `JSON.stringify`, 비 2xx면 `ApiError(status, message, code?)` throw. `bomApiBlob(path): Promise<Blob>`.
- Produces: `ui.tsx` 컴포넌트 — `Card`, `Btn({variant:'primary'|'secondary'|'danger'|'ghost', size?:'sm'})`, `Badge({tone:'ok'|'warn'|'danger'|'info'|'muted'})`, `Table({columns, rows, rowKey, empty?})`, `Modal({title, onClose, children, width?})`, `Field({label, children, hint?})`, `TextInput`, `Select`, `Spinner`, `ErrorBox({error})`, `fmtWon(n)`.

- [ ] **Step 1: 실패하는 테스트 — `app/lib/bom/__tests__/client.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { bomApi, ApiError } from '../client';

const okJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('bomApi', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('경로 접두어와 JSON 본문을 붙이고 응답을 파싱한다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({ ok: 1 }));
        vi.stubGlobal('fetch', fetchMock);
        const r = await bomApi<{ ok: number }>('/items', { method: 'POST', json: { a: 1 } });
        expect(r).toEqual({ ok: 1 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/bom/items');
        expect(init.method).toBe('POST');
        expect(init.body).toBe('{"a":1}');
        expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
    it('오류 응답은 ApiError(status, message, code)로 던진다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ error: '로그인이 필요합니다.', code: 'X' }, 401)));
        await expect(bomApi('/items')).rejects.toMatchObject({ status: 401, message: '로그인이 필요합니다.', code: 'X' } satisfies Partial<ApiError>);
    });
    it('JSON이 아닌 오류 본문도 메시지로 감싼다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Internal', { status: 500 })));
        await expect(bomApi('/items')).rejects.toMatchObject({ status: 500, message: 'Internal' });
    });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run app/lib/bom/__tests__/client.test.ts` → FAIL `Cannot find module '../client'`

- [ ] **Step 3: `app/lib/bom/client.ts` 작성**

```ts
// ============================================================
// /api/bom/* 호출 래퍼. 화면은 Supabase를 직접 부르지 않고 이 함수만 쓴다.
// ============================================================
export class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) {
        super(message);
        this.name = 'ApiError';
    }
}

type Init = RequestInit & { json?: unknown };

async function toError(res: Response): Promise<ApiError> {
    const text = await res.text();
    try {
        const j = JSON.parse(text) as { error?: string; code?: string };
        return new ApiError(res.status, j.error ?? text, j.code);
    } catch {
        return new ApiError(res.status, text || `HTTP ${res.status}`);
    }
}

export async function bomApi<T>(path: string, init: Init = {}): Promise<T> {
    const { json, headers, ...rest } = init;
    const res = await fetch(`/api/bom${path}`, {
        ...rest,
        headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(headers as Record<string, string> | undefined) },
        body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    if (!res.ok) throw await toError(res);
    return (await res.json()) as T;
}

/** 파일 다운로드용 (export 등) */
export async function bomApiBlob(path: string, init: RequestInit = {}): Promise<Blob> {
    const res = await fetch(`/api/bom${path}`, init);
    if (!res.ok) throw await toError(res);
    return res.blob();
}

/** Blob을 브라우저 다운로드로 저장 */
export function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
```

- [ ] **Step 4: 테스트 통과 확인** — Run: `npx vitest run app/lib/bom/__tests__/client.test.ts` → PASS (3)

- [ ] **Step 5: `app/bom/_components/ui.tsx` 작성**

```tsx
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
```

- [ ] **Step 6: `app/bom/layout.tsx`와 `app/bom/page.tsx` 작성**

```tsx
// app/bom/layout.tsx
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import anssilLogo from '../../resource/ANSSil_logo_final_B.png';
import { C, FONT } from './_components/ui';

const TABS = [
    { href: '/bom/products', label: '상품 / BOM' },
    { href: '/bom/items', label: '품목' },
    { href: '/bom/avl', label: 'AVL(협력사·단가)' },
    { href: '/bom/vendors', label: '협력사' },
    { href: '/bom/employees', label: '담당자' },
    { href: '/bom/import', label: '엑셀' },
];

export default function BomLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const signOut = async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh(); };
    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
            <header style={{ background: '#fff', borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => router.push('/hub')} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 20, background: 'rgba(79,70,229,0.08)', color: C.primary, border: '1px solid rgba(79,70,229,0.15)', cursor: 'pointer' }}>🏠 홈</button>
                        <Image src={anssilLogo} alt="ANSSil" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>BOM / 개발관리</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(5,150,105,0.06)', color: C.green, border: '1px solid rgba(5,150,105,0.12)' }}>1차</span>
                    </div>
                    <button onClick={signOut} style={{ fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: C.red, border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer' }}>로그아웃</button>
                </div>
                <nav style={{ display: 'flex', gap: 4, padding: '0 32px', borderTop: `1px solid #f1f5f9` }}>
                    {TABS.map(t => {
                        const active = pathname === t.href || pathname.startsWith(t.href + '/');
                        return <Link key={t.href} href={t.href} style={{ padding: '10px 14px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.primary : C.sub, borderBottom: active ? `3px solid ${C.primary}` : '3px solid transparent', textDecoration: 'none' }}>{t.label}</Link>;
                    })}
                </nav>
            </header>
            <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1400, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>{children}</main>
        </div>
    );
}
```

```tsx
// app/bom/page.tsx — 대시보드는 2차. 1차는 상품 목록으로 보낸다.
import { redirect } from 'next/navigation';
export default function BomIndex() { redirect('/bom/products'); }
```

- [ ] **Step 7: 허브 카드와 미들웨어 수정**

`app/hub/page.tsx`의 `MENU_ITEMS` 배열 끝에 추가:
```ts
    {
        id: 'bom',
        title: 'BOM / 개발관리',
        subtitle: '상품별 부품 구성·협력사·단가 관리',
        icon: '🧩',
        gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
        href: '/bom/products',
        features: ['위자드 결과를 BOM으로 저장', '품목·협력사·AVL 단가 관리', '엑셀 템플릿 가져오기/내보내기'],
    },
```
같은 파일에서 카드 컨테이너 `maxWidth: 900`을 `maxWidth: 1240`으로 바꾼다(카드 3개).

`middleware.ts`: `const protectedPaths = ['/builder', '/hub', '/designer', '/3d-test'];` → `['/builder', '/hub', '/designer', '/3d-test', '/bom'];`

- [ ] **Step 8: 검증** — Run: `npx tsc --noEmit && npm test && npm run build`. Expected: 오류 없음, 테스트 74건 통과, 빌드 출력에 `/bom`, `/bom/products`는 아직 없음(T2) — `/bom` 만 나열.
컨트롤러 확인: 브라우저에서 `/hub` 카드 3개 → "BOM / 개발관리" 클릭 → `/bom/products` 404(아직 없음)는 정상. `/bom` 접근 시 미로그인이면 `/login`으로 리다이렉트.

- [ ] **Step 9: 커밋**
```bash
git add app/lib/bom/client.ts app/lib/bom/__tests__/client.test.ts app/bom app/hub/page.tsx middleware.ts
git commit -m "feat(bom-ui): API 클라이언트, /bom 레이아웃·공통 UI, 허브 카드, 보호 경로 추가"
```

---

### Task 2: 상품 목록 + 상품 상세 (BOM 트리, 단가 배지, 삭제)

**Files:**
- Create: `app/bom/products/page.tsx`, `app/bom/products/[code]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/bom/products?model_code=&status=` → `{ model_code, products: Product[] }[]`; `GET /api/bom/products/{code}` → `{ product, lines, tree }` (tree: level-1 노드 + `children`); `GET /api/bom/products/{code}/quote` → `QuoteResult & { lines: (PricedLine & { name })[] }`; `DELETE /api/bom/products/{code}`; `PATCH /api/bom/products/{code}`.
- Produces: 상세 페이지에 T3(견적서 버튼), T4(위자드로 열기), T5(개발요청서) 버튼이 붙을 자리 — `actions` 영역(`PageTitle right`). 이 Task에서는 `삭제`, `목록` 버튼만 둔다.

- [ ] **Step 1: `app/bom/products/page.tsx` 작성**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bomApi, errMsg } from '../../lib/bom/client';
import { Card, Table, Badge, Btn, Spinner, ErrorBox, PageTitle, Select, C } from '../_components/ui';

interface Product { product_code: string; model_code: string; name: string; family: string | null; status: string; size_preset_id: string; width_mm: number; depth_mm: number; is_dual: boolean; updated_at: string }
interface Group { model_code: string; products: Product[] }

const STATUS_TONE: Record<string, 'muted' | 'info' | 'ok' | 'danger'> = { '기획': 'muted', '개발': 'info', '양산': 'ok', '단종': 'danger' };

export default function ProductsPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('');

    useEffect(() => {
        setGroups(null);
        bomApi<Group[]>(`/products${status ? `?status=${encodeURIComponent(status)}` : ''}`).then(setGroups).catch(e => setError(errMsg(e)));
    }, [status]);

    return (
        <>
            <PageTitle title="상품 / BOM" desc="위자드에서 저장한 상품과 엑셀로 가져온 상품. 모델 코드별로 사이즈 상품을 묶어 보여줍니다."
                right={<>
                    <Select value={status} onChange={e => setStatus(e.target.value)}><option value="">전체 상태</option>{['기획', '개발', '양산', '단종'].map(s => <option key={s}>{s}</option>)}</Select>
                    <Btn variant="primary" onClick={() => router.push('/builder')}>+ 위자드에서 새 상품</Btn>
                </>} />
            <ErrorBox error={error} />
            {!groups && !error && <Spinner />}
            {groups && groups.length === 0 && <Card><div style={{ textAlign: 'center', color: C.sub, padding: 24 }}>상품이 없습니다. 위자드 9단계에서 저장하거나 엑셀 탭에서 가져오세요.</div></Card>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {groups?.map(g => (
                    <Card key={g.model_code}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{g.model_code}</span>
                            <span style={{ fontSize: 13, color: C.sub }}>{g.products[0]?.name}</span>
                            <Badge tone="info">{g.products.length} 사이즈</Badge>
                        </div>
                        <Table<Product> rowKey={p => p.product_code} rows={g.products} onRowClick={p => router.push(`/bom/products/${p.product_code}`)}
                            columns={[
                                { key: 'product_code', header: '상품코드', width: 180 },
                                { key: 'size', header: '사이즈', render: p => `${p.size_preset_id} (${p.width_mm}×${p.depth_mm})` },
                                { key: 'dual', header: '구조', render: p => p.is_dual ? 'Dual' : 'Single' },
                                { key: 'family', header: '상품군', render: p => p.family ?? '-' },
                                { key: 'status', header: '상태', render: p => <Badge tone={STATUS_TONE[p.status] ?? 'muted'}>{p.status}</Badge> },
                                { key: 'updated_at', header: '수정', render: p => new Date(p.updated_at).toLocaleDateString('ko-KR') },
                            ]} />
                    </Card>
                ))}
            </div>
        </>
    );
}
```

- [ ] **Step 2: `app/bom/products/[code]/page.tsx` 작성**

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bomApi, errMsg } from '../../../lib/bom/client';
import type { QuoteResult, PricedLine } from '../../../lib/bom/types';
import { Card, Table, Badge, Btn, Spinner, ErrorBox, PageTitle, fmtWon, C } from '../../_components/ui';

export interface BomLineRow { product_code: string; item_no: string; level: number; parent_item_no: string | null; quantity: number; required: string; alt_item_no: string | null; spec_text: string | null; note: string | null; source: string; items: { name: string; unit: string; category: string; revision: string } | null }
export interface ProductRow { product_code: string; model_code: string; name: string; family: string | null; status: string; size_preset_id: string; width_mm: number; depth_mm: number; is_dual: boolean; delivery_option: string | null; design_snapshot: unknown; note: string | null; cover_split_count: number }
export interface ProductDetail { product: ProductRow; lines: BomLineRow[]; tree: (BomLineRow & { children: BomLineRow[] })[] }
type Quote = QuoteResult & { lines: (PricedLine & { name: string })[] };

export default function ProductDetailPage() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const [detail, setDetail] = useState<ProductDetail | null>(null);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setError(null);
        Promise.all([bomApi<ProductDetail>(`/products/${code}`), bomApi<Quote>(`/products/${code}/quote`)])
            .then(([d, q]) => { setDetail(d); setQuote(q); })
            .catch(e => setError(errMsg(e)));
    }, [code]);
    useEffect(load, [load]);

    const onDelete = async () => {
        if (!detail || !confirm(`${detail.product.product_code} 상품과 BOM을 삭제합니다. 계속할까요?`)) return;
        try { await bomApi(`/products/${code}`, { method: 'DELETE' }); router.push('/bom/products'); } catch (e) { setError(errMsg(e)); }
    };

    if (error && !detail) return <ErrorBox error={error} />;
    if (!detail) return <Spinner />;
    const p = detail.product;
    const priced = new Map(quote?.lines.map(l => [l.item_no, l]) ?? []);

    return (
        <>
            <PageTitle title={`${p.product_code} · ${p.name}`} desc={`모델 ${p.model_code} · ${p.size_preset_id} ${p.width_mm}×${p.depth_mm} · ${p.is_dual ? 'Dual' : 'Single'} · 상태 ${p.status}`}
                right={<>
                    <Btn variant="ghost" onClick={() => router.push('/bom/products')}>← 목록</Btn>
                    <Btn variant="danger" onClick={onDelete}>삭제</Btn>
                </>} />
            <ErrorBox error={error} />
            {p.note && <Card style={{ marginBottom: 16, borderColor: '#fcd34d', background: '#fffbeb' }}><span style={{ fontSize: 12, color: '#92400e' }}>⚠ {p.note}</span></Card>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                <Card>
                    <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>BOM 트리</h3>
                    <Table<BomLineRow> rowKey={l => l.item_no} rows={detail.tree.flatMap(n => [n, ...n.children])}
                        columns={[
                            { key: 'item_no', header: '품번', width: 110, render: l => <span style={{ paddingLeft: l.level === 2 ? 18 : 0, fontWeight: l.level === 1 ? 800 : 500 }}>{l.level === 2 && '└ '}{l.item_no}</span> },
                            { key: 'name', header: '품명', render: l => l.items?.name ?? <Badge tone="danger">품목 없음</Badge> },
                            { key: 'quantity', header: '수량', width: 60, align: 'right', render: l => `${l.quantity}${l.items?.unit && l.items.unit !== '-' ? ' ' + l.items.unit : ''}` },
                            { key: 'spec_text', header: '규격', render: l => l.spec_text ?? '' },
                            { key: 'required', header: '구분', width: 60, render: l => l.level === 1 ? '' : <Badge tone={l.required === '옵션' ? 'warn' : 'muted'}>{l.required}</Badge> },
                            { key: 'price', header: '단가(승인 AVL)', width: 150, align: 'right', render: l => {
                                if (l.level === 1) return '';
                                const q = priced.get(l.item_no);
                                if (!q) return '-';
                                return q.warning ? <Badge tone="warn">{q.warning}</Badge> : <span>{fmtWon(q.total)} <span style={{ color: C.sub, fontSize: 10 }}>{q.vendor_code}</span></span>;
                            } },
                        ]} />
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card>
                        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>견적 합계 (이 사이즈)</h3>
                        {!quote ? <Spinner /> : <>
                            <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{fmtWon(quote.total)}</div>
                            <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>배송: {quote.delivery.option ?? '-'} {fmtWon(quote.delivery.price)}</div>
                            <div style={{ marginTop: 8 }}>{quote.incomplete ? <Badge tone="warn">불완전 견적 — 경고 {quote.warnings.length}건</Badge> : <Badge tone="ok">단가 전부 승인됨</Badge>}</div>
                            {quote.warnings.length > 0 && <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 11, color: '#b45309' }}>{quote.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
                        </>}
                    </Card>
                    <Card>
                        <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: C.text }}>문서 / 작업</h3>
                        <div id="product-actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* T3: 견적서(모델 전체) · T4: 위자드로 열기 · T5: 개발요청서 버튼이 여기에 붙는다 */}
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
}
```

- [ ] **Step 3: 검증** — Run: `npx tsc --noEmit`. 컨트롤러 확인: `/bom/products`에 MAT-001/002 그룹이 보이고, 행 클릭 → 상세에 BOM 트리(레벨1 굵게, 레벨2 들여쓰기)와 단가 배지(`통화 USD 환산 불가` 경고 포함)와 견적 합계 193,007원이 보인다. 삭제는 실행하지 않는다.

- [ ] **Step 4: 커밋**
```bash
git add app/bom/products
git commit -m "feat(bom-ui): 상품 목록(모델별 그룹)과 상품 상세(BOM 트리·AVL 단가 배지) 화면 추가"
```

---

### Task 3: 견적서 생성 다이얼로그, DB 기반 PricingPanel, 레거시 견적 경로 제거

**Files:**
- Create: `app/lib/bom/useAvlPricing.ts`, `app/bom/products/[code]/QuoteDialog.tsx`
- Modify: `app/components/PricingPanel.tsx` (전면 교체), `app/bom/products/[code]/page.tsx` (버튼 연결), `app/builder/page.tsx` (단가 관리 버튼·모달·CompletionModal 제거)
- Delete: `app/components/PricingManageModal.tsx`, `app/components/CompletionModal.tsx`, `app/components/QuoteConditionModal.tsx`, `app/lib/quoteHandlers.ts`, `app/api/quote/generate/route.ts`

**Interfaces:**
- Consumes: `GET /api/bom/avl` → AVL 행(`item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps, currency` + 조인), `POST /api/bom/documents/quote` body `{ model_code, title?, condition? }` → `{ doc_id, url, file_path, warnings, sizes }`, `GET /api/bom/products?model_code=` (사이즈별 상품), `GET /api/bom/products/{code}/quote`.
- Consumes: `buildBom`, `priceBom`, `DELIVERY_PRICES` (1A), `useDesignStore`, `SIZE_PRESETS`.
- Produces: `useAvlPricing(): { rows: AvlPriceRow[] | null; error: string | null; reload(): void }` (모듈 레벨 캐시로 페이지 내 1회 로드), `quoteFromDesign(design, size, avlRows): QuoteResult`.

- [ ] **Step 1: `app/lib/bom/useAvlPricing.ts` 작성**

```ts
'use client';
// AVL 행을 한 번 받아 두고, 위자드 상태를 그 자리에서 견적으로 계산하는 훅
import { useCallback, useEffect, useState } from 'react';
import { bomApi, errMsg } from './client';
import { buildBom } from './bomBuilder';
import { priceBom } from './pricing';
import type { AvlPriceRow, BomDesignInput, QuoteResult, SizeSpec } from './types';

let cache: AvlPriceRow[] | null = null;
let inflight: Promise<AvlPriceRow[]> | null = null;

async function loadRows(force = false): Promise<AvlPriceRow[]> {
    if (cache && !force) return cache;
    if (!inflight) {
        inflight = bomApi<AvlPriceRow[]>('/avl').then(r => { cache = r; inflight = null; return r; }).catch(e => { inflight = null; throw e; });
    }
    return inflight;
}

export function useAvlPricing() {
    const [rows, setRows] = useState<AvlPriceRow[] | null>(cache);
    const [error, setError] = useState<string | null>(null);
    const reload = useCallback((force = true) => { loadRows(force).then(setRows).catch(e => setError(errMsg(e))); }, []);
    useEffect(() => { if (!cache) reload(false); }, [reload]);
    return { rows, error, reload };
}

/** 위자드 상태 + 사이즈 → 견적 (저장 전 미리보기용). 배송은 deliveryId로 */
export function quoteFromDesign(design: BomDesignInput & { deliveryId: string | null }, size: SizeSpec, avlRows: AvlPriceRow[]): QuoteResult & { unmapped: { step: string; optionKey: string }[] } {
    const { lines, unmapped } = buildBom(design, size);
    return { ...priceBom(lines, avlRows, { width_mm: size.width_mm, delivery_option: design.deliveryId }), unmapped };
}
```

- [ ] **Step 2: `app/components/PricingPanel.tsx` 전면 교체** — 기존 파일 내용을 지우고 아래로 바꾼다. 위치·마진은 기존과 같게 유지(SpecSummary 하단).

```tsx
'use client';
// 설계 현황 아래 실시간 견적 — DB AVL 승인 단가 기준 (기존 localStorage 단가표 대체)
import React from 'react';
import { useDesignStore } from '../lib/store';
import { useAvlPricing, quoteFromDesign } from '../lib/bom/useAvlPricing';

const fmt = (n: number) => (n === 0 ? '-' : `₩${Math.round(n).toLocaleString('ko-KR')}`);

export default function PricingPanel() {
    const s = useDesignStore();
    const { rows, error } = useAvlPricing();

    const box: React.CSSProperties = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: 12 };
    if (error) return <div style={{ ...box, color: '#dc2626', fontSize: 12 }}>단가 조회 실패: {error}</div>;
    if (!rows) return <div style={{ ...box, color: '#94a3b8', fontSize: 12 }}>단가 불러오는 중…</div>;

    const q = quoteFromDesign(s, { size_preset_id: s.sizePresetId ?? 'CUSTOM', width_mm: s.customWidth, depth_mm: s.customDepth }, rows);
    const shown = q.lines.filter(l => l.total > 0 || l.warning);

    return (
        <div style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>💰 예상 단가 (AVL 승인 단가)</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>{fmt(q.total)}</span>
            </div>
            {q.unmapped.length > 0 && <div style={{ fontSize: 11, color: '#b45309', marginBottom: 8 }}>품번 미발급 옵션: {q.unmapped.map(u => `${u.step}(${u.optionKey})`).join(', ')} — 단가에 포함되지 않음</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                    {shown.map(l => (
                        <tr key={l.item_no} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 4px', color: '#64748b', width: 80 }}>{l.item_no}</td>
                            <td style={{ padding: '6px 4px', color: '#0f172a' }}>{l.quantity > 1 ? `×${l.quantity}` : ''}</td>
                            <td style={{ padding: '6px 4px', textAlign: 'right', color: l.warning ? '#b45309' : '#0f172a', fontWeight: 600 }}>{l.warning ?? fmt(l.total)}</td>
                        </tr>
                    ))}
                    {q.delivery.price > 0 && <tr><td style={{ padding: '6px 4px', color: '#64748b' }}>배송</td><td /><td style={{ padding: '6px 4px', textAlign: 'right' }}>{fmt(q.delivery.price)}</td></tr>}
                </tbody>
            </table>
            {q.incomplete && <div style={{ fontSize: 11, color: '#b45309', marginTop: 8 }}>⚠ 일부 부품에 승인 단가가 없어 합계가 불완전합니다. AVL 탭에서 단가를 승인하세요.</div>}
        </div>
    );
}
```

- [ ] **Step 3: `app/bom/products/[code]/QuoteDialog.tsx` 작성**

```tsx
'use client';
// 모델(model_code) 전체 사이즈 견적서 xlsx 생성 — 조건(노무·재료·판매·마진 %) 입력 후 서버에서 생성·Storage 저장
import { useEffect, useMemo, useState } from 'react';
import { bomApi, errMsg } from '../../../lib/bom/client';
import { Modal, Field, TextInput, Btn, ErrorBox, Table, fmtWon, C } from '../../_components/ui';

interface Condition { laborRate: number; materialRate: number; salesRate: number; marginRate: number }
interface SizeCost { product_code: string; label: string; cost: number; incomplete: boolean }
interface Props { modelCode: string; title: string; onClose: () => void }

export default function QuoteDialog({ modelCode, title, onClose }: Props) {
    const [cond, setCond] = useState<Condition>({ laborRate: 0, materialRate: 0, salesRate: 0, marginRate: 0 });
    const [costs, setCosts] = useState<SizeCost[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ url: string | null; file_path: string; warnings: string[] } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const groups = await bomApi<{ model_code: string; products: { product_code: string; size_preset_id: string }[] }[]>(`/products?model_code=${encodeURIComponent(modelCode)}`);
                const prods = groups[0]?.products ?? [];
                const quotes = await Promise.all(prods.map(p => bomApi<{ total: number; incomplete: boolean }>(`/products/${p.product_code}/quote`)));
                setCosts(prods.map((p, i) => ({ product_code: p.product_code, label: p.size_preset_id, cost: quotes[i].total, incomplete: quotes[i].incomplete })));
            } catch (e) { setError(errMsg(e)); }
        })();
    }, [modelCode]);

    const finalOf = useMemo(() => (cost: number) => Math.round(cost * (1 + (cond.laborRate + cond.materialRate + cond.salesRate) / 100) * (1 + cond.marginRate / 100)), [cond]);
    const set = (k: keyof Condition) => (e: React.ChangeEvent<HTMLInputElement>) => setCond(c => ({ ...c, [k]: parseFloat(e.target.value) || 0 }));

    const generate = async () => {
        setBusy(true); setError(null);
        try {
            const r = await bomApi<{ url: string | null; file_path: string; warnings: string[] }>('/documents/quote', { method: 'POST', json: { model_code: modelCode, title, condition: cond } });
            setResult(r);
            if (r.url) window.open(r.url, '_blank');
        } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };

    return (
        <Modal title={`📊 견적서 생성 — ${modelCode}`} onClose={onClose}>
            <p style={{ fontSize: 12, color: C.sub, margin: '0 0 12px' }}>모델의 모든 사이즈가 한 장에 들어갑니다. 원가는 AVL 승인 단가 기준이며 아래 비율을 적용한 금액이 견적서에 기록됩니다.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                <Field label="노무비율 %"><TextInput type="number" value={cond.laborRate} onChange={set('laborRate')} /></Field>
                <Field label="재료비율 %"><TextInput type="number" value={cond.materialRate} onChange={set('materialRate')} /></Field>
                <Field label="판매비율 %"><TextInput type="number" value={cond.salesRate} onChange={set('salesRate')} /></Field>
                <Field label="마진율 %"><TextInput type="number" value={cond.marginRate} onChange={set('marginRate')} /></Field>
            </div>
            <ErrorBox error={error} />
            {costs && <Table<SizeCost> rowKey={c => c.product_code} rows={costs} columns={[
                { key: 'label', header: '사이즈' }, { key: 'product_code', header: '상품코드' },
                { key: 'cost', header: '원가', align: 'right', render: c => fmtWon(c.cost) },
                { key: 'final', header: '견적가', align: 'right', render: c => <b>{fmtWon(finalOf(c.cost))}</b> },
                { key: 'incomplete', header: '', render: c => c.incomplete ? <span style={{ color: '#b45309', fontSize: 11 }}>⚠ 불완전</span> : '' },
            ]} />}
            {result && <div style={{ marginTop: 12, fontSize: 12, color: C.green }}>저장됨: {result.file_path} {result.url && <a href={result.url} target="_blank" rel="noreferrer" style={{ color: C.primary, marginLeft: 8 }}>다시 열기</a>}{result.warnings.length > 0 && <div style={{ color: '#b45309', marginTop: 4 }}>경고 {result.warnings.length}건이 포함되어 있습니다.</div>}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <Btn variant="ghost" onClick={onClose}>닫기</Btn>
                <Btn variant="primary" onClick={generate} disabled={busy || !costs}>{busy ? '생성 중…' : '견적서 xlsx 생성'}</Btn>
            </div>
        </Modal>
    );
}
```

- [ ] **Step 4: 상세 페이지에 견적서 버튼 연결** — `app/bom/products/[code]/page.tsx`에 `import QuoteDialog from './QuoteDialog';`, 상태 `const [quoteOpen, setQuoteOpen] = useState(false);`, `#product-actions` 안에 `<Btn variant="primary" onClick={() => setQuoteOpen(true)}>📊 견적서 (모델 전체 사이즈)</Btn>`, 컴포넌트 끝에 `{quoteOpen && <QuoteDialog modelCode={p.model_code} title={p.name} onClose={() => setQuoteOpen(false)} />}`.

- [ ] **Step 5: 레거시 제거**
- `git rm app/components/PricingManageModal.tsx app/components/CompletionModal.tsx app/components/QuoteConditionModal.tsx app/lib/quoteHandlers.ts app/api/quote/generate/route.ts`
- `app/builder/page.tsx`: import 3줄(`DevelopmentRequestModal`은 유지, `PricingManageModal`·`CompletionModal` 제거), 상태 `isCompletionOpen`·`isPricingOpen` 제거, 헤더의 `💰 단가 관리` 버튼 제거, 하단 모달 렌더 2개(`CompletionModal`, `PricingManageModal`) 제거. 마지막 단계 버튼의 `else` 분기(검증 후 `setIsCompletionOpen(true)`)는 T4에서 9단계로 대체하므로 이 Task에서는 `alert('9단계에서 상품을 저장하세요.')`로 임시 교체한다.
- 남은 참조 검색: `grep -rn "PricingManageModal\|CompletionModal\|QuoteConditionModal\|quoteHandlers\|usePricingStore" app --include=*.tsx --include=*.ts | grep -v __tests__ | grep -v "app/lib/pricingStore.ts"` → 결과 없음이어야 한다.

- [ ] **Step 6: 검증** — Run: `npx tsc --noEmit && npm test`. 컨트롤러 확인: `/builder`에서 스텝을 진행하면 2D 화면 하단 예상 단가가 DB 단가로 표시되고(프리미엄 LK 예시 871,025원), 헤더에 단가 관리 버튼이 없다. 상품 상세에서 견적서 버튼 → 다이얼로그에 사이즈별 원가 → 생성 → 새 탭에 xlsx 다운로드.

- [ ] **Step 7: 커밋**
```bash
git add -A app/components/PricingPanel.tsx app/lib/bom/useAvlPricing.ts app/bom/products app/builder/page.tsx app/components app/lib/quoteHandlers.ts app/api/quote
git commit -m "refactor(bom-ui): 견적 표시를 AVL 단가로 전환, 모델 견적서 다이얼로그 추가, localStorage 단가 관리·레거시 견적 경로 제거"
```

---

### Task 4: 위자드 9단계 "BOM 확인" + 상세의 "위자드로 열기"

**Files:**
- Create: `app/components/steps/StepBomConfirm.tsx`
- Modify: `app/lib/constants.ts` (`WIZARD_STEPS`에 9단계), `app/lib/store.ts` (`nextStep` 상한 9), `app/components/StepIndicator.tsx` (case 9), `app/builder/page.tsx` (case 9, 마지막 단계 버튼), `app/bom/products/[code]/page.tsx` (위자드로 열기 버튼)

**Interfaces:**
- Consumes: `buildBom`, `useAvlPricing/quoteFromDesign` (T3), `POST /api/bom/products/from-design` body `{ model_code?, name, family?, sizes, design, snapshot }` → `{ product_codes, model_code, unmapped }`, `useDesignStore.loadFromPreset(state)`.
- Produces: 9단계 저장 완료 시 `router.push('/bom/products/<first code>')`.

- [ ] **Step 1: 상수·스토어·인디케이터 수정**
- `app/lib/constants.ts` `WIZARD_STEPS` 배열 끝에 `{ id: 9, title: 'BOM 확인', icon: '🧩', description: '선택 결과를 품번 기반 BOM으로 확인하고 상품으로 저장하세요' },`
- `app/lib/store.ts` 229행: `Math.min(s.currentStep + 1, 8)` → `Math.min(s.currentStep + 1, 9)`
- `app/components/StepIndicator.tsx` `getStepText`에 `case 9: return currentStep >= 9 ? '저장 대기' : '-';` 추가(`default` 위).

- [ ] **Step 2: `app/components/steps/StepBomConfirm.tsx` 작성**

```tsx
'use client';
// 위자드 9단계: BOM 미리보기 → 모델코드·상품명·사이즈 선택 → 상품 저장
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDesignStore, type DesignState } from '../../lib/store';
import { SIZE_PRESETS } from '../../lib/constants';
import { buildBom } from '../../lib/bom/bomBuilder';
import { useAvlPricing, quoteFromDesign } from '../../lib/bom/useAvlPricing';
import { bomApi, errMsg } from '../../lib/bom/client';
import type { SizeSpec } from '../../lib/bom/types';

const fmt = (n: number) => `₩${Math.round(n).toLocaleString('ko-KR')}`;

/** 스냅샷에서 무거운 필드(AI 이미지·텍스처 data URL)를 뺀다. 복원 시 loadFromPreset이 기본값으로 채운다 */
export function lightSnapshot(s: DesignState): Omit<DesignState, 'currentStep' | 'defaultTextures' | 'customCoverImages' | 'upperCoverTextures' | 'lowerCoverTextures' | 'upperCoverCoords' | 'lowerCoverCoords' | 'coverExtractSourceImage'> {
    const { currentStep, defaultTextures, customCoverImages, upperCoverTextures, lowerCoverTextures, upperCoverCoords, lowerCoverCoords, coverExtractSourceImage, ...rest } = s; // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest;
}

export default function StepBomConfirm() {
    const s = useDesignStore();
    const router = useRouter();
    const { rows: avl } = useAvlPricing();
    const [modelCode, setModelCode] = useState('');
    const [name, setName] = useState(s.title || '');
    const [family, setFamily] = useState('에어매트리스');
    const [sizeIds, setSizeIds] = useState<string[]>(s.sizePresetId ? [s.sizePresetId] : []);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentSize: SizeSpec = { size_preset_id: s.sizePresetId ?? 'CUSTOM', width_mm: s.customWidth, depth_mm: s.customDepth };
    const preview = useMemo(() => buildBom(s, currentSize), [s, currentSize.width_mm, currentSize.depth_mm]);
    const quote = avl ? quoteFromDesign(s, currentSize, avl) : null;
    const missing: string[] = [];
    if (!s.coreId) missing.push('스트링'); if (!s.coverId) missing.push('커버'); if (!s.controllerId) missing.push('컨트롤러');
    if (!s.packagingId) missing.push('포장'); if (!s.deliveryId) missing.push('배송');

    const toggleSize = (id: string) => setSizeIds(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);

    const save = async () => {
        if (!name.trim()) { setError('상품명을 입력하세요.'); return; }
        if (sizeIds.length === 0) { setError('사이즈를 1개 이상 선택하세요.'); return; }
        if (modelCode && !/^[A-Z0-9]+-[A-Z0-9]+$/.test(modelCode)) { setError('모델코드 형식: MAT-001 처럼 영대문자/숫자-영대문자/숫자'); return; }
        setBusy(true); setError(null);
        try {
            const sizes: SizeSpec[] = sizeIds.map(id => { const p = SIZE_PRESETS.find(x => x.id === id)!; return { size_preset_id: p.id, width_mm: p.width, depth_mm: p.depth }; });
            const snapshot = lightSnapshot(s); // 이미지·텍스처(base64)는 제외
            const r = await bomApi<{ product_codes: string[]; model_code: string }>('/products/from-design', {
                method: 'POST', json: { model_code: modelCode || undefined, name: name.trim(), family: family || undefined, sizes, design: { ...snapshot, deliveryId: s.deliveryId }, snapshot },
            });
            router.push(`/bom/products/${r.product_codes[0]}`);
        } catch (e) { setError(errMsg(e)); setBusy(false); }
    };

    const box: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 12 };
    const input: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' };

    return (
        <div>
            {missing.length > 0 && <div style={{ ...box, borderColor: '#fca5a5', background: '#fef2f2', color: '#b91c1c', fontSize: 12 }}>미선택 단계: {missing.join(', ')} — 저장 전에 선택하세요.</div>}
            {preview.unmapped.length > 0 && <div style={{ ...box, borderColor: '#fcd34d', background: '#fffbeb', color: '#92400e', fontSize: 12 }}>⚠ 품번 미발급 옵션(커스텀): {preview.unmapped.map(u => `${u.step}=${u.optionKey}`).join(', ')}. BOM에서 제외되고 상품 비고에 기록됩니다.</div>}

            <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>BOM 미리보기 ({currentSize.size_preset_id} 기준 · {preview.lines.filter(l => l.level === 2).length}개 부품)</div>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}><tbody>
                    {preview.lines.map(l => (
                        <tr key={l.item_no} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '4px 2px', fontWeight: l.level === 1 ? 800 : 500, paddingLeft: l.level === 2 ? 14 : 2, color: l.level === 1 ? '#0f172a' : '#334155' }}>{l.level === 2 && '└ '}{l.item_no}</td>
                            <td style={{ padding: '4px 2px', textAlign: 'right', color: '#64748b' }}>{l.level === 2 ? `×${l.quantity}` : ''}</td>
                            <td style={{ padding: '4px 2px', color: '#94a3b8' }}>{l.spec_text ?? ''}</td>
                        </tr>
                    ))}
                </tbody></table>
                {quote && <div style={{ marginTop: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>예상 단가 (이 사이즈)</span><b style={{ color: '#4f46e5' }}>{fmt(quote.total)}{quote.incomplete ? ' ⚠' : ''}</b></div>}
            </div>

            <div style={box}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>상품으로 저장</div>
                <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ fontSize: 12, color: '#64748b' }}>모델코드 <span style={{ color: '#94a3b8' }}>(비우면 MAT-### 자동 채번)</span><input style={input} value={modelCode} onChange={e => setModelCode(e.target.value.toUpperCase())} placeholder="MAT-001" /></label>
                    <label style={{ fontSize: 12, color: '#64748b' }}>상품명<input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="예: 에어매트리스 A" /></label>
                    <label style={{ fontSize: 12, color: '#64748b' }}>상품군<input style={input} value={family} onChange={e => setFamily(e.target.value)} /></label>
                    <div style={{ fontSize: 12, color: '#64748b' }}>사이즈 (선택한 수만큼 상품이 생성됩니다)
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {SIZE_PRESETS.map(p => {
                                const on = sizeIds.includes(p.id);
                                return <button key={p.id} type="button" onClick={() => toggleSize(p.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 14, border: `1px solid ${on ? '#4f46e5' : '#e2e8f0'}`, background: on ? '#e0e7ff' : '#fff', color: on ? '#3730a3' : '#64748b', cursor: 'pointer' }}>{p.label} {p.width}×{p.depth}</button>;
                            })}
                        </div>
                    </div>
                </div>
                {error && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
                <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={save} disabled={busy || missing.length > 0}>{busy ? '저장 중…' : `상품 저장 (${sizeIds.length}개 사이즈)`}</button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: `app/builder/page.tsx` 수정**
- `import StepBomConfirm from '../components/steps/StepBomConfirm';`
- `renderStepContent`에 `case 9: return <StepBomConfirm />;`
- 하단 버튼: `currentStep < WIZARD_STEPS.length`이면 기존처럼 `nextStep()`; 마지막 단계(9)에서는 "다음 단계" 버튼을 렌더하지 않는다(저장 버튼은 9단계 컴포넌트 안에 있음). 즉 `{currentStep < WIZARD_STEPS.length && (<button … className="btn-primary" style={{ flex: 2 }} onClick={nextStep}>다음 단계</button>)}`. T3에서 넣은 임시 `alert` 분기는 제거.
- 8단계에서 9단계로 넘어갈 때 기존 검증(미선택 항목 alert)을 유지하려면 `nextStep` 호출 전에 `currentStep === 8`일 때만 기존 `missing` 검사를 실행하고 통과 시 `nextStep()`.

- [ ] **Step 4: 상세 페이지 "위자드로 열기"** — `app/bom/products/[code]/page.tsx` `#product-actions`에:
```tsx
<Btn onClick={() => {
    const snap = p.design_snapshot as Record<string, unknown> | null;
    if (!snap || !('coreId' in snap)) { alert('이 상품에는 위자드 스냅샷이 없습니다 (엑셀로 가져온 상품).'); return; }
    useDesignStore.getState().loadFromPreset(restoreSnapshot(snap, p));
    router.push('/builder');
}}>🧭 위자드로 열기</Btn>
```
같은 파일 상단에 헬퍼를 둔다(스냅샷은 `lightSnapshot`으로 저장되어 이미지·텍스처 필드가 없으므로 기본값을 채운다):
```ts
import { useDesignStore, type DesignState } from '../../../lib/store';
const EMPTY_TEX = { top: null, front: null, side: null };
export function restoreSnapshot(snap: Record<string, unknown>, p: ProductRow): Omit<DesignState, 'currentStep'> {
    return {
        ...(snap as unknown as Omit<DesignState, 'currentStep'>),
        title: p.name, sizePresetId: p.size_preset_id, customWidth: p.width_mm, customDepth: p.depth_mm, isDual: p.is_dual,
        customCoverImages: {}, upperCoverTextures: EMPTY_TEX, lowerCoverTextures: EMPTY_TEX, upperCoverCoords: null, lowerCoverCoords: null,
        coverExtractSourceImage: { upper: null, lower: null }, defaultTextures: useDesignStore.getState().defaultTextures,
    };
}
```

- [ ] **Step 5: 검증** — Run: `npx tsc --noEmit && npm test && npm run build`. 컨트롤러 확인: `/builder` 1~8단계 선택 후 "다음 단계" → 9단계에 BOM 미리보기·예상 단가 표시 → 사이즈 2개 선택 → 저장 → 상세 페이지로 이동, 목록에 새 모델 표시. 상세의 "위자드로 열기" → `/builder`에 선택값 복원. 확인 후 생성한 테스트 상품은 상세의 삭제 버튼으로 지운다.

- [ ] **Step 6: 커밋**
```bash
git add app/components/steps/StepBomConfirm.tsx app/lib/constants.ts app/lib/store.ts app/components/StepIndicator.tsx app/builder/page.tsx app/bom/products
git commit -m "feat(bom-ui): 위자드 9단계 BOM 확인·상품 저장, 상품 상세에서 위자드로 다시 열기"
```

---

### Task 5: 개발요청서에 BOM 표 섹션 + 상품 상세 연결

**Files:**
- Modify: `app/components/DevelopmentRequestModal.tsx` (선택적 `bom` prop, 6번 섹션), `app/bom/products/[code]/page.tsx` (버튼)

**Interfaces:**
- Produces: `DevelopmentRequestModalProps { onClose(); bom?: { product_code: string; lines: BomLineRow[] } }`. `bom`이 있으면 2페이지 끝에 "6. BOM (자재명세)" 표를 렌더한다. 없으면(빌더에서 열 때) 기존과 동일.

- [ ] **Step 1: `DevelopmentRequestModal.tsx` 수정**
- Props에 `bom?: { product_code: string; lines: { item_no: string; level: number; parent_item_no: string | null; quantity: number; required: string; spec_text: string | null; items: { name: string; unit: string; category: string; revision: string } | null }[] }` 추가.
- 5번 섹션(특이사항) 다음, 같은 페이지 컨테이너 안에 아래 JSX를 추가(스타일은 파일의 `SECTION_TITLE`, `cellBase` 재사용):
```tsx
{bom && (
    <section style={{ marginTop: 24 }}>
        <h2 style={SECTION_TITLE}>6. BOM (자재명세) — {bom.product_code}</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f1f5f9' }}>
                {['레벨', '품번', '품명', '수량', '단위', '규격', '구분', 'Rev.'].map(h => <th key={h} style={{ ...cellBase, fontWeight: 800, textAlign: 'left' }}>{h}</th>)}
            </tr></thead>
            <tbody>
                {bom.lines.map(l => (
                    <tr key={l.item_no} style={{ background: l.level === 1 ? '#f8fafc' : '#fff' }}>
                        <td style={cellBase}>{l.level}</td>
                        <td style={{ ...cellBase, paddingLeft: l.level === 2 ? 28 : 14, fontWeight: l.level === 1 ? 800 : 500 }}>{l.item_no}</td>
                        <td style={cellBase}>{l.items?.name ?? '-'}</td>
                        <td style={{ ...cellBase, textAlign: 'right' }}>{l.level === 2 ? l.quantity : ''}</td>
                        <td style={cellBase}>{l.items?.unit ?? ''}</td>
                        <td style={cellBase}>{l.spec_text ?? ''}</td>
                        <td style={cellBase}>{l.level === 2 ? l.required : ''}</td>
                        <td style={cellBase}>{l.items?.revision ?? ''}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </section>
)}
```
- 헤더의 `Project:` 표기에 `bom`이 있으면 `{bom.product_code} — ` 접두어를 붙인다.

- [ ] **Step 2: 상세 페이지 버튼** — `app/bom/products/[code]/page.tsx`: `import DevelopmentRequestModal from '../../../components/DevelopmentRequestModal';`, 상태 `devOpen`, `#product-actions`에 `<Btn onClick={openDev}>📄 개발요청서</Btn>`. `openDev`는 스냅샷이 있으면 T4와 같은 방식으로 `loadFromPreset`을 먼저 호출해 도면·3D가 이 상품 사양으로 그려지게 한 뒤 `setDevOpen(true)`; 스냅샷이 없으면 스토어를 건드리지 않고 그대로 연다(BOM 표만 유효). 렌더: `{devOpen && <DevelopmentRequestModal onClose={() => setDevOpen(false)} bom={{ product_code: p.product_code, lines: detail.lines }} />}`.

- [ ] **Step 3: 검증** — Run: `npx tsc --noEmit`. 컨트롤러 확인: 상세에서 개발요청서 → 모달 마지막에 "6. BOM" 표(레벨1 회색 배경, 레벨2 들여쓰기) 표시, 인쇄 미리보기에서도 보임. `/builder`에서 여는 기존 개발요청서는 변화 없음.

- [ ] **Step 4: 커밋**
```bash
git add app/components/DevelopmentRequestModal.tsx app/bom/products
git commit -m "feat(bom-ui): 개발요청서에 BOM 자재명세 섹션 추가 및 상품 상세에서 열기"
```

---

### Task 6: 마스터 화면 3종 (품목 / 협력사 / 담당자) — 공용 MasterTable

**Files:**
- Create: `app/bom/_components/MasterTable.tsx`, `app/bom/items/page.tsx`, `app/bom/vendors/page.tsx`, `app/bom/employees/page.tsx`

**Interfaces:**
- Consumes: `GET /api/bom/{items|vendors|employees}?q=&<col>=`, `POST` 생성, `PATCH /{id}`, `DELETE /{id}`(참조 중이면 409), `GET /api/bom/items/next-no?prefix=&start=&end=`, `GET /api/bom/code-values?code_type=`.
- Produces: `MasterTable<T>({ resource, pk, title, desc, fields, columns, searchPlaceholder, extraActions? })` — `fields`는 폼 정의 `{ key, label, type: 'text'|'number'|'select'|'textarea', options?: string[] | { codeType: string }, required?, readonlyOnEdit? }`.

- [ ] **Step 1: `app/bom/_components/MasterTable.tsx` 작성**

```tsx
'use client';
// 마스터 CRUD 공용 표 + 생성/수정 모달. 옵션은 code-values에서 가져올 수 있다.
import React, { useCallback, useEffect, useState } from 'react';
import { bomApi, errMsg, ApiError } from '../../lib/bom/client';
import { Card, Table, Btn, Modal, Field, TextInput, Select, Spinner, ErrorBox, PageTitle, type Column } from './ui';

export interface FieldDef { key: string; label: string; type?: 'text' | 'number' | 'select' | 'textarea'; options?: string[] | { codeType: string }; required?: boolean; readonlyOnEdit?: boolean; placeholder?: string }
type Row = Record<string, unknown>;

interface Props<T extends Row> {
    resource: 'items' | 'vendors' | 'employees'; pk: string; title: string; desc?: string;
    fields: FieldDef[]; columns: Column<T>[]; searchPlaceholder?: string;
    /** 생성 모달에서 pk 필드 옆에 붙는 버튼(예: 자동 채번) */
    pkHelper?: (draft: Row, setDraft: (d: Row) => void) => React.ReactNode;
    defaultDraft?: Row;
}

export default function MasterTable<T extends Row>({ resource, pk, title, desc, fields, columns, searchPlaceholder = '검색', pkHelper, defaultDraft = {} }: Props<T>) {
    const [rows, setRows] = useState<T[] | null>(null);
    const [q, setQ] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<{ mode: 'create' | 'edit'; draft: Row } | null>(null);
    const [codes, setCodes] = useState<Record<string, string[]>>({});
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setError(null);
        bomApi<T[]>(`/${resource}${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(setRows).catch(e => setError(errMsg(e)));
    }, [resource, q]);
    useEffect(load, [load]);

    // select 옵션 중 code-values 참조 로드
    useEffect(() => {
        const types = fields.flatMap(f => (f.options && !Array.isArray(f.options) ? [f.options.codeType] : []));
        Promise.all([...new Set(types)].map(t => bomApi<{ value: string }[]>(`/code-values?code_type=${t}`).then(v => [t, v.map(x => x.value)] as const)))
            .then(pairs => setCodes(Object.fromEntries(pairs))).catch(() => { /* 옵션 없이 텍스트 입력으로 대체 */ });
    }, [fields]);

    const submit = async () => {
        if (!editing) return;
        const d = editing.draft;
        for (const f of fields) if (f.required && (d[f.key] === undefined || d[f.key] === '')) { setError(`${f.label}은(는) 필수입니다.`); return; }
        setBusy(true); setError(null);
        try {
            if (editing.mode === 'create') await bomApi(`/${resource}`, { method: 'POST', json: d });
            else await bomApi(`/${resource}/${encodeURIComponent(String(d[pk]))}`, { method: 'PATCH', json: d });
            setEditing(null); load();
        } catch (e) { setError(e instanceof ApiError && e.status === 409 ? '이미 존재하는 코드입니다.' : errMsg(e)); }
        finally { setBusy(false); }
    };

    const remove = async (row: T) => {
        if (!confirm(`${String(row[pk])} 을(를) 삭제할까요?`)) return;
        try { await bomApi(`/${resource}/${encodeURIComponent(String(row[pk]))}`, { method: 'DELETE' }); load(); }
        catch (e) { setError(e instanceof ApiError && e.status === 409 ? '다른 데이터가 참조하고 있어 삭제할 수 없습니다.' : errMsg(e)); }
    };

    const renderField = (f: FieldDef) => {
        const d = editing!.draft;
        const val = (d[f.key] ?? '') as string | number;
        const set = (v: unknown) => setEditing(e => e && ({ ...e, draft: { ...e.draft, [f.key]: v } }));
        const ro = editing!.mode === 'edit' && (f.key === pk || f.readonlyOnEdit);
        const opts = Array.isArray(f.options) ? f.options : f.options ? codes[f.options.codeType] : undefined;
        return (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {f.type === 'select' && opts ? (
                        <Select value={String(val)} onChange={e => set(e.target.value)} disabled={ro} style={{ flex: 1 }}><option value="">선택</option>{opts.map(o => <option key={o}>{o}</option>)}</Select>
                    ) : f.type === 'textarea' ? (
                        <textarea value={String(val)} onChange={e => set(e.target.value)} rows={3} style={{ flex: 1, padding: 8, fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                    ) : (
                        <TextInput type={f.type === 'number' ? 'number' : 'text'} value={String(val)} placeholder={f.placeholder} disabled={ro} onChange={e => set(f.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} style={{ flex: 1 }} />
                    )}
                    {f.key === pk && editing!.mode === 'create' && pkHelper?.(d, nd => setEditing(e => e && ({ ...e, draft: nd })))}
                </div>
            </Field>
        );
    };

    return (
        <>
            <PageTitle title={title} desc={desc} right={<>
                <TextInput placeholder={searchPlaceholder} value={q} onChange={e => setQ(e.target.value)} style={{ width: 220 }} />
                <Btn variant="primary" onClick={() => setEditing({ mode: 'create', draft: { ...defaultDraft } })}>+ 추가</Btn>
            </>} />
            <ErrorBox error={error} />
            <Card>
                {!rows ? <Spinner /> : (
                    <Table<T> rowKey={r => String(r[pk])} rows={rows} columns={[...columns, {
                        key: '_actions', header: '', width: 120, align: 'right', render: r => (
                            <span style={{ display: 'inline-flex', gap: 6 }}>
                                <Btn size="sm" onClick={() => setEditing({ mode: 'edit', draft: { ...r } })}>수정</Btn>
                                <Btn size="sm" variant="danger" onClick={() => remove(r)}>삭제</Btn>
                            </span>) }]} />
                )}
            </Card>
            {editing && (
                <Modal title={editing.mode === 'create' ? `${title} 추가` : `${title} 수정 — ${String(editing.draft[pk])}`} onClose={() => setEditing(null)} width={560}>
                    <div style={{ display: 'grid', gap: 12 }}>{fields.map(renderField)}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Btn variant="ghost" onClick={() => setEditing(null)}>취소</Btn>
                        <Btn variant="primary" onClick={submit} disabled={busy}>{busy ? '저장 중…' : '저장'}</Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}
```

- [ ] **Step 2: 세 페이지 작성**

`app/bom/items/page.tsx`
```tsx
'use client';
import MasterTable, { type FieldDef } from '../_components/MasterTable';
import { Badge, Btn, Select } from '../_components/ui';
import { bomApi, errMsg } from '../../lib/bom/client';
import { ITEM_PREFIXES, PREFIX_CATEGORY } from '../../lib/bom/codes';
import { useState } from 'react';

interface Item { item_no: string; name: string; category: string; subcategory: string | null; item_type: string; spec: string | null; unit: string; revision: string; wizard_option_key: string | null; memo: string | null; [k: string]: unknown }

const FIELDS: FieldDef[] = [
    { key: 'item_no', label: '품번', required: true, placeholder: 'CV-008' },
    { key: 'name', label: '품명', required: true },
    { key: 'category', label: '대분류', type: 'select', options: { codeType: 'category' }, required: true },
    { key: 'subcategory', label: '중분류' },
    { key: 'item_type', label: '품목구분', type: 'select', options: { codeType: 'item_type' }, required: true },
    { key: 'unit', label: '단위', type: 'select', options: ['EA', 'SET', '-'] },
    { key: 'revision', label: '리비전' },
    { key: 'spec', label: '규격/사양', type: 'textarea' },
    { key: 'spec_url', label: '사양서/도면 링크' },
    { key: 'memo', label: '메모', type: 'textarea' },
];

/** 접두어 선택 → next-no로 자동 채번 (범위: 001~999, 어셈블리 000 제외) */
function NextNoHelper({ setDraft, draft }: { draft: Record<string, unknown>; setDraft: (d: Record<string, unknown>) => void }) {
    const [prefix, setPrefix] = useState('CV');
    const [err, setErr] = useState<string | null>(null);
    const fill = async () => {
        try {
            const r = await bomApi<{ item_no: string }>(`/items/next-no?prefix=${prefix}&start=1&end=999`);
            setDraft({ ...draft, item_no: r.item_no, category: PREFIX_CATEGORY[prefix as keyof typeof PREFIX_CATEGORY] });
        } catch (e) { setErr(errMsg(e)); }
    };
    return <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        <Select value={prefix} onChange={e => setPrefix(e.target.value)}>{ITEM_PREFIXES.map(p => <option key={p}>{p}</option>)}</Select>
        <Btn size="sm" type="button" onClick={fill}>자동 채번</Btn>{err && <span style={{ color: '#dc2626', fontSize: 11 }}>{err}</span>}
    </span>;
}

export default function ItemsPage() {
    return <MasterTable<Item> resource="items" pk="item_no" title="품목마스터" desc="품번은 접두어별 자동 채번을 권장합니다. 위자드 옵션과 연결된 품목은 배지로 표시됩니다."
        searchPlaceholder="품번·품명 검색" fields={FIELDS} defaultDraft={{ unit: 'EA', revision: 'A', item_type: '부품' }}
        pkHelper={(draft, setDraft) => <NextNoHelper draft={draft} setDraft={setDraft} />}
        columns={[
            { key: 'item_no', header: '품번', width: 100 },
            { key: 'name', header: '품명' },
            { key: 'category', header: '대분류', width: 90 },
            { key: 'subcategory', header: '중분류', width: 100, render: r => r.subcategory ?? '' },
            { key: 'item_type', header: '구분', width: 90 },
            { key: 'unit', header: '단위', width: 50 },
            { key: 'revision', header: 'Rev.', width: 60 },
            { key: 'wizard_option_key', header: '위자드', width: 120, render: r => r.wizard_option_key ? <Badge tone="info">{r.wizard_option_key}</Badge> : '' },
        ]} />;
}
```

`app/bom/vendors/page.tsx`
```tsx
'use client';
import MasterTable, { type FieldDef } from '../_components/MasterTable';
interface Vendor { vendor_code: string; name: string; vendor_type: string | null; country: string | null; contact_name: string | null; phone: string | null; email: string | null; main_items: string | null; [k: string]: unknown }
const FIELDS: FieldDef[] = [
    { key: 'vendor_code', label: '협력사코드', required: true, placeholder: 'V-006' }, { key: 'name', label: '협력사명', required: true },
    { key: 'vendor_type', label: '유형', type: 'select', options: { codeType: 'vendor_type' } }, { key: 'country', label: '국가', placeholder: 'KR' },
    { key: 'contact_name', label: '담당자명' }, { key: 'phone', label: '연락처' }, { key: 'email', label: '이메일' }, { key: 'main_items', label: '주요취급품목' }, { key: 'note', label: '비고', type: 'textarea' },
];
export default function VendorsPage() {
    return <MasterTable<Vendor> resource="vendors" pk="vendor_code" title="협력사마스터" desc="V-000은 현행 단가표를 옮긴 기준단가용 가상 협력사입니다." searchPlaceholder="코드·이름·품목 검색" fields={FIELDS}
        columns={[{ key: 'vendor_code', header: '코드', width: 90 }, { key: 'name', header: '협력사명' }, { key: 'vendor_type', header: '유형', width: 100 }, { key: 'country', header: '국가', width: 60 }, { key: 'contact_name', header: '담당자', width: 90 }, { key: 'phone', header: '연락처', width: 130 }, { key: 'main_items', header: '주요취급품목' }]} />;
}
```

`app/bom/employees/page.tsx`
```tsx
'use client';
import MasterTable, { type FieldDef } from '../_components/MasterTable';
import { Badge } from '../_components/ui';
interface Employee { employee_id: string; name: string; department: string | null; title: string | null; email: string | null; phone: string | null; role: string; auth_user_id: string | null; [k: string]: unknown }
const FIELDS: FieldDef[] = [
    { key: 'employee_id', label: '담당자ID', required: true, placeholder: 'E-006' }, { key: 'name', label: '이름', required: true },
    { key: 'department', label: '부서' }, { key: 'title', label: '직책' }, { key: 'email', label: '이메일' }, { key: 'phone', label: '연락처' },
    { key: 'role', label: '역할', type: 'select', options: ['admin', 'pm', 'purchasing', 'engineer', 'quality', 'viewer'], required: true },
    { key: 'auth_user_id', label: '로그인 계정 UUID', placeholder: 'Supabase auth.users.id (3차 권한 강제용)' },
];
export default function EmployeesPage() {
    return <MasterTable<Employee> resource="employees" pk="employee_id" title="담당자마스터" desc="역할은 3차(ECN·권한)에서 강제됩니다. 지금은 표시용입니다." searchPlaceholder="ID·이름·부서 검색" fields={FIELDS} defaultDraft={{ role: 'viewer' }}
        columns={[{ key: 'employee_id', header: 'ID', width: 80 }, { key: 'name', header: '이름', width: 100 }, { key: 'department', header: '부서' }, { key: 'title', header: '직책', width: 80 }, { key: 'email', header: '이메일' }, { key: 'role', header: '역할', width: 100, render: r => <Badge tone="info">{r.role}</Badge> }, { key: 'auth_user_id', header: '계정 연결', width: 80, render: r => r.auth_user_id ? <Badge tone="ok">연결</Badge> : <Badge tone="muted">없음</Badge> }]} />;
}
```

- [ ] **Step 3: 검증** — Run: `npx tsc --noEmit`. 컨트롤러 확인: `/bom/items` 56건 표시, 검색 "폼" 필터, `+ 추가` → 접두어 SN 자동 채번 → `SN-004` 채워짐 → 저장 → 목록 반영 → 삭제. `/bom/vendors`, `/bom/employees` 표시·수정 동작. 참조 중인 품목(예: FM-003) 삭제 시 409 안내 문구.

- [ ] **Step 4: 커밋**
```bash
git add app/bom/_components/MasterTable.tsx app/bom/items app/bom/vendors app/bom/employees
git commit -m "feat(bom-ui): 품목·협력사·담당자 마스터 화면 (공용 CRUD 표, 자동 채번)"
```

---

### Task 7: AVL 화면 (품목별 협력사·승인·단가 방식)

**Files:**
- Create: `app/bom/avl/page.tsx`

**Interfaces:**
- Consumes: `GET /api/bom/avl?item_no=` (조인 `items(name, category)`, `vendors(name)`, `employees(name)`), `POST /api/bom/avl` (upsert; `price_type` 검증, WIDTH_STEP은 `price_steps` 배열 필수, 승인 시 `approved_at` 자동), `DELETE /api/bom/avl?item_no=&vendor_code=`, `GET /api/bom/items?q=`, `GET /api/bom/vendors`, `GET /api/bom/employees`, `GET /api/bom/code-values?code_type=approval_status`.
- Produces: 저장 후 `useAvlPricing` 캐시 무효화를 위해 모듈의 `reload()`를 호출하지 않고(다른 페이지) — 빌더 PricingPanel은 페이지 진입 시 캐시가 있으면 재사용하므로, 이 화면의 저장 성공 시 `import { invalidateAvlCache } from '../../lib/bom/useAvlPricing'`를 호출한다. **T3의 `useAvlPricing.ts`에 `export function invalidateAvlCache() { cache = null; }`를 이 Task에서 추가한다.**

- [ ] **Step 1: `app/lib/bom/useAvlPricing.ts`에 `invalidateAvlCache` 추가** (파일 끝):
```ts
/** AVL 편집 후 호출: 다음 사용 시 다시 받는다 */
export function invalidateAvlCache() { cache = null; }
```

- [ ] **Step 2: `app/bom/avl/page.tsx` 작성**

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { bomApi, errMsg } from '../../lib/bom/client';
import { invalidateAvlCache } from '../../lib/bom/useAvlPricing';
import { Card, Table, Btn, Badge, Modal, Field, TextInput, Select, Spinner, ErrorBox, PageTitle, fmtWon, C } from '../_components/ui';

interface AvlRow { item_no: string; vendor_code: string; owner_id: string | null; approval_status: string; lead_time_days: number | null; moq: number | null; unit_price: number; currency: string; approved_at: string | null; price_type: 'FIXED' | 'VOLUME' | 'WIDTH_STEP'; price_constant: number; price_base: number; price_steps: { maxWidth: number; price: number; boxSpec?: string }[] | null; note: string | null; items: { name: string; category: string } | null; vendors: { name: string } | null; employees: { name: string } | null }
interface Item { item_no: string; name: string; category: string }
interface Vendor { vendor_code: string; name: string }
interface Employee { employee_id: string; name: string }

const TONE: Record<string, 'ok' | 'warn' | 'muted' | 'danger'> = { '승인': 'ok', '샘플평가': 'warn', '후보': 'muted', '보류': 'warn', '탈락': 'danger' };
const EMPTY: Partial<AvlRow> = { approval_status: '후보', currency: 'KRW', price_type: 'FIXED', unit_price: 0, price_constant: 0, price_base: 0, price_steps: null };

export default function AvlPage() {
    const [rows, setRows] = useState<AvlRow[] | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [filterItem, setFilterItem] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [draft, setDraft] = useState<Partial<AvlRow> | null>(null);
    const [stepsText, setStepsText] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        setRows(null);
        bomApi<AvlRow[]>(`/avl${filterItem ? `?item_no=${encodeURIComponent(filterItem)}` : ''}`).then(setRows).catch(e => setError(errMsg(e)));
    }, [filterItem]);
    useEffect(load, [load]);
    useEffect(() => {
        Promise.all([bomApi<Item[]>('/items'), bomApi<Vendor[]>('/vendors'), bomApi<Employee[]>('/employees'), bomApi<{ value: string }[]>('/code-values?code_type=approval_status')])
            .then(([i, v, e, s]) => { setItems(i); setVendors(v); setEmployees(e); setStatuses(s.map(x => x.value)); }).catch(e => setError(errMsg(e)));
    }, []);

    const open = (r?: AvlRow) => { const d = r ? { ...r } : { ...EMPTY, item_no: filterItem || '' }; setDraft(d); setStepsText(d.price_steps ? JSON.stringify(d.price_steps, null, 0) : '[{"maxWidth":1100,"price":7000,"boxSpec":"Box: 1400×310×310"},{"maxWidth":99999,"price":13000}]'); };
    const set = <K extends keyof AvlRow>(k: K, v: AvlRow[K]) => setDraft(d => d && ({ ...d, [k]: v }));

    const save = async () => {
        if (!draft?.item_no || !draft.vendor_code) { setError('품번과 협력사는 필수입니다.'); return; }
        let steps: AvlRow['price_steps'] = null;
        if (draft.price_type === 'WIDTH_STEP') { try { steps = JSON.parse(stepsText); if (!Array.isArray(steps)) throw new Error(); } catch { setError('폭 구간은 JSON 배열이어야 합니다. 예: [{"maxWidth":1100,"price":7000}]'); return; } }
        setBusy(true); setError(null);
        try {
            const { items: _i, vendors: _v, employees: _e, ...body } = draft as AvlRow; // eslint-disable-line @typescript-eslint/no-unused-vars
            await bomApi('/avl', { method: 'POST', json: { ...body, price_steps: steps, approved_at: body.approved_at || null, owner_id: body.owner_id || null, lead_time_days: body.lead_time_days ?? null, moq: body.moq ?? null } });
            invalidateAvlCache(); setDraft(null); load();
        } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };
    const remove = async (r: AvlRow) => {
        if (!confirm(`${r.item_no} / ${r.vendor_code} AVL 행을 삭제할까요?`)) return;
        try { await bomApi(`/avl?item_no=${encodeURIComponent(r.item_no)}&vendor_code=${encodeURIComponent(r.vendor_code)}`, { method: 'DELETE' }); invalidateAvlCache(); load(); } catch (e) { setError(errMsg(e)); }
    };
    const priceText = (r: AvlRow) => r.price_type === 'FIXED' ? fmtWon(r.unit_price) : r.price_type === 'VOLUME' ? `W×D×H×${r.price_constant}${r.price_base ? ` + ${fmtWon(r.price_base)}` : ''}` : `폭 구간 ${r.price_steps?.length ?? 0}단계`;

    return (
        <>
            <PageTitle title="AVL — 승인 협력사·단가" desc="견적은 품번별로 '승인' 상태이면서 승인일이 가장 최근인 행의 단가를 씁니다. 치수 부품은 단가 방식 VOLUME(부피 수식)으로 등록합니다."
                right={<>
                    <Select value={filterItem} onChange={e => setFilterItem(e.target.value)} style={{ minWidth: 260 }}><option value="">전체 품목</option>{items.map(i => <option key={i.item_no} value={i.item_no}>{i.item_no} {i.name}</option>)}</Select>
                    <Btn variant="primary" onClick={() => open()}>+ AVL 행 추가</Btn>
                </>} />
            <ErrorBox error={error} />
            <Card>{!rows ? <Spinner /> : (
                <Table<AvlRow> rowKey={r => `${r.item_no}|${r.vendor_code}`} rows={rows} columns={[
                    { key: 'item_no', header: '품번', width: 90 }, { key: 'item', header: '품명', render: r => r.items?.name ?? '' },
                    { key: 'vendor', header: '협력사', render: r => `${r.vendor_code} ${r.vendors?.name ?? ''}` },
                    { key: 'owner', header: '담당', width: 70, render: r => r.employees?.name ?? '' },
                    { key: 'approval_status', header: '승인', width: 80, render: r => <Badge tone={TONE[r.approval_status] ?? 'muted'}>{r.approval_status}</Badge> },
                    { key: 'approved_at', header: '승인일', width: 100, render: r => r.approved_at ?? '' },
                    { key: 'price', header: '단가', render: r => <span>{priceText(r)} {r.currency !== 'KRW' && <Badge tone="warn">{r.currency}</Badge>}</span> },
                    { key: 'lt', header: 'L/T·MOQ', width: 90, render: r => `${r.lead_time_days ?? '-'}일 · ${r.moq ?? '-'}` },
                    { key: '_a', header: '', width: 120, align: 'right', render: r => <span style={{ display: 'inline-flex', gap: 6 }}><Btn size="sm" onClick={() => open(r)}>수정</Btn><Btn size="sm" variant="danger" onClick={() => remove(r)}>삭제</Btn></span> },
                ]} />)}</Card>

            {draft && (
                <Modal title="AVL 행" onClose={() => setDraft(null)} width={620}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="품번 *"><Select value={draft.item_no ?? ''} onChange={e => set('item_no', e.target.value)}><option value="">선택</option>{items.map(i => <option key={i.item_no} value={i.item_no}>{i.item_no} {i.name}</option>)}</Select></Field>
                        <Field label="협력사 *"><Select value={draft.vendor_code ?? ''} onChange={e => set('vendor_code', e.target.value)}><option value="">선택</option>{vendors.map(v => <option key={v.vendor_code} value={v.vendor_code}>{v.vendor_code} {v.name}</option>)}</Select></Field>
                        <Field label="사내 담당자"><Select value={draft.owner_id ?? ''} onChange={e => set('owner_id', e.target.value || null)}><option value="">없음</option>{employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.employee_id} {e.name}</option>)}</Select></Field>
                        <Field label="승인상태"><Select value={draft.approval_status ?? '후보'} onChange={e => set('approval_status', e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</Select></Field>
                        <Field label="승인일" hint="비우면 승인 시 오늘 날짜"><TextInput type="date" value={draft.approved_at ?? ''} onChange={e => set('approved_at', e.target.value || null)} /></Field>
                        <Field label="통화" hint="KRW가 아니면 견적에서 경고 처리"><Select value={draft.currency ?? 'KRW'} onChange={e => set('currency', e.target.value)}>{['KRW', 'USD', '-'].map(c => <option key={c}>{c}</option>)}</Select></Field>
                        <Field label="리드타임(일)"><TextInput type="number" value={draft.lead_time_days ?? ''} onChange={e => set('lead_time_days', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                        <Field label="MOQ"><TextInput type="number" value={draft.moq ?? ''} onChange={e => set('moq', e.target.value === '' ? null : Number(e.target.value))} /></Field>
                        <Field label="단가 방식"><Select value={draft.price_type ?? 'FIXED'} onChange={e => set('price_type', e.target.value as AvlRow['price_type'])}><option value="FIXED">FIXED (개당 고정)</option><option value="VOLUME">VOLUME (W×D×H×상수 + 기본금)</option><option value="WIDTH_STEP">WIDTH_STEP (폭 구간표)</option></Select></Field>
                        {draft.price_type === 'FIXED' && <Field label="단가"><TextInput type="number" value={draft.unit_price ?? 0} onChange={e => set('unit_price', Number(e.target.value))} /></Field>}
                        {draft.price_type === 'VOLUME' && <>
                            <Field label="상수" hint="예: 0.0003266"><TextInput type="number" step="0.0000001" value={draft.price_constant ?? 0} onChange={e => set('price_constant', Number(e.target.value))} /></Field>
                            <Field label="기본금"><TextInput type="number" value={draft.price_base ?? 0} onChange={e => set('price_base', Number(e.target.value))} /></Field>
                        </>}
                    </div>
                    {draft.price_type === 'WIDTH_STEP' && <Field label="폭 구간 (JSON)" hint='[{"maxWidth":1100,"price":7000,"boxSpec":"Box: 1400×310×310"}, …] 마지막은 maxWidth 99999'><textarea value={stepsText} onChange={e => setStepsText(e.target.value)} rows={4} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box' }} /></Field>}
                    <Field label="비고"><TextInput value={draft.note ?? ''} onChange={e => set('note', e.target.value)} /></Field>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Btn variant="ghost" onClick={() => setDraft(null)}>취소</Btn>
                        <Btn variant="primary" onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</Btn>
                    </div>
                </Modal>
            )}
        </>
    );
}
```

- [ ] **Step 3: 검증** — Run: `npx tsc --noEmit`. 컨트롤러 확인: `/bom/avl`에 61행, 품목 필터 `CT-010` → 2행(V-000 KRW, V-003 USD 배지). 행 추가: `CT-010`/`V-004`/승인/FIXED 1500 저장 → 상세 `MAT-001-LK` 견적에서 CT-010이 1,500원으로 바뀌고 USD 경고가 사라짐(승인일 최신). 확인 후 그 행 삭제.

- [ ] **Step 4: 커밋**
```bash
git add app/bom/avl app/lib/bom/useAvlPricing.ts
git commit -m "feat(bom-ui): AVL 화면 (승인상태·단가 방식·폭 구간 편집)"
```

---

### Task 8: 엑셀 가져오기 / 내보내기 화면

**Files:**
- Create: `app/bom/import/page.tsx`

**Interfaces:**
- Consumes: `POST /api/bom/import` (multipart `file`, `size_preset_id`) → `{ log, counts }` 또는 400 `{ error, log }`; `GET /api/bom/export` → xlsx; `bomApiBlob`, `saveBlob`.

- [ ] **Step 1: `app/bom/import/page.tsx` 작성**

```tsx
'use client';
import { useState } from 'react';
import { bomApiBlob, saveBlob, errMsg } from '../../lib/bom/client';
import { SIZE_PRESETS } from '../../lib/constants';
import { Card, Btn, Field, Select, ErrorBox, PageTitle, C } from '../_components/ui';

interface ImportResult { log: string[]; counts?: Record<string, number>; error?: string }

export default function ImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [sizeId, setSizeId] = useState('LK');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const doImport = async () => {
        if (!file) { setError('xlsx 파일을 선택하세요.'); return; }
        if (!confirm('가져온 데이터는 같은 코드의 기존 행을 덮어씁니다(상품의 BOM은 통째로 교체). 계속할까요?')) return;
        setBusy(true); setError(null); setResult(null);
        try {
            const fd = new FormData(); fd.append('file', file); fd.append('size_preset_id', sizeId);
            const res = await fetch('/api/bom/import', { method: 'POST', body: fd });
            const j = (await res.json()) as ImportResult;
            setResult(j);
            if (!res.ok) setError(j.error ?? `HTTP ${res.status}`);
        } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };
    const doExport = async () => {
        setBusy(true); setError(null);
        try { saveBlob(await bomApiBlob('/export'), `BOM_export_${new Date().toISOString().slice(0, 10)}.xlsx`); }
        catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
    };

    return (
        <>
            <PageTitle title="엑셀 가져오기 / 내보내기" desc="매트리스_BOM_관리템플릿.xlsx 구조(시트 = 테이블)를 그대로 읽고 씁니다. 내보낸 파일을 수정해 다시 가져올 수 있습니다." />
            <ErrorBox error={error} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: C.text }}>가져오기</h3>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <Field label="xlsx 파일"><input type="file" accept=".xlsx" onChange={e => setFile(e.target.files?.[0] ?? null)} /></Field>
                        <Field label="템플릿 상품의 사이즈" hint="템플릿 상품코드에 사이즈가 없으면 이 사이즈를 붙입니다(MAT-001 → MAT-001-LK). 이미 붙어 있으면 그대로 둡니다.">
                            <Select value={sizeId} onChange={e => setSizeId(e.target.value)}>{SIZE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label} {p.width}×{p.depth}</option>)}</Select>
                        </Field>
                        <Btn variant="primary" onClick={doImport} disabled={busy || !file}>{busy ? '처리 중…' : '가져오기 실행'}</Btn>
                    </div>
                    <ul style={{ margin: '14px 0 0', paddingLeft: 16, fontSize: 11, color: C.sub, lineHeight: 1.6 }}>
                        <li>위자드 옵션과 연결된 품목(CV/FM/ST/CT/SN/PK 시드)은 품명이 덮어써지지 않습니다.</li>
                        <li>템플릿의 구 품번(CT-002~006 부속품, CV-010 폼)은 새 체계로 재번호되고, 일반 커버 패널 CV-001~003은 제외됩니다.</li>
                        <li>중간에 실패하면 그 단계 이전 데이터는 저장된 상태로 남습니다. 파일을 고쳐 다시 가져오면 덮어씁니다.</li>
                    </ul>
                </Card>
                <Card>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: C.text }}>내보내기</h3>
                    <p style={{ fontSize: 12, color: C.sub, margin: '0 0 12px' }}>현재 DB 전체(상품·품목·BOM·협력사·담당자·AVL·NPI·완성률·ECN·코드표)를 시트 10개로 내려받습니다.</p>
                    <Btn variant="secondary" onClick={doExport} disabled={busy}>⬇ BOM_export_날짜.xlsx 다운로드</Btn>
                </Card>
            </div>
            {result && (
                <Card style={{ marginTop: 16 }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: C.text }}>{result.error ? '가져오기 실패' : '가져오기 완료'}</h3>
                    {result.counts && <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>{Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>}
                    <pre style={{ margin: 0, fontSize: 11, color: C.sub, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', background: C.soft, padding: 12, borderRadius: 8 }}>{result.log.join('\n')}</pre>
                </Card>
            )}
        </>
    );
}
```

- [ ] **Step 2: 검증** — Run: `npx tsc --noEmit`. 컨트롤러 확인: 내보내기 클릭 → xlsx 다운로드. 그 파일을 가져오기(LK) → 완료 카드에 counts와 로그 표시, 상품 목록·견적 총액 변화 없음.

- [ ] **Step 3: 커밋**
```bash
git add app/bom/import
git commit -m "feat(bom-ui): 엑셀 템플릿 가져오기/내보내기 화면"
```

---

### Task 9: 마무리 — 버전 V1.090, Changelog, 빌드, 문서

**Files:**
- Modify: `app/builder/page.tsx` (라벨 `Alpha V1.090`), `Changelog.md` (최상단 엔트리), `CLAUDE.md` (BOM 화면·구조 요약 추가)

- [ ] **Step 1: 버전 라벨·Changelog** — 라벨 `Alpha V1.089` → `Alpha V1.090`. Changelog 최상단에 아래 형식으로 추가(시간은 실행 시점):
```
## [Alpha V1.090] - YYYY-MM-DD HH:mm:ss

### 🔄 Build Update
- **Summary**: BOM 관리 화면 1차 공개 — 위자드 9단계 "BOM 확인"으로 상품 저장, BOM/품목/협력사/AVL/엑셀 화면, 견적서·개발요청서를 DB 기준으로 생성
- **Detail** :
  - **`app/components/steps/StepBomConfirm.tsx` [ADD]**: 8단계까지 고른 사양을 품번 BOM으로 미리 보고, 모델코드·상품명·사이즈(복수)를 정해 상품으로 저장합니다.
  - **`app/bom/**` [ADD]**: 허브의 "BOM / 개발관리" 카드에서 진입. 상품 목록·상세(BOM 트리, 승인 단가, 견적서·개발요청서·위자드로 열기), 품목/협력사/담당자 마스터, AVL 단가 관리, 엑셀 가져오기/내보내기.
  - **`app/components/PricingPanel.tsx` [MODIFY]**: 설계 현황의 예상 단가가 브라우저 저장 단가표 대신 DB의 승인 협력사(AVL) 단가로 계산됩니다.
  - **`app/components/DevelopmentRequestModal.tsx` [MODIFY]**: 상품 상세에서 열면 6번 "BOM 자재명세" 표가 추가됩니다.
  - **삭제**: 단가 관리 모달, 설계 완료 모달, 견적 조건 모달, 구 견적서 API — 견적서는 상품 상세의 "견적서" 버튼에서 모델 전체 사이즈로 생성됩니다.
- **Build Time**: YYYY-MM-DD HH:mm:ss
```

- [ ] **Step 2: `CLAUDE.md` 갱신** — "아키텍처" 아래에 절 "BOM 모듈 (1차)"을 추가: 라우트(`/bom/*`), 데이터 흐름(위자드 → `from-design` → products/bom_lines; 견적 = AVL 승인 단가), 핵심 파일(`app/lib/bom/*`, `app/api/bom/*`, `app/bom/*`), 규칙(`bom_lines→items` 임베드는 `items!bom_lines_item_no_fkey`, AVL 편집 후 `invalidateAvlCache()`, 시드는 `npm run seed:gen`, 마이그레이션 `supabase/migrations`, 적용 `npx supabase db push --include-seed`), 테스트 `npm test`(Vitest). "상태" 표의 localStorage 항목에서 단가표 행을 "AVL(DB)로 이관, `pricingStore`는 동치 테스트 전용"으로 수정.

- [ ] **Step 3: 최종 검증** — Run: `npx tsc --noEmit && npm test && npm run build`. 컨트롤러 브라우저 스모크 체크리스트:
  1. `/hub` 카드 3개 → BOM 카드 → `/bom/products`
  2. `/builder` 1~9단계 → 상품 저장(사이즈 2개) → 상세 이동
  3. 상세: BOM 트리 · 견적 합계 · 견적서 xlsx 생성(새 탭) · 개발요청서(6. BOM 표) · 위자드로 열기 → 선택값 복원 · 삭제
  4. `/bom/items` 자동 채번 추가·삭제, `/bom/avl` 행 추가 후 상세 견적 반영·삭제, `/bom/import` 내보내기→가져오기 왕복
  5. `/designer` 화면과 AI 이미지 생성이 기존과 동일하게 동작(회귀 확인)

- [ ] **Step 4: 커밋**
```bash
git add app/builder/page.tsx Changelog.md CLAUDE.md
git commit -m "chore: Alpha V1.090 버전 라벨·Changelog·CLAUDE.md (BOM 화면 1차)"
```

---

## 계획 자체 점검

- **기획안 7장 대조**: 허브 카드(T1), `/bom` 리다이렉트(T1), `/bom/products`·상세(T2, 버튼 T3/T4/T5), `/bom/items|vendors|employees`(T6), `/bom/avl`(T7), `/bom/import`(T8), 위자드 9단계 저장 흐름(T4), 견적서·개발요청서 DB 전환(T3·T5), 단가 관리 모달 제거(T3). `/bom` 대시보드·`/bom/npi`·`/bom/ecn`은 2·3차.
- **기획안 7.1의 "모델 전체에 BOM 수정 적용" 버튼**은 BOM 수동 편집(P1 "BOM 편집" 화면)이 아직 없어 1B에서 제외한다 — 2차 항목으로 기획안에 표기할 것.
- **프리셋 패널의 "상품에서 불러오기"**는 상세 페이지의 "위자드로 열기"가 같은 역할을 하므로 별도 구현하지 않는다.
- **1A 인터페이스 사용 확인**: from-design, products(list/detail/quote), documents/quote, items(+next-no), vendors, employees, avl, import/export, code-values — 모두 T1~T8에서 소비.
- **테스트**: 순수 로직은 `client.ts`만 신규. 화면은 tsc/빌드 + 컨트롤러 브라우저 확인. `lightSnapshot`/`restoreSnapshot`은 T4에서 컴포넌트 파일 안에 있으므로 단위 테스트 없음 — 위자드 재오픈 브라우저 확인으로 대체.
