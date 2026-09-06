# BOM 통합 1A (백엔드) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 위자드 `DesignState`를 품번 기반 BOM으로 변환·저장하고, AVL 단가로 견적을 계산하며, 엑셀 템플릿을 가져오기/내보내기 하는 백엔드(스키마·순수 함수·API)를 만든다. UI는 1B 계획에서 다룬다.

**Architecture:** 순수 함수 3개(`bomBuilder`, `pricing`, `excelIO`)를 `app/lib/bom/`에 두고 Vitest로 검증한다. Supabase Postgres 스키마는 `supabase/migrations/*.sql`, 시드는 `constants.ts`·`pricingData.ts`에서 스크립트로 생성한다. 쓰기는 모두 `app/api/bom/**` Route Handler가 서버 Supabase 클라이언트로 수행하고, 로그인 사용자만 허용한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Vitest, tsx, xlsx(읽기), ExcelJS(쓰기)

## Global Constraints

- 기획안: `G:\Antigravity_Google\Mattress_ADF\Mattress-Agent_BOM통합_기획안.md` 4~6장, 8~9장이 이 계획의 스펙이다.
- 품번 접두어 7종 `CV FM ST CT SN PK SW`, 패턴 `^(CV|FM|ST|CT|SN|PK|SW)-\d{3}$`.
- 상품 코드 = `{model_code}-{size_preset_id}` (예 `MAT-001-LK`).
- 견적 단가는 `avl.approval_status = '승인'` 행 중 `approved_at` 최신 행. 없으면 0원 + 경고.
- 수식은 현행 `pricingStore.calculateSummary`와 결과가 같아야 한다 (Task 3 테스트가 검증).
- 기존 `/builder`, `/designer` 코드는 이 계획에서 수정하지 않는다.
- 코드 주석·에러 메시지는 한국어. 커밋 메시지는 기존 관례(`feat:`, `fix:` + 한국어 요약).
- Supabase 프로젝트 ref: `jkeisufqjemsnqamiqlv` (`.env.local`의 URL). 서비스 롤 키는 사용하지 않는다.

## File Structure

```
mattress-agent/
├─ vitest.config.ts                         # Task 1
├─ app/lib/bom/
│   ├─ types.ts                             # Task 1  공용 타입 (BomLine, Dim, AvlPriceRow …)
│   ├─ codes.ts                             # Task 1  접두어·어셈블리·옵션→품번 매핑
│   ├─ bomBuilder.ts                        # Task 2  DesignState + 사이즈 → BomLine[]
│   ├─ pricing.ts                           # Task 3  BomLine[] + AVL → 견적 결과
│   ├─ excelIO.ts                           # Task 11 템플릿 xlsx ↔ 테이블 행
│   └─ __tests__/{codes,bomBuilder,pricing,excelIO}.test.ts
├─ scripts/genSeed.ts                       # Task 5  constants/pricingData → supabase/seed/seed.sql
├─ supabase/
│   ├─ migrations/0001_bom_schema.sql       # Task 4
│   └─ seed/seed.sql                        # Task 5 (생성물, 커밋함)
├─ app/api/bom/
│   ├─ _lib/auth.ts                         # Task 7  requireUser()
│   ├─ _lib/master.ts                       # Task 7  마스터 CRUD 핸들러 팩토리
│   ├─ items/route.ts, items/[id]/route.ts  # Task 8
│   ├─ items/next-no/route.ts               # Task 8  자동 채번
│   ├─ vendors/…, employees/…               # Task 8
│   ├─ products/route.ts                    # Task 8  목록 (model_code 그룹)
│   ├─ products/from-design/route.ts        # Task 9  위자드 → 상품+BOM 생성
│   ├─ products/[code]/route.ts             # Task 9  상세 (BOM 트리 포함)
│   ├─ products/[code]/quote/route.ts       # Task 10 단가 계산 결과
│   ├─ avl/route.ts                         # Task 9  AVL 목록/업서트/삭제
│   ├─ documents/quote/route.ts             # Task 10 모델 견적서 xlsx 생성 + Storage 저장
│   ├─ import/route.ts                      # Task 12
│   └─ export/route.ts                      # Task 12
└─ package.json                             # test/seed 스크립트 추가
```

---

### Task 1: Vitest 설정 + 타입 + 품번 매핑표

**Files:**
- Create: `vitest.config.ts`
- Create: `app/lib/bom/types.ts`
- Create: `app/lib/bom/codes.ts`
- Test: `app/lib/bom/__tests__/codes.test.ts`
- Modify: `package.json` (scripts, devDependencies)

**Interfaces:**
- Produces: `types.ts`의 `BomLine`, `Dim`, `BomDesignInput`, `SizeSpec`, `AvlPriceRow`, `PriceType`
- Produces: `codes.ts`의 `ITEM_PREFIXES`, `PREFIX_CATEGORY`, `ASSEMBLY`, `AUTO_PARTS`, `guardKey()`, `bottomKey()`, `itemNoForOption()`, `OPTION_ITEM_MAP`

- [ ] **Step 1: Vitest·tsx 설치와 스크립트 추가**

```bash
cd G:/Antigravity_Google/Mattress_ADF/mattress-agent
npm install -D vitest tsx
```

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest",
"seed:gen": "tsx scripts/genSeed.ts"
```

- [ ] **Step 2: vitest.config.ts 작성**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['app/lib/bom/__tests__/**/*.test.ts'],
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, '.') },
    },
});
```

- [ ] **Step 3: 타입 작성 — `app/lib/bom/types.ts`**

```ts
// ============================================================
// BOM 통합 공용 타입
// ============================================================

export type ItemPrefix = 'CV' | 'FM' | 'ST' | 'CT' | 'SN' | 'PK' | 'SW';
export type PriceType = 'FIXED' | 'VOLUME' | 'WIDTH_STEP';
export type Required = '필수' | '옵션';

/** 단가 계산용 치수 1건. qty 합 = BomLine.quantity */
export interface Dim {
    w: number;
    d: number;
    h: number;
    qty: number;
    label?: string; // 'D' | 'W' 등 표시용
}

/** bom_lines 1행 (product_code 제외) */
export interface BomLine {
    item_no: string;
    level: 1 | 2;
    parent_item_no: string | null;
    quantity: number;
    required: Required;
    alt_item_no: string | null;
    spec_text: string | null;
    dims: Dim[] | null;
    note: string | null;
    source: 'wizard' | 'manual';
}

/** 품번이 없는 위자드 선택값 (커스텀 옵션) */
export interface UnmappedOption {
    step: string;
    optionKey: string;
}

/** 위자드 상태 중 BOM 생성에 필요한 필드만 */
export interface BomDesignInput {
    isDual: boolean;
    topFoamEnabled: boolean | null;
    topFoamOptionId: string | null;
    guardFoamEnabled: boolean | null;
    guardFoamThickness: number;
    guardFoamHardness: string;
    bottomFoamEnabled: boolean | null;
    bottomFoamThickness: number;
    bottomFoamHardness: string;
    coreId: string | null;
    coverId: string | null;
    controllerId: string | null;
    sensorId: string | null;
    packagingId: string | null;
}

export interface SizeSpec {
    size_preset_id: string;
    width_mm: number;
    depth_mm: number;
}

/** avl 테이블 중 단가 계산에 쓰는 컬럼 */
export interface AvlPriceRow {
    item_no: string;
    vendor_code: string;
    approval_status: string;
    approved_at: string | null;
    price_type: PriceType;
    unit_price: number;
    price_constant: number;
    price_base: number;
    price_steps: { maxWidth: number; price: number; boxSpec?: string }[] | null;
}

export interface PricedLine {
    item_no: string;
    quantity: number;
    vendor_code: string | null;
    price_type: PriceType | null;
    unit_price: number;   // total / quantity
    total: number;
    warning: string | null; // '단가 미승인' 등
    spec_note: string | null; // WIDTH_STEP 박스 규격 등
}

export interface QuoteResult {
    lines: PricedLine[];
    delivery: { option: string | null; price: number };
    total: number;
    warnings: string[];
}
```

- [ ] **Step 4: 실패하는 테스트 작성 — `app/lib/bom/__tests__/codes.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { itemNoForOption, guardKey, bottomKey, ASSEMBLY, AUTO_PARTS, OPTION_ITEM_MAP, PREFIX_CATEGORY } from '../codes';

describe('codes: 옵션 → 품번 매핑', () => {
    it('상단폼 4종은 FM-001~004', () => {
        expect(itemNoForOption('TOP_50')).toBe('FM-001');
        expect(itemNoForOption('TOP_80_2L')).toBe('FM-004');
    });
    it('가드폼 두께×경도 조합은 FM-010~015', () => {
        expect(guardKey(70, '소프트')).toBe('GUARD_70_소프트');
        expect(itemNoForOption(guardKey(70, '소프트'))).toBe('FM-010');
        expect(itemNoForOption(guardKey(80, '미디엄'))).toBe('FM-014');
        expect(itemNoForOption(guardKey(80, '하드'))).toBe('FM-015');
    });
    it('하단폼 두께×경도 조합은 FM-020~025', () => {
        expect(itemNoForOption(bottomKey(30, '미디엄'))).toBe('FM-021');
        expect(itemNoForOption(bottomKey(50, '하드'))).toBe('FM-025');
    });
    it('스트링·커버·컨트롤러·센서·포장', () => {
        expect(itemNoForOption('V4_TPU')).toBe('ST-002');
        expect(itemNoForOption('GENTLE_BREED')).toBe('CV-005');
        expect(itemNoForOption('ALL_CARE')).toBe('CV-007');
        expect(itemNoForOption('IOT')).toBe('CT-003');
        expect(itemNoForOption('SENSOR_BAND_M')).toBe('SN-002');
        expect(itemNoForOption('FOLD_3')).toBe('PK-002');
    });
    it('모르는 옵션은 null', () => {
        expect(itemNoForOption('CUSTOM_XYZ')).toBeNull();
    });
    it('어셈블리·자동 부품·접두어 카테고리', () => {
        expect(ASSEMBLY.FM).toBe('FM-000');
        expect(AUTO_PARTS.ADAPTER).toBe('CT-010');
        expect(AUTO_PARTS.IOT_STICK).toBe('CT-013');
        expect(PREFIX_CATEGORY.SN).toBe('센서');
        // 모든 매핑 품번은 패턴을 만족한다
        for (const no of Object.values(OPTION_ITEM_MAP)) {
            expect(no).toMatch(/^(CV|FM|ST|CT|SN|PK|SW)-\d{3}$/);
        }
    });
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `npx vitest run app/lib/bom/__tests__/codes.test.ts`
Expected: FAIL — `Cannot find module '../codes'`

- [ ] **Step 6: `app/lib/bom/codes.ts` 작성**

```ts
// ============================================================
// 품번 체계 + 위자드 옵션 ↔ 품번 매핑 (기획안 5장)
// ============================================================
import type { ItemPrefix } from './types';

export const ITEM_PREFIXES: ItemPrefix[] = ['CV', 'FM', 'ST', 'CT', 'SN', 'PK', 'SW'];

export const PREFIX_CATEGORY: Record<ItemPrefix, string> = {
    CV: '커버', FM: '폼', ST: '스트링', CT: '컨트롤러', SN: '센서', PK: '포장', SW: 'APP',
};

/** 각 대분류의 000 어셈블리 */
export const ASSEMBLY: Record<ItemPrefix, string> = {
    CV: 'CV-000', FM: 'FM-000', ST: 'ST-000', CT: 'CT-000', SN: 'SN-000', PK: 'PK-000', SW: 'SW-000',
};

/** 위자드 선택과 무관하게 자동으로 붙는 부품 */
export const AUTO_PARTS = {
    LABEL_LAW: 'CV-020',      // 로우라벨 (법정표시)
    LABEL_LOGO: 'CV-021',     // 로고라벨
    ADAPTER: 'CT-010',        // 어댑터
    AIR_HOSE: 'CT-011',       // 에어호스
    MANUAL: 'CT-012',         // 매뉴얼
    IOT_STICK: 'CT-013',      // IoT Stick
    CTRL_BOX: 'CT-014',       // 컨트롤러 포장박스
    PKG_BOX: 'PK-010',        // 완제품 포장박스
    PKG_VINYL: 'PK-011',      // 포장비닐
    SW_ANDROID: 'SW-001',
    SW_IOS: 'SW-002',
    SW_SERVER_KR: 'SW-003',
} as const;

export const HARDNESS = ['소프트', '미디엄', '하드'] as const;
export const GUARD_THICKNESS = [70, 80] as const;
export const BOTTOM_THICKNESS = [30, 50] as const;

export const guardKey = (t: number, h: string) => `GUARD_${t}_${h}`;
export const bottomKey = (t: number, h: string) => `BOTTOM_${t}_${h}`;

const pad = (n: number) => String(n).padStart(3, '0');

function buildOptionMap(): Record<string, string> {
    const m: Record<string, string> = {
        // 상단폼
        TOP_50: 'FM-001', TOP_70: 'FM-002', TOP_70_2L: 'FM-003', TOP_80_2L: 'FM-004',
        // 스트링
        V3_PVC: 'ST-001', V4_TPU: 'ST-002',
        // 커버 (COVER_OPTIONS 순서 + 단가표에만 있는 올케어)
        HEALING_NUMBER: 'CV-001', COMPACT: 'CV-002', OAK_TWEED: 'CV-003',
        FLAT_GRID: 'CV-004', GENTLE_BREED: 'CV-005', I5: 'CV-006', ALL_CARE: 'CV-007',
        // 컨트롤러 본체
        NUMBERING: 'CT-001', CTRL_1_6: 'CT-002', IOT: 'CT-003', IOT_STICK: 'CT-004', SMART_CTRL: 'CT-005',
        // 센서
        SENSOR_BAND_S: 'SN-001', SENSOR_BAND_M: 'SN-002', SENSOR_BODY_P: 'SN-003',
        // 포장방식
        ROLL: 'PK-001', FOLD_3: 'PK-002',
    };
    // 가드폼 FM-010~015, 하단폼 FM-020~025 (두께 오름차순 × 경도 순)
    let i = 10;
    for (const t of GUARD_THICKNESS) for (const h of HARDNESS) m[guardKey(t, h)] = `FM-${pad(i++)}`;
    i = 20;
    for (const t of BOTTOM_THICKNESS) for (const h of HARDNESS) m[bottomKey(t, h)] = `FM-${pad(i++)}`;
    return m;
}

export const OPTION_ITEM_MAP: Record<string, string> = buildOptionMap();

export function itemNoForOption(optionKey: string): string | null {
    return OPTION_ITEM_MAP[optionKey] ?? null;
}

/** IoT 계열 컨트롤러 → SW 세트 자동 포함 */
export const IOT_CONTROLLERS = new Set(['IOT', 'IOT_STICK', 'SMART_CTRL']);

export function prefixOf(itemNo: string): ItemPrefix {
    return itemNo.slice(0, 2) as ItemPrefix;
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run app/lib/bom/__tests__/codes.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 8: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json app/lib/bom/types.ts app/lib/bom/codes.ts app/lib/bom/__tests__/codes.test.ts
git commit -m "feat(bom): Vitest 도입 및 품번 체계·옵션 매핑표 추가"
```

---

### Task 2: bomBuilder — 위자드 상태 → BOM 줄

**Files:**
- Create: `app/lib/bom/bomBuilder.ts`
- Test: `app/lib/bom/__tests__/bomBuilder.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `codes.ts` (Task 1), `app/lib/constants.ts`의 `calcCoreDimensions`, `CORE_DEFAULT_HEIGHT`
- Produces: `buildBom(design: BomDesignInput, size: SizeSpec): { lines: BomLine[]; unmapped: UnmappedOption[] }`
- Produces: `topFoamHeight(optionId: string | null): number`

- [ ] **Step 1: 실패하는 테스트 작성 — `app/lib/bom/__tests__/bomBuilder.test.ts`**

기획안 5.3 예시를 그대로 검증한다.

```ts
import { describe, it, expect } from 'vitest';
import { buildBom, topFoamHeight } from '../bomBuilder';
import type { BomDesignInput, SizeSpec } from '../types';

const premium: BomDesignInput = {
    isDual: false,
    topFoamEnabled: true, topFoamOptionId: 'TOP_70_2L',
    guardFoamEnabled: true, guardFoamThickness: 80, guardFoamHardness: '미디엄',
    bottomFoamEnabled: true, bottomFoamThickness: 30, bottomFoamHardness: '미디엄',
    coreId: 'V4_TPU', coverId: 'GENTLE_BREED', controllerId: 'IOT',
    sensorId: 'SENSOR_BAND_M', packagingId: 'ROLL',
};
const LK: SizeSpec = { size_preset_id: 'LK', width_mm: 1800, depth_mm: 2000 };

const find = (lines: ReturnType<typeof buildBom>['lines'], no: string) => lines.find(l => l.item_no === no)!;

describe('bomBuilder: 기획안 5.3 예시', () => {
    const { lines, unmapped } = buildBom(premium, LK);

    it('상단폼 높이 파싱', () => {
        expect(topFoamHeight('TOP_70_2L')).toBe(70);
        expect(topFoamHeight(null)).toBe(0);
    });
    it('레벨1 어셈블리 7개가 레벨2보다 먼저 온다', () => {
        const l1 = lines.filter(l => l.level === 1).map(l => l.item_no);
        expect(l1).toEqual(['FM-000', 'ST-000', 'CV-000', 'CT-000', 'SN-000', 'PK-000', 'SW-000']);
        const firstL2 = lines.findIndex(l => l.level === 2);
        expect(lines.slice(0, firstL2).every(l => l.level === 1)).toBe(true);
    });
    it('폼: 상단·가드·하단 치수', () => {
        expect(find(lines, 'FM-003')).toMatchObject({ parent_item_no: 'FM-000', quantity: 1, spec_text: '1800×2000×70' });
        const guard = find(lines, 'FM-014');
        expect(guard.quantity).toBe(4);
        expect(guard.dims).toEqual([
            { label: 'D', w: 80, d: 1840, h: 200, qty: 2 },
            { label: 'W', w: 80, d: 1800, h: 200, qty: 2 },
        ]);
        expect(guard.spec_text).toBe('D: 80×1840×200 ×2 / W: 80×1800×200 ×2');
        expect(find(lines, 'FM-021').spec_text).toBe('1800×2000×30');
    });
    it('스트링은 코어 치수, 커버는 총 높이', () => {
        expect(find(lines, 'ST-002')).toMatchObject({ quantity: 1, spec_text: '1640×1840×200' });
        expect(find(lines, 'CV-005')).toMatchObject({ quantity: 1, spec_text: '1800×2000×300' });
        expect(find(lines, 'CV-020').quantity).toBe(1);
        expect(find(lines, 'CV-021').quantity).toBe(1);
    });
    it('컨트롤러 본체 + 부속품, 에어호스는 컨트롤러 수 × 2', () => {
        expect(find(lines, 'CT-003').quantity).toBe(1);
        expect(find(lines, 'CT-010').quantity).toBe(1);
        expect(find(lines, 'CT-011').quantity).toBe(2);
        expect(find(lines, 'CT-012').quantity).toBe(1);
        expect(find(lines, 'CT-014').quantity).toBe(1);
        expect(lines.find(l => l.item_no === 'CT-013')).toBeUndefined(); // IoT Stick은 IOT_STICK 선택 시만
    });
    it('센서·포장·SW', () => {
        expect(find(lines, 'SN-002').quantity).toBe(1);
        expect(find(lines, 'PK-001')).toMatchObject({ alt_item_no: 'PK-002', dims: [{ w: 1800, d: 2000, h: 0, qty: 1 }] });
        expect(find(lines, 'PK-010').quantity).toBe(1);
        expect(find(lines, 'PK-011').quantity).toBe(1);
        expect(find(lines, 'SW-001').parent_item_no).toBe('SW-000');
        expect(find(lines, 'SW-003').quantity).toBe(1);
    });
    it('모든 줄은 wizard 소스, 미매핑 없음', () => {
        expect(lines.every(l => l.source === 'wizard')).toBe(true);
        expect(unmapped).toEqual([]);
    });
});

describe('bomBuilder: 변형', () => {
    it('Dual이면 스트링·컨트롤러·센서 ×2, 가드폼 5개, 에어호스 4개', () => {
        const { lines } = buildBom({ ...premium, isDual: true }, LK);
        expect(find(lines, 'ST-002').quantity).toBe(2);
        expect(find(lines, 'ST-002').spec_text).toBe('780×1840×200');
        expect(find(lines, 'FM-014').quantity).toBe(5);
        expect(find(lines, 'CT-003').quantity).toBe(2);
        expect(find(lines, 'CT-011').quantity).toBe(4);
        expect(find(lines, 'SN-002').quantity).toBe(2);
    });
    it('Basic 구조(폼 없음)는 FM-000 어셈블리도 없다', () => {
        const basic: BomDesignInput = { ...premium, topFoamEnabled: false, guardFoamEnabled: false, bottomFoamEnabled: false, controllerId: 'NUMBERING' };
        const { lines } = buildBom(basic, LK);
        expect(lines.find(l => l.item_no === 'FM-000')).toBeUndefined();
        expect(find(lines, 'ST-002').spec_text).toBe('1800×2000×200');
        expect(find(lines, 'CV-005').spec_text).toBe('1800×2000×200');
        expect(lines.find(l => l.item_no === 'SW-000')).toBeUndefined(); // Numbering은 SW 세트 없음
    });
    it('IOT_STICK 선택 시 CT-013 포함', () => {
        const { lines } = buildBom({ ...premium, controllerId: 'IOT_STICK' }, LK);
        expect(find(lines, 'CT-004').quantity).toBe(1);
        expect(find(lines, 'CT-013').quantity).toBe(1);
    });
    it('커스텀 옵션은 unmapped로 보고하고 줄은 만들지 않는다', () => {
        const { lines, unmapped } = buildBom({ ...premium, coverId: 'CUSTOM_COVER_1' }, LK);
        expect(lines.filter(l => l.level === 2 && /^CV-00\d$/.test(l.item_no))).toEqual([]);
        expect(unmapped).toEqual([{ step: '커버', optionKey: 'CUSTOM_COVER_1' }]);
        // 라벨은 커버 어셈블리 아래 그대로 남는다
        expect(find(lines, 'CV-020').parent_item_no).toBe('CV-000');
    });
    it('선택이 없는 단계는 어셈블리를 만들지 않는다', () => {
        const { lines } = buildBom({ ...premium, sensorId: null, packagingId: null }, LK);
        expect(lines.find(l => l.item_no === 'SN-000')).toBeUndefined();
        expect(lines.find(l => l.item_no === 'PK-000')).toBeUndefined();
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/lib/bom/__tests__/bomBuilder.test.ts`
Expected: FAIL — `Cannot find module '../bomBuilder'`

- [ ] **Step 3: `app/lib/bom/bomBuilder.ts` 작성**

```ts
// ============================================================
// 위자드 DesignState + 사이즈 → BOM 줄 (기획안 5장 규칙)
// 순수 함수. DB·React 의존 없음.
// ============================================================
import { calcCoreDimensions, CORE_DEFAULT_HEIGHT } from '../constants';
import { ASSEMBLY, AUTO_PARTS, IOT_CONTROLLERS, itemNoForOption, guardKey, bottomKey } from './codes';
import type { BomDesignInput, BomLine, Dim, SizeSpec, UnmappedOption } from './types';

/** 'TOP_70_2L' → 70. 없으면 0 */
export function topFoamHeight(optionId: string | null): number {
    if (!optionId) return 0;
    const n = parseInt(optionId.split('_')[1] || '0', 10);
    return Number.isFinite(n) ? n : 0;
}

const fmt = (d: Dim) => `${d.w}×${d.d}×${d.h}`;
function specText(dims: Dim[]): string {
    if (dims.length === 1 && !dims[0].label) return fmt(dims[0]);
    return dims.map(d => `${d.label ? d.label + ': ' : ''}${fmt(d)} ×${d.qty}`).join(' / ');
}

function line(partial: Partial<BomLine> & Pick<BomLine, 'item_no' | 'level' | 'parent_item_no' | 'quantity'>): BomLine {
    return {
        required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'wizard',
        ...partial,
    };
}

/** 치수 1건짜리 부품 줄 */
function partLine(itemNo: string, parent: string, w: number, d: number, h: number, qty = 1, extra: Partial<BomLine> = {}): BomLine {
    const dims: Dim[] = [{ w, d, h, qty }];
    return line({ item_no: itemNo, level: 2, parent_item_no: parent, quantity: qty, dims, spec_text: specText(dims), ...extra });
}

export function buildBom(design: BomDesignInput, size: SizeSpec): { lines: BomLine[]; unmapped: UnmappedOption[] } {
    const W = size.width_mm, D = size.depth_mm;
    const coreH = CORE_DEFAULT_HEIGHT;
    const topH = design.topFoamEnabled ? topFoamHeight(design.topFoamOptionId) : 0;
    const botH = design.bottomFoamEnabled ? design.bottomFoamThickness : 0;
    const totalH = topH + coreH + botH;
    const gfOn = design.guardFoamEnabled === true;
    const dims = calcCoreDimensions(W, D, design.guardFoamThickness, design.isDual, gfOn);
    const dualQty = design.isDual ? 2 : 1;

    const unmapped: UnmappedOption[] = [];
    const groups: { assembly: string; parts: BomLine[] }[] = [];
    const resolve = (step: string, key: string | null): string | null => {
        if (!key) return null;
        const no = itemNoForOption(key);
        if (!no) unmapped.push({ step, optionKey: key });
        return no;
    };

    // ── 폼 ──
    const foam: BomLine[] = [];
    if (design.topFoamEnabled && design.topFoamOptionId) {
        const no = resolve('상단폼', design.topFoamOptionId);
        if (no) foam.push(partLine(no, ASSEMBLY.FM, W, D, topH));
    }
    if (gfOn) {
        const no = resolve('가드폼', guardKey(design.guardFoamThickness, design.guardFoamHardness));
        if (no) {
            const t = design.guardFoamThickness;
            const gd: Dim[] = [
                { label: 'D', w: t, d: dims.guardD_len, h: coreH, qty: dims.guardD_count },
                { label: 'W', w: t, d: dims.guardW_len, h: coreH, qty: dims.guardW_count },
            ];
            foam.push(line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.FM, quantity: dims.guardD_count + dims.guardW_count, dims: gd, spec_text: specText(gd) }));
        }
    }
    if (design.bottomFoamEnabled) {
        const no = resolve('하단폼', bottomKey(design.bottomFoamThickness, design.bottomFoamHardness));
        if (no) foam.push(partLine(no, ASSEMBLY.FM, W, D, botH));
    }
    if (foam.length) groups.push({ assembly: ASSEMBLY.FM, parts: foam });

    // ── 스트링 ──
    if (design.coreId) {
        const no = resolve('스트링', design.coreId);
        if (no) groups.push({ assembly: ASSEMBLY.ST, parts: [partLine(no, ASSEMBLY.ST, dims.coreW, dims.coreD, coreH, dualQty)] });
    }

    // ── 커버 (스타일 + 라벨) ──
    if (design.coverId) {
        const no = resolve('커버', design.coverId);
        const parts: BomLine[] = [];
        if (no) parts.push(partLine(no, ASSEMBLY.CV, W, D, totalH));
        parts.push(line({ item_no: AUTO_PARTS.LABEL_LAW, level: 2, parent_item_no: ASSEMBLY.CV, quantity: 1 }));
        parts.push(line({ item_no: AUTO_PARTS.LABEL_LOGO, level: 2, parent_item_no: ASSEMBLY.CV, quantity: 1 }));
        groups.push({ assembly: ASSEMBLY.CV, parts });
    }

    // ── 컨트롤러 (본체 + 부속품) ──
    if (design.controllerId) {
        const no = resolve('컨트롤러', design.controllerId);
        const parts: BomLine[] = [];
        if (no) parts.push(line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.CT, quantity: dualQty }));
        parts.push(line({ item_no: AUTO_PARTS.ADAPTER, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        parts.push(line({ item_no: AUTO_PARTS.AIR_HOSE, level: 2, parent_item_no: ASSEMBLY.CT, quantity: dualQty * 2, note: dualQty === 2 ? '듀얼 좌/우 각 2개' : '좌/우 2개' }));
        parts.push(line({ item_no: AUTO_PARTS.MANUAL, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        if (design.controllerId === 'IOT_STICK') {
            parts.push(line({ item_no: AUTO_PARTS.IOT_STICK, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        }
        parts.push(line({ item_no: AUTO_PARTS.CTRL_BOX, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        groups.push({ assembly: ASSEMBLY.CT, parts });
    }

    // ── 센서 ──
    if (design.sensorId) {
        const no = resolve('센서', design.sensorId);
        if (no) groups.push({ assembly: ASSEMBLY.SN, parts: [line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.SN, quantity: dualQty })] });
    }

    // ── 포장 (방식 + 포장재). 포장방식은 WIDTH_STEP 단가용으로 W/D만 기록 ──
    if (design.packagingId) {
        const no = resolve('포장', design.packagingId);
        const parts: BomLine[] = [];
        if (no) {
            const alt = no === 'PK-001' ? 'PK-002' : no === 'PK-002' ? 'PK-001' : null;
            parts.push(partLine(no, ASSEMBLY.PK, W, D, 0, 1, { alt_item_no: alt, spec_text: null }));
        }
        parts.push(line({ item_no: AUTO_PARTS.PKG_BOX, level: 2, parent_item_no: ASSEMBLY.PK, quantity: 1 }));
        parts.push(line({ item_no: AUTO_PARTS.PKG_VINYL, level: 2, parent_item_no: ASSEMBLY.PK, quantity: 1 }));
        groups.push({ assembly: ASSEMBLY.PK, parts });
    }

    // ── APP/서버 (IoT 계열 컨트롤러일 때만) ──
    if (design.controllerId && IOT_CONTROLLERS.has(design.controllerId)) {
        groups.push({
            assembly: ASSEMBLY.SW,
            parts: [AUTO_PARTS.SW_ANDROID, AUTO_PARTS.SW_IOS, AUTO_PARTS.SW_SERVER_KR]
                .map(no => line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.SW, quantity: 1, note: no === AUTO_PARTS.SW_SERVER_KR ? 'KR 리전' : null })),
        });
    }

    // 레벨1 전부 → 레벨2 전부 (DB 트리거가 상위 존재를 검사하므로 순서 중요)
    const lines: BomLine[] = [
        ...groups.map(g => line({ item_no: g.assembly, level: 1, parent_item_no: null, quantity: 1 })),
        ...groups.flatMap(g => g.parts),
    ];
    return { lines, unmapped };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/lib/bom/__tests__/bomBuilder.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: 커밋**

```bash
git add app/lib/bom/bomBuilder.ts app/lib/bom/__tests__/bomBuilder.test.ts
git commit -m "feat(bom): 위자드 상태 → BOM 줄 변환기(bomBuilder) 추가"
```

---

### Task 3: pricing — AVL 단가로 견적 계산 (현행 수식과 동치)

**Files:**
- Create: `app/lib/bom/legacyPricing.ts`
- Create: `app/lib/bom/pricing.ts`
- Test: `app/lib/bom/__tests__/pricing.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `codes.ts` (Task 1), `bomBuilder.ts` (Task 2), `app/lib/pricingData.ts`의 `DEFAULT_PRICING_DATA`, `app/lib/pricingStore.ts`의 `usePricingStore` (테스트에서만)
- Produces: `legacyPricing.ts`의 `legacyAvlRows(): AvlPriceRow[]`, `LEGACY_VENDOR = 'V-000'`, `WIDTH_STEPS`
- Produces: `pricing.ts`의 `pickApprovedAvl(rows, itemNo)`, `priceLine(line, avl, width_mm)`, `priceBom(lines, avlRows, product)`, `DELIVERY_PRICES`

- [ ] **Step 1: 실패하는 테스트 작성 — `app/lib/bom/__tests__/pricing.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildBom } from '../bomBuilder';
import { priceBom, pickApprovedAvl, priceLine } from '../pricing';
import { legacyAvlRows } from '../legacyPricing';
import { usePricingStore } from '../../pricingStore';
import type { BomDesignInput, SizeSpec, AvlPriceRow, BomLine } from '../types';

const premium: BomDesignInput = {
    isDual: false,
    topFoamEnabled: true, topFoamOptionId: 'TOP_70_2L',
    guardFoamEnabled: true, guardFoamThickness: 80, guardFoamHardness: '미디엄',
    bottomFoamEnabled: true, bottomFoamThickness: 30, bottomFoamHardness: '미디엄',
    coreId: 'V4_TPU', coverId: 'GENTLE_BREED', controllerId: 'IOT',
    sensorId: 'SENSOR_BAND_M', packagingId: 'ROLL',
};
const sizes: SizeSpec[] = [
    { size_preset_id: 'SS', width_mm: 1100, depth_mm: 2000 },
    { size_preset_id: 'Q_KR', width_mm: 1500, depth_mm: 2000 },
    { size_preset_id: 'LK', width_mm: 1800, depth_mm: 2000 },
    { size_preset_id: 'K_US', width_mm: 1930, depth_mm: 2030 },
];
const avl = legacyAvlRows();

/** 현행 pricingStore 입력 형태로 변환 */
function legacyInput(d: BomDesignInput, s: SizeSpec, deliveryId: string | null) {
    return {
        sizePresetId: s.size_preset_id, customWidth: s.width_mm, customDepth: s.depth_mm,
        topFoamEnabled: d.topFoamEnabled, topFoamOptionId: d.topFoamOptionId,
        guardFoamEnabled: d.guardFoamEnabled, guardFoamThickness: d.guardFoamThickness,
        bottomFoamEnabled: d.bottomFoamEnabled, bottomFoamThickness: d.bottomFoamThickness,
        isDual: d.isDual, coreId: d.coreId, coverId: d.coverId, controllerId: d.controllerId,
        sensorId: d.sensorId, packagingId: d.packagingId, deliveryId,
    };
}

describe('pricing: 현행 calculateSummary와 동치', () => {
    const variants: { name: string; d: BomDesignInput }[] = [
        { name: 'premium single', d: premium },
        { name: 'premium dual', d: { ...premium, isDual: true } },
        { name: 'standard (상단폼만)', d: { ...premium, guardFoamEnabled: false, bottomFoamEnabled: false, controllerId: 'CTRL_1_6', packagingId: 'FOLD_3' } },
        { name: 'basic', d: { ...premium, topFoamEnabled: false, guardFoamEnabled: false, bottomFoamEnabled: false, coverId: 'COMPACT', controllerId: 'NUMBERING', sensorId: null } },
    ];
    for (const v of variants) for (const s of sizes) {
        it(`${v.name} / ${s.size_preset_id}`, () => {
            const { lines } = buildBom(v.d, s);
            const result = priceBom(lines, avl, { width_mm: s.width_mm, delivery_option: 'PARCEL' });
            const legacy = usePricingStore.getState().calculateSummary(legacyInput(v.d, s, 'PARCEL'));
            expect(result.total).toBe(legacy.totalUnitPrice);
            expect(result.warnings).toEqual([]);
        });
    }
});

describe('pricing: 단위 규칙', () => {
    it('승인 행 중 approved_at 최신을 고른다, 승인 없으면 null', () => {
        const rows: AvlPriceRow[] = [
            { item_no: 'X', vendor_code: 'A', approval_status: '승인', approved_at: '2026-01-01', price_type: 'FIXED', unit_price: 10, price_constant: 0, price_base: 0, price_steps: null },
            { item_no: 'X', vendor_code: 'B', approval_status: '승인', approved_at: '2026-06-01', price_type: 'FIXED', unit_price: 20, price_constant: 0, price_base: 0, price_steps: null },
            { item_no: 'X', vendor_code: 'C', approval_status: '후보', approved_at: '2026-12-01', price_type: 'FIXED', unit_price: 30, price_constant: 0, price_base: 0, price_steps: null },
        ];
        expect(pickApprovedAvl(rows, 'X')?.vendor_code).toBe('B');
        expect(pickApprovedAvl(rows, 'Y')).toBeNull();
    });
    it('AVL 없는 줄은 0원 + 경고', () => {
        const line: BomLine = { item_no: 'CV-099', level: 2, parent_item_no: 'CV-000', quantity: 2, required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'manual' };
        const p = priceLine(line, null, 1500);
        expect(p).toMatchObject({ total: 0, unit_price: 0, warning: '단가 미승인' });
    });
    it('VOLUME은 dims마다 floor(w×d×h×상수)+기본금 × qty 합산', () => {
        const line: BomLine = { item_no: 'FM-014', level: 2, parent_item_no: 'FM-000', quantity: 4, required: '필수', alt_item_no: null, spec_text: null, source: 'wizard', note: null,
            dims: [{ label: 'D', w: 80, d: 1840, h: 200, qty: 2 }, { label: 'W', w: 80, d: 1800, h: 200, qty: 2 }] };
        const row: AvlPriceRow = { item_no: 'FM-014', vendor_code: 'V-000', approval_status: '승인', approved_at: null, price_type: 'VOLUME', unit_price: 0, price_constant: 0.0003266, price_base: 0, price_steps: null };
        const p = priceLine(line, row, 1800);
        expect(p.total).toBe((Math.floor(80 * 1840 * 200 * 0.0003266) + 0) * 2 + (Math.floor(80 * 1800 * 200 * 0.0003266) + 0) * 2);
        expect(p.unit_price).toBe(p.total / 4);
    });
    it('WIDTH_STEP은 상품 폭으로 구간을 고르고 박스 규격을 남긴다', () => {
        const line: BomLine = { item_no: 'PK-001', level: 2, parent_item_no: 'PK-000', quantity: 1, required: '필수', alt_item_no: 'PK-002', spec_text: null, dims: null, note: null, source: 'wizard' };
        const row = avl.find(r => r.item_no === 'PK-001')!;
        expect(priceLine(line, row, 1100)).toMatchObject({ total: 7000, spec_note: 'Box: 1400×310×310' });
        expect(priceLine(line, row, 1500)).toMatchObject({ total: 8500 });
        expect(priceLine(line, row, 1800)).toMatchObject({ total: 13000, spec_note: 'Box: 2100×310×310' });
    });
    it('레벨1 어셈블리는 결과 줄에 포함하지 않는다', () => {
        const { lines } = buildBom(premium, sizes[2]);
        const r = priceBom(lines, avl, { width_mm: 1800, delivery_option: null });
        expect(r.lines.every(l => !l.item_no.endsWith('-000'))).toBe(true);
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/lib/bom/__tests__/pricing.test.ts`
Expected: FAIL — `Cannot find module '../pricing'`

- [ ] **Step 3: `app/lib/bom/legacyPricing.ts` 작성** — 현행 단가표를 AVL 행으로 변환. 시드 생성(Task 5)과 테스트가 함께 쓴다.

```ts
// ============================================================
// 현행 DEFAULT_PRICING_DATA → AVL 행 (협력사 V-000 기준단가)
// 시드 SQL 생성과 동치 테스트가 공유한다.
// ============================================================
import { DEFAULT_PRICING_DATA } from '../pricingData';
import { AUTO_PARTS, HARDNESS, guardKey, bottomKey, itemNoForOption } from './codes';
import type { AvlPriceRow } from './types';

export const LEGACY_VENDOR = 'V-000';
export const LEGACY_APPROVED_AT = '2026-01-01';

/** pricingStore.calculateSummary에 하드코딩돼 있던 폭 구간 단가 */
export const WIDTH_STEPS: Record<string, { maxWidth: number; price: number; boxSpec: string }[]> = {
    ROLL: [
        { maxWidth: 1100, price: 7000, boxSpec: 'Box: 1400×310×310' },
        { maxWidth: 1500, price: 8500, boxSpec: 'Box: 1800×310×310' },
        { maxWidth: 99999, price: 13000, boxSpec: 'Box: 2100×310×310' },
    ],
    FOLD_3: [
        { maxWidth: 1499, price: 12000, boxSpec: 'Box: 1100×410×410' },
        { maxWidth: 1700, price: 15000, boxSpec: 'Box: 1100×470×470' },
        { maxWidth: 99999, price: 18000, boxSpec: 'Box: 1200×550×550' },
    ],
};

function row(item_no: string, partial: Partial<AvlPriceRow>): AvlPriceRow {
    return {
        item_no, vendor_code: LEGACY_VENDOR, approval_status: '승인', approved_at: LEGACY_APPROVED_AT,
        price_type: 'FIXED', unit_price: 0, price_constant: 0, price_base: 0, price_steps: null, ...partial,
    };
}

export function legacyAvlRows(): AvlPriceRow[] {
    const out: AvlPriceRow[] = [];
    for (const cat of DEFAULT_PRICING_DATA) {
        if (cat.id === 'delivery') continue; // 배송은 BOM 밖
        for (const it of cat.items) {
            // 가드폼/하단폼: 두께 1개 → 경도 3개 품번으로 전개
            const keys: string[] =
                cat.id === 'foam_guard' ? HARDNESS.map(h => guardKey(parseInt(it.optionId.split('_')[1]), h)) :
                cat.id === 'foam_bottom' ? HARDNESS.map(h => bottomKey(parseInt(it.optionId.split('_')[1]), h)) :
                [it.optionId];
            for (const k of keys) {
                const no = itemNoForOption(k);
                if (!no) continue;
                if (it.formulaType === 'VOLUME') out.push(row(no, { price_type: 'VOLUME', price_constant: it.constant, price_base: it.basePrice }));
                else if (it.formulaType === 'WIDTH_STEP') out.push(row(no, { price_type: 'WIDTH_STEP', price_steps: WIDTH_STEPS[it.optionId] }));
                else out.push(row(no, { price_type: 'FIXED', unit_price: it.basePrice }));
            }
        }
    }
    // 자동 부품(라벨·어댑터·호스·매뉴얼·박스·비닐·SW)은 현행 단가표에 없으므로 0원 승인
    for (const no of Object.values(AUTO_PARTS)) out.push(row(no, { price_type: 'FIXED', unit_price: 0 }));
    return out;
}
```

- [ ] **Step 4: `app/lib/bom/pricing.ts` 작성**

```ts
// ============================================================
// BOM 줄 + AVL 행 → 견적 (기획안 6장). 순수 함수.
// 수식은 pricingStore.calculateSummary와 동일해야 한다.
// ============================================================
import type { AvlPriceRow, BomLine, PricedLine, QuoteResult } from './types';

/** 배송 옵션별 고정 단가 (현행 단가표: 전부 0) */
export const DELIVERY_PRICES: Record<string, number> = { SELF: 0, PARCEL: 0, CONTAINER: 0, PENDING: 0 };

/** 승인 행 중 approved_at 최신. null은 가장 오래된 것으로 취급 */
export function pickApprovedAvl(rows: AvlPriceRow[], itemNo: string): AvlPriceRow | null {
    const approved = rows.filter(r => r.item_no === itemNo && r.approval_status === '승인');
    if (approved.length === 0) return null;
    approved.sort((a, b) => (b.approved_at ?? '').localeCompare(a.approved_at ?? ''));
    return approved[0];
}

function volumePrice(w: number, d: number, h: number, row: AvlPriceRow): number {
    return Math.floor(w * d * h * row.price_constant) + row.price_base;
}

export function priceLine(line: BomLine, avl: AvlPriceRow | null, widthMm: number): PricedLine {
    const base: PricedLine = {
        item_no: line.item_no, quantity: line.quantity, vendor_code: null, price_type: null,
        unit_price: 0, total: 0, warning: null, spec_note: null,
    };
    if (!avl) return { ...base, warning: '단가 미승인' };

    let total = 0;
    let specNote: string | null = null;
    if (avl.price_type === 'FIXED') {
        total = avl.unit_price * line.quantity;
    } else if (avl.price_type === 'VOLUME') {
        if (!line.dims || line.dims.length === 0) return { ...base, vendor_code: avl.vendor_code, price_type: avl.price_type, warning: '치수 없음' };
        total = line.dims.reduce((sum, dm) => sum + volumePrice(dm.w, dm.d, dm.h, avl) * dm.qty, 0);
    } else {
        const steps = [...(avl.price_steps ?? [])].sort((a, b) => a.maxWidth - b.maxWidth);
        const step = steps.find(s => widthMm <= s.maxWidth) ?? steps[steps.length - 1];
        if (!step) return { ...base, vendor_code: avl.vendor_code, price_type: avl.price_type, warning: '폭 구간 없음' };
        total = step.price * line.quantity;
        specNote = step.boxSpec ?? null;
    }
    return {
        ...base, vendor_code: avl.vendor_code, price_type: avl.price_type,
        total, unit_price: line.quantity > 0 ? total / line.quantity : 0, spec_note: specNote,
    };
}

export function priceBom(
    lines: BomLine[],
    avlRows: AvlPriceRow[],
    product: { width_mm: number; delivery_option: string | null },
): QuoteResult {
    const priced = lines
        .filter(l => l.level === 2)
        .map(l => priceLine(l, pickApprovedAvl(avlRows, l.item_no), product.width_mm));
    const deliveryPrice = product.delivery_option ? (DELIVERY_PRICES[product.delivery_option] ?? 0) : 0;
    const warnings = priced.filter(p => p.warning).map(p => `${p.item_no}: ${p.warning}`);
    return {
        lines: priced,
        delivery: { option: product.delivery_option, price: deliveryPrice },
        total: priced.reduce((s, p) => s + p.total, 0) + deliveryPrice,
        warnings,
    };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run app/lib/bom/__tests__/pricing.test.ts`
Expected: PASS (16 동치 케이스 + 5 단위 규칙). 동치 케이스가 실패하면 `bomBuilder`의 치수 규칙이 `calculateSummary`와 어긋난 것이다. 이 계획 밖의 `pricingStore.ts`는 수정하지 말고 `bomBuilder`/`legacyPricing` 쪽을 고친다.

- [ ] **Step 6: 커밋**

```bash
git add app/lib/bom/pricing.ts app/lib/bom/legacyPricing.ts app/lib/bom/__tests__/pricing.test.ts
git commit -m "feat(bom): AVL 기반 견적 계산기(pricing) 및 현행 단가표 변환기 추가"
```

---

### Task 4: Supabase 스키마 마이그레이션

**Files:**
- Create: `supabase/migrations/0001_bom_schema.sql`
- Create: `supabase/README.md` (적용 절차)

**Interfaces:**
- Produces: 테이블 `code_values, employees, vendors, items, products, bom_lines, avl, npi_status, npi_status_history, ecn, ecn_products, documents`, 뷰 `v_product_progress`, 함수 `next_item_no(prefix, range_start, range_end)`, `bom_create_products(jsonb) returns text[]`, 스토리지 버킷 `documents`
- 컬럼 이름은 기획안 4장과 `types.ts`의 필드명을 그대로 쓴다 (API가 매핑 없이 저장한다).

- [ ] **Step 1: 마이그레이션 SQL 작성 — `supabase/migrations/0001_bom_schema.sql`**

```sql
-- ============================================================
-- BOM 통합 1차 스키마 (기획안 4장)
-- ============================================================

-- 코드표 (ENUM 대신 테이블. 관리자가 UI에서 값 추가)
create table if not exists code_values (
    code_type   text not null,
    value       text not null,
    sort_order  int  not null default 0,
    active      boolean not null default true,
    primary key (code_type, value)
);

create table if not exists employees (
    employee_id  text primary key,          -- E-001
    name         text not null,
    department   text,
    title        text,
    email        text,
    phone        text,
    role         text not null default 'viewer',  -- admin/pm/purchasing/engineer/quality/viewer
    auth_user_id uuid unique,               -- auth.users.id (로그인 계정 연결)
    note         text
);

create table if not exists vendors (
    vendor_code  text primary key,          -- V-001
    name         text not null,
    vendor_type  text,
    country      text,
    contact_name text,
    phone        text,
    email        text,
    main_items   text,
    note         text
);

create table if not exists items (
    item_no            text primary key
                       check (item_no ~ '^(CV|FM|ST|CT|SN|PK|SW)-[0-9]{3}$'),
    name               text not null,
    category           text not null,
    subcategory        text,
    item_type          text not null,
    spec               text,
    unit               text not null default 'EA',
    revision           text not null default 'A',
    spec_url           text,
    memo               text,
    wizard_option_key  text unique,         -- 위자드 옵션 ID (TOP_70_2L, GUARD_80_미디엄 …)
    attributes         jsonb,
    created_at         date not null default current_date,
    -- 접두어와 대분류 일치
    constraint items_prefix_category check (
        category = case left(item_no, 2)
            when 'CV' then '커버' when 'FM' then '폼' when 'ST' then '스트링'
            when 'CT' then '컨트롤러' when 'SN' then '센서' when 'PK' then '포장'
            when 'SW' then 'APP' end
    )
);

create table if not exists products (
    product_code       text primary key,    -- MAT-001-LK
    model_code         text not null,       -- MAT-001
    name               text not null,
    family             text,
    status             text not null default '기획',
    launch_target_date date,
    pm_id              text references employees(employee_id),
    cover_split_count  int  not null default 2,
    size_preset_id     text not null,
    width_mm           int  not null,
    depth_mm           int  not null,
    is_dual            boolean not null default false,
    delivery_option    text,
    design_snapshot    jsonb,
    note               text,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    constraint products_code_format check (product_code = model_code || '-' || size_preset_id)
);
create index if not exists products_model_idx on products(model_code);

create table if not exists bom_lines (
    product_code   text not null references products(product_code) on delete cascade,
    item_no        text not null references items(item_no),
    level          int  not null check (level in (1, 2)),
    parent_item_no text references items(item_no),
    quantity       numeric not null check (quantity > 0),
    required       text not null default '필수',
    alt_item_no    text references items(item_no),
    spec_text      text,
    dims           jsonb,                   -- [{w,d,h,qty,label?}] 단가 계산용
    note           text,
    source         text not null default 'manual',  -- wizard | manual
    primary key (product_code, item_no),
    constraint bom_lines_parent_rule check ((level = 1 and parent_item_no is null) or (level = 2 and parent_item_no is not null))
);

-- 상위 품번은 같은 상품 BOM 안에 있어야 한다
create or replace function bom_lines_check_parent() returns trigger language plpgsql as $$
begin
    if new.level = 2 and not exists (
        select 1 from bom_lines where product_code = new.product_code and item_no = new.parent_item_no
    ) then
        raise exception '상위 품번 %가 상품 %의 BOM에 없습니다', new.parent_item_no, new.product_code;
    end if;
    return new;
end $$;
drop trigger if exists trg_bom_lines_parent on bom_lines;
create trigger trg_bom_lines_parent before insert or update on bom_lines
    for each row execute function bom_lines_check_parent();

create table if not exists avl (
    item_no         text not null references items(item_no),
    vendor_code     text not null references vendors(vendor_code),
    owner_id        text references employees(employee_id),
    approval_status text not null default '후보',
    lead_time_days  int,
    moq             int,
    unit_price      numeric not null default 0,
    currency        text not null default 'KRW',
    approved_at     date,
    price_type      text not null default 'FIXED' check (price_type in ('FIXED', 'VOLUME', 'WIDTH_STEP')),
    price_constant  numeric not null default 0,
    price_base      numeric not null default 0,
    price_steps     jsonb,
    note            text,
    primary key (item_no, vendor_code)
);

create table if not exists npi_status (
    product_code   text not null references products(product_code) on delete cascade,
    item_no        text not null references items(item_no),
    owner_id       text references employees(employee_id),
    stage          text not null default '기획',
    progress       numeric(3,2) not null default 0 check (progress between 0 and 1),
    start_date     date,
    target_date    date,
    issue_status   text not null default '없음',
    issue_detail   text,
    next_milestone text,
    weight         numeric not null default 1,
    updated_at     timestamptz not null default now(),
    note           text,
    primary key (product_code, item_no)
);

create table if not exists npi_status_history (
    id           bigserial primary key,
    product_code text not null,
    item_no      text not null,
    stage        text,
    progress     numeric(3,2),
    issue_status text,
    recorded_at  timestamptz not null default now()
);

create table if not exists ecn (
    ecn_no       text primary key,           -- ECN-2026-001
    ecn_date     date not null default current_date,
    item_no      text not null references items(item_no),
    change_type  text,
    rev_from     text,
    rev_to       text,
    before_text  text,
    after_text   text,
    reason       text,
    requester_id text references employees(employee_id),
    approver_id  text references employees(employee_id),
    status       text not null default '요청',
    note         text
);

create table if not exists ecn_products (
    ecn_no       text not null references ecn(ecn_no) on delete cascade,
    product_code text not null references products(product_code) on delete cascade,
    primary key (ecn_no, product_code)
);

create table if not exists documents (
    doc_id        bigserial primary key,
    doc_type      text not null check (doc_type in ('quote', 'dev_request')),
    model_code    text not null,
    product_codes text[] not null,
    file_path     text not null,             -- storage: documents/<path>
    total_price   numeric,
    created_by    uuid,
    created_at    timestamptz not null default now()
);

-- 상품별완성률 (사양서 3.4)
create or replace view v_product_progress as
select
    p.product_code, p.model_code, p.name, p.status,
    count(n.item_no)                                              as item_count,
    case when count(n.item_no) = 0 then null
         else sum(n.progress * n.weight) / nullif(sum(n.weight), 0) end as progress_total,
    avg(n.progress) filter (where i.category = '커버')            as progress_cover,
    avg(n.progress) filter (where i.category = '폼')              as progress_foam,
    avg(n.progress) filter (where i.category = '스트링')          as progress_string,
    avg(n.progress) filter (where i.category = '컨트롤러')        as progress_controller,
    avg(n.progress) filter (where i.category = '센서')            as progress_sensor,
    avg(n.progress) filter (where i.category = '포장')            as progress_packaging,
    avg(n.progress) filter (where i.category = 'APP')             as progress_app,
    count(*) filter (where n.stage = '기획')                      as cnt_plan,
    count(*) filter (where n.stage = 'EVT')                       as cnt_evt,
    count(*) filter (where n.stage = 'DVT')                       as cnt_dvt,
    count(*) filter (where n.stage = 'PVT')                       as cnt_pvt,
    count(*) filter (where n.stage = 'MP(양산)')                  as cnt_mp,
    count(*) filter (where n.issue_status in ('진행중', '지연'))  as cnt_issue
from products p
left join npi_status n on n.product_code = p.product_code
left join items i on i.item_no = n.item_no
group by p.product_code, p.model_code, p.name, p.status;

-- 접두어별 자동 채번: 범위 안 최대 번호 + 1
create or replace function next_item_no(p_prefix text, p_start int default 1, p_end int default 999)
returns text language sql stable as $$
    select p_prefix || '-' || lpad((coalesce(max(substring(item_no from 4)::int), p_start - 1) + 1)::text, 3, '0')
    from items
    where item_no like p_prefix || '-%'
      and substring(item_no from 4)::int between p_start and p_end;
$$;

-- 상품 + BOM 원자적 생성. 입력: [{product_code, model_code, name, ..., bom_lines:[{item_no, level, ...}]}]
create or replace function bom_create_products(p_products jsonb)
returns text[] language plpgsql as $$
declare
    rec   jsonb;
    line  jsonb;
    codes text[] := '{}';
begin
    for rec in select * from jsonb_array_elements(p_products) loop
        insert into products (product_code, model_code, name, family, status, pm_id, cover_split_count,
                              size_preset_id, width_mm, depth_mm, is_dual, delivery_option, design_snapshot, note)
        values (rec->>'product_code', rec->>'model_code', rec->>'name', rec->>'family',
                coalesce(rec->>'status', '기획'), rec->>'pm_id', coalesce((rec->>'cover_split_count')::int, 2),
                rec->>'size_preset_id', (rec->>'width_mm')::int, (rec->>'depth_mm')::int,
                coalesce((rec->>'is_dual')::boolean, false), rec->>'delivery_option', rec->'design_snapshot', rec->>'note');
        for line in select * from jsonb_array_elements(coalesce(rec->'bom_lines', '[]'::jsonb)) loop
            insert into bom_lines (product_code, item_no, level, parent_item_no, quantity, required,
                                   alt_item_no, spec_text, dims, note, source)
            values (rec->>'product_code', line->>'item_no', (line->>'level')::int, line->>'parent_item_no',
                    (line->>'quantity')::numeric, coalesce(line->>'required', '필수'), line->>'alt_item_no',
                    line->>'spec_text', line->'dims', line->>'note', coalesce(line->>'source', 'wizard'));
        end loop;
        codes := array_append(codes, rec->>'product_code');
    end loop;
    return codes;
end $$;

-- updated_at 자동 갱신
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated before update on products for each row execute function set_updated_at();

-- RLS: 1차는 로그인 사용자 전원 읽기/쓰기 (역할 강제는 3차)
do $$
declare t text;
begin
    for t in select unnest(array['code_values','employees','vendors','items','products','bom_lines','avl',
                                 'npi_status','npi_status_history','ecn','ecn_products','documents']) loop
        execute format('alter table %I enable row level security', t);
        execute format('drop policy if exists %I on %I', t || '_authenticated_all', t);
        execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_authenticated_all', t);
    end loop;
end $$;

-- 문서 저장 버킷 (비공개, signed URL로 다운로드)
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;
drop policy if exists documents_authenticated_all on storage.objects;
create policy documents_authenticated_all on storage.objects for all to authenticated
    using (bucket_id = 'documents') with check (bucket_id = 'documents');
```

- [ ] **Step 2: 적용 절차 문서 — `supabase/README.md`**

````markdown
# Supabase 스키마 적용

프로젝트 ref: `jkeisufqjemsnqamiqlv`

## 방법 A: Supabase CLI (권장)
```bash
npx supabase login                       # 브라우저에서 access token 발급 (1회)
npx supabase link --project-ref jkeisufqjemsnqamiqlv
npx supabase db push                     # supabase/migrations/*.sql 적용
```
시드는 `npm run seed:gen`으로 `supabase/seed/seed.sql`을 만든 뒤 대시보드 SQL Editor에 붙여 넣거나
`npx supabase db query --file supabase/seed/seed.sql`로 적용한다.

## 방법 B: 대시보드 SQL Editor
`supabase/migrations/0001_bom_schema.sql` → `supabase/seed/seed.sql` 순서로 붙여 넣어 실행한다.

## 확인 쿼리
```sql
select count(*) from items;             -- 시드 후 60 이상
select next_item_no('CV', 1, 9);        -- 'CV-008'
select * from v_product_progress;       -- 빈 결과 (상품 없음)
```
````

- [ ] **Step 3: SQL 괄호 짝 검증** — CLI 로그인 전이므로 문법 대신 최소 검증만 한다.

Run (Git Bash):
```bash
node -e "const s=require('fs').readFileSync('supabase/migrations/0001_bom_schema.sql','utf8'); const o=(s.match(/\(/g)||[]).length, c=(s.match(/\)/g)||[]).length; console.log('parens', o, c); if(o!==c) process.exit(1)"
```
Expected: `parens N N` (같은 수), 종료코드 0.

- [ ] **Step 4: 실제 적용 (사용자 작업 필요)**

`npx supabase login`은 브라우저 인증이 필요하므로 사용자가 직접 수행한 뒤 아래를 실행한다. 사용자가 CLI 대신 대시보드 SQL Editor를 택하면 `supabase/README.md` 방법 B를 따른다.

Run: `npx supabase db push`
Expected: `Applying migration 0001_bom_schema.sql... Finished supabase db push.`

Run: `npx supabase db query "select next_item_no('CV',1,9)"`
Expected: `CV-001` (시드 전)

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0001_bom_schema.sql supabase/README.md
git commit -m "feat(bom): Supabase 스키마 마이그레이션(테이블·뷰·함수·RLS) 추가"
```

---

### Task 5: 시드 SQL 생성기 (constants → items/avl/code_values)

**Files:**
- Create: `app/lib/bom/seed.ts`
- Create: `scripts/genSeed.ts`
- Create: `supabase/seed/seed.sql` (생성물)
- Test: `app/lib/bom/__tests__/seed.test.ts`

**Interfaces:**
- Consumes: `app/lib/constants.ts`의 `TOP_FOAM_OPTIONS, CORE_OPTIONS, COVER_OPTIONS, CONTROLLER_OPTIONS, SENSOR_OPTIONS, PACKAGING_OPTIONS`; `codes.ts`; `legacyPricing.ts`
- Produces: `seed.ts`의 `seedItems(): SeedItem[]`, `buildSeedSql(): string`

- [ ] **Step 1: 실패하는 테스트 작성 — `app/lib/bom/__tests__/seed.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { seedItems, buildSeedSql } from '../seed';
import { OPTION_ITEM_MAP, AUTO_PARTS, ASSEMBLY } from '../codes';

describe('seed', () => {
    const items = seedItems();
    it('매핑표의 모든 품번과 자동 부품·어셈블리가 품목에 있다', () => {
        const nos = new Set(items.map(i => i.item_no));
        for (const no of Object.values(OPTION_ITEM_MAP)) expect(nos.has(no), no).toBe(true);
        for (const no of Object.values(AUTO_PARTS)) expect(nos.has(no), no).toBe(true);
        for (const no of Object.values(ASSEMBLY)) expect(nos.has(no), no).toBe(true);
        expect(items.length).toBe(55);
    });
    it('품번은 유일하고 접두어·대분류가 맞는다', () => {
        expect(new Set(items.map(i => i.item_no)).size).toBe(items.length);
        expect(items.find(i => i.item_no === 'FM-014')).toMatchObject({ category: '폼', name: '가드폼 80mm 미디엄', wizard_option_key: 'GUARD_80_미디엄' });
        expect(items.find(i => i.item_no === 'SW-001')).toMatchObject({ category: 'APP', revision: '1.0.0', unit: '-' });
        expect(items.find(i => i.item_no === 'PK-001')).toMatchObject({ item_type: '포장사양', wizard_option_key: 'ROLL' });
    });
    it('SQL은 코드표·협력사·담당자·품목·AVL을 모두 포함하고 따옴표를 이스케이프한다', () => {
        const sql = buildSeedSql();
        expect(sql).toContain("insert into code_values");
        expect(sql).toContain("('V-000', '기준단가(협력사 미지정)'");
        expect(sql).toContain("('E-001', '김OO'");
        expect(sql).toContain("('FM-003', '상단폼 70mm (2Layer 5:2)'");
        expect(sql).toContain("insert into avl");
        expect(sql).toContain("'WIDTH_STEP'");
        expect((sql.match(/on conflict/g) || []).length).toBeGreaterThanOrEqual(5);
    });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/lib/bom/__tests__/seed.test.ts`
Expected: FAIL — `Cannot find module '../seed'`

- [ ] **Step 3: `app/lib/bom/seed.ts` 작성**

```ts
// ============================================================
// 시드 데이터: 코드표 · 협력사 · 담당자 · 품목 · V-000 AVL
// constants.ts를 유일한 원천으로 삼아 SQL을 생성한다.
// ============================================================
import {
    TOP_FOAM_OPTIONS, CORE_OPTIONS, COVER_OPTIONS,
    CONTROLLER_OPTIONS, SENSOR_OPTIONS, PACKAGING_OPTIONS,
} from '../constants';
import { ASSEMBLY, AUTO_PARTS, HARDNESS, GUARD_THICKNESS, BOTTOM_THICKNESS, guardKey, bottomKey, itemNoForOption, PREFIX_CATEGORY, prefixOf } from './codes';
import { legacyAvlRows } from './legacyPricing';

export interface SeedItem {
    item_no: string; name: string; category: string; subcategory: string | null; item_type: string;
    spec: string | null; unit: string; revision: string; memo: string | null;
    wizard_option_key: string | null; attributes: Record<string, unknown> | null;
}

const item = (item_no: string, name: string, p: Partial<SeedItem> = {}): SeedItem => ({
    item_no, name, category: PREFIX_CATEGORY[prefixOf(item_no)], subcategory: null, item_type: '부품',
    spec: null, unit: 'EA', revision: 'A', memo: null, wizard_option_key: null, attributes: null, ...p,
});

export function seedItems(): SeedItem[] {
    const out: SeedItem[] = [];
    // 어셈블리
    const asmName: Record<string, string> = { CV: '커버 어셈블리', FM: '폼 어셈블리', ST: '스트링 어셈블리', CT: '컨트롤러 어셈블리', SN: '센서 어셈블리', PK: '완제품 포장 어셈블리', SW: 'APP/서버 세트' };
    for (const [pfx, no] of Object.entries(ASSEMBLY)) out.push(item(no, asmName[pfx], { item_type: '어셈블리', subcategory: '어셈블리', unit: 'SET' }));
    // 폼
    for (const o of TOP_FOAM_OPTIONS) out.push(item(itemNoForOption(o.id)!, `상단폼 ${o.label}`, { subcategory: '상단폼', spec: o.description, wizard_option_key: o.id, attributes: { thickness: o.thickness, layers: o.layers } }));
    for (const t of GUARD_THICKNESS) for (const h of HARDNESS) out.push(item(itemNoForOption(guardKey(t, h))!, `가드폼 ${t}mm ${h}`, { subcategory: '가드폼', wizard_option_key: guardKey(t, h), attributes: { thickness: t, hardness: h } }));
    for (const t of BOTTOM_THICKNESS) for (const h of HARDNESS) out.push(item(itemNoForOption(bottomKey(t, h))!, `하단폼 ${t}mm ${h}`, { subcategory: '하단폼', wizard_option_key: bottomKey(t, h), attributes: { thickness: t, hardness: h } }));
    // 스트링
    for (const o of CORE_OPTIONS) out.push(item(itemNoForOption(o.id)!, `${o.label} 에어셀`, { subcategory: '에어셀', spec: o.description, wizard_option_key: o.id, attributes: { material: o.material, height: o.height } }));
    // 커버 스타일 + 단가표에만 있는 올케어 + 라벨
    for (const o of COVER_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '커버', spec: o.description, wizard_option_key: o.id, attributes: { grade: o.grade, coverTopThickness: o.coverTopThickness } }));
    out.push(item(itemNoForOption('ALL_CARE')!, '올케어 스타일', { subcategory: '커버', wizard_option_key: 'ALL_CARE', attributes: { grade: '중' } }));
    out.push(item(AUTO_PARTS.LABEL_LAW, '로우라벨 (법정표시)', { subcategory: '라벨', memo: 'KC/세탁표시 등' }));
    out.push(item(AUTO_PARTS.LABEL_LOGO, '로고라벨', { subcategory: '라벨' }));
    // 컨트롤러 본체 + 부속품
    for (const o of CONTROLLER_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '본체', spec: o.description, wizard_option_key: o.id }));
    out.push(item(AUTO_PARTS.ADAPTER, '어댑터', { subcategory: '전원', memo: '인증(KC) 여부 확인' }));
    out.push(item(AUTO_PARTS.AIR_HOSE, '에어호스', { subcategory: '배관' }));
    out.push(item(AUTO_PARTS.MANUAL, '매뉴얼', { subcategory: '문서', item_type: '문서' }));
    out.push(item(AUTO_PARTS.IOT_STICK, 'IoT Stick', { subcategory: '통신', memo: 'FW 버전은 ECN으로 추적' }));
    out.push(item(AUTO_PARTS.CTRL_BOX, '컨트롤러 포장박스', { subcategory: '포장재', item_type: '포장재' }));
    // 센서
    for (const o of SENSOR_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '센서', spec: o.description, wizard_option_key: o.id }));
    // 포장
    for (const o of PACKAGING_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '포장사양', item_type: '포장사양', unit: '-', spec: o.description, wizard_option_key: o.id }));
    out.push(item(AUTO_PARTS.PKG_BOX, '완제품 포장박스', { subcategory: '박스', item_type: '포장재' }));
    out.push(item(AUTO_PARTS.PKG_VINYL, '포장비닐', { subcategory: '비닐', item_type: '포장재' }));
    // APP/서버
    const sw = (no: string, name: string, sub: string, memo: string | null = null) => item(no, name, { subcategory: sub, item_type: '소프트웨어', unit: '-', revision: '1.0.0', memo });
    out.push(sw(AUTO_PARTS.SW_ANDROID, 'Android 앱', '모바일앱'));
    out.push(sw(AUTO_PARTS.SW_IOS, 'iOS 앱', '모바일앱'));
    out.push(sw(AUTO_PARTS.SW_SERVER_KR, '서버 - KR 리전', '서버'));
    out.push(sw('SW-004', '서버 - US 리전', '서버', '해외 출시 시 사용'));
    return out;
}

export const CODE_VALUES: Record<string, string[]> = {
    category: ['커버', '폼', '스트링', '컨트롤러', '센서', '포장', 'APP'],
    item_type: ['어셈블리', '부품', '포장재', '포장사양', '문서', '소프트웨어'],
    dev_stage: ['기획', 'EVT', 'DVT', 'PVT', 'MP(양산)', '단종'],
    approval_status: ['후보', '샘플평가', '승인', '보류', '탈락'],
    product_status: ['기획', '개발', '양산', '단종'],
    issue_status: ['없음', '진행중', '지연', '해결'],
    vendor_type: ['제조', 'OEM/ODM', '소프트웨어', '인쇄', '물류', '기타'],
    change_type: ['사양변경', '제조사변경', '도면변경', 'SW버전', '포장변경', '기타'],
    required: ['필수', '옵션'],
    app_role: ['admin', 'pm', 'purchasing', 'engineer', 'quality', 'viewer'],
};

const VENDORS: [string, string, string, string, string][] = [
    ['V-000', '기준단가(협력사 미지정)', '기타', 'KR', '현행 단가표 이관용. 실제 협력사 승인 시 대체됨'],
    ['V-001', 'OO텍스타일', '제조', 'KR', '예시 데이터'],
    ['V-002', 'OO폼', '제조', 'KR', '예시 데이터'],
    ['V-003', 'OO전자', 'OEM/ODM', 'CN', '예시 데이터'],
    ['V-004', 'OO패키지', '인쇄', 'KR', '예시 데이터'],
    ['V-005', '(자체개발)', '소프트웨어', 'KR', '예시 데이터'],
];

const EMPLOYEES: [string, string, string, string, string][] = [
    ['E-001', '김OO', '상품기획', 'PM', 'pm'],
    ['E-002', '이OO', '커버개발', '과장', 'engineer'],
    ['E-003', '박OO', 'H/W개발', '차장', 'engineer'],
    ['E-004', '최OO', 'S/W개발', '팀장', 'engineer'],
    ['E-005', '정OO', '구매/포장', '대리', 'purchasing'],
];

/** SQL 문자열 리터럴 (null 허용) */
const q = (v: unknown): string =>
    v === null || v === undefined ? 'null' :
    typeof v === 'number' ? String(v) :
    typeof v === 'boolean' ? (v ? 'true' : 'false') :
    typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb` :
    `'${String(v).replace(/'/g, "''")}'`;

export function buildSeedSql(): string {
    const L: string[] = ['-- 생성물: npm run seed:gen (app/lib/bom/seed.ts). 직접 편집하지 말 것.', ''];

    L.push('insert into code_values (code_type, value, sort_order) values');
    L.push(Object.entries(CODE_VALUES).flatMap(([t, vs]) => vs.map((v, i) => `  (${q(t)}, ${q(v)}, ${i})`)).join(',\n'));
    L.push('on conflict (code_type, value) do update set sort_order = excluded.sort_order;', '');

    L.push('insert into vendors (vendor_code, name, vendor_type, country, note) values');
    L.push(VENDORS.map(v => `  (${v.map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (vendor_code) do update set name = excluded.name, vendor_type = excluded.vendor_type;', '');

    L.push('insert into employees (employee_id, name, department, title, role) values');
    L.push(EMPLOYEES.map(e => `  (${e.map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (employee_id) do update set name = excluded.name, department = excluded.department, title = excluded.title;', '');

    L.push('insert into items (item_no, name, category, subcategory, item_type, spec, unit, revision, memo, wizard_option_key, attributes) values');
    L.push(seedItems().map(i => `  (${[i.item_no, i.name, i.category, i.subcategory, i.item_type, i.spec, i.unit, i.revision, i.memo, i.wizard_option_key, i.attributes].map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (item_no) do update set name = excluded.name, subcategory = excluded.subcategory, item_type = excluded.item_type, spec = excluded.spec, unit = excluded.unit, wizard_option_key = excluded.wizard_option_key, attributes = excluded.attributes;', '');

    L.push('insert into avl (item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps, currency, note) values');
    L.push(legacyAvlRows().map(r => `  (${[r.item_no, r.vendor_code, r.approval_status, r.approved_at, r.price_type, r.unit_price, r.price_constant, r.price_base, r.price_steps, 'KRW', '현행 단가표 이관'].map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (item_no, vendor_code) do update set price_type = excluded.price_type, unit_price = excluded.unit_price, price_constant = excluded.price_constant, price_base = excluded.price_base, price_steps = excluded.price_steps;', '');

    return L.join('\n');
}
```

- [ ] **Step 4: `scripts/genSeed.ts` 작성**

```ts
// supabase/seed/seed.sql 생성. 실행: npm run seed:gen
import fs from 'fs';
import path from 'path';
import { buildSeedSql } from '../app/lib/bom/seed';

const out = path.join(process.cwd(), 'supabase', 'seed', 'seed.sql');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buildSeedSql(), 'utf8');
console.log(`시드 SQL 생성: ${out}`);
```

- [ ] **Step 5: 테스트 통과 및 시드 생성**

Run: `npx vitest run app/lib/bom/__tests__/seed.test.ts`
Expected: PASS (3 tests)

Run: `npm run seed:gen`
Expected: `시드 SQL 생성: ...\supabase\seed\seed.sql`. 생성 파일 확인:
```bash
wc -l supabase/seed/seed.sql
```
Expected: 120줄 이상 (코드표 51 + 협력사 6 + 담당자 5 + 품목 55 + AVL 47 행).

- [ ] **Step 6: 커밋**

```bash
git add app/lib/bom/seed.ts scripts/genSeed.ts supabase/seed/seed.sql app/lib/bom/__tests__/seed.test.ts
git commit -m "feat(bom): 시드 SQL 생성기(품목·코드표·협력사·V-000 AVL) 추가"
```

---

### Task 6: 시드 적용과 DB 검증 (사용자 작업 포함)

**Files:** 없음 (DB 상태 변경)

- [ ] **Step 1: 시드 적용** — Task 4 Step 4에서 CLI를 연결했다면:

Run: `npx supabase db query --file supabase/seed/seed.sql`
Expected: 오류 없이 종료. (대시보드 SQL Editor를 쓰는 경우 `supabase/seed/seed.sql` 내용을 붙여 넣어 실행)

- [ ] **Step 2: 검증 쿼리**

```sql
select count(*) from items;                               -- 55
select count(*) from avl where vendor_code = 'V-000';     -- 40 이상
select next_item_no('CV', 1, 9);                          -- 'CV-008'
select next_item_no('FM', 10, 19);                        -- 'FM-016'
select item_no from items where wizard_option_key = 'GUARD_80_미디엄';  -- FM-014
```

- [ ] **Step 3: 원자 생성 함수 검증** — 기획안 5.3 예시를 함수에 직접 넣어 본다.

```sql
select bom_create_products('[{
  "product_code":"MAT-TEST-LK","model_code":"MAT-TEST","name":"함수 검증","size_preset_id":"LK",
  "width_mm":1800,"depth_mm":2000,"is_dual":false,"delivery_option":"PARCEL",
  "bom_lines":[
    {"item_no":"FM-000","level":1,"parent_item_no":null,"quantity":1},
    {"item_no":"FM-003","level":2,"parent_item_no":"FM-000","quantity":1,"spec_text":"1800×2000×70","dims":[{"w":1800,"d":2000,"h":70,"qty":1}]}
  ]}]'::jsonb);
select count(*) from bom_lines where product_code = 'MAT-TEST-LK';   -- 2
-- 상위 없는 레벨2는 거부되어야 한다
select bom_create_products('[{"product_code":"MAT-BAD-LK","model_code":"MAT-BAD","name":"x","size_preset_id":"LK","width_mm":1,"depth_mm":1,
  "bom_lines":[{"item_no":"FM-003","level":2,"parent_item_no":"FM-000","quantity":1}]}]'::jsonb);
-- Expected: ERROR 상위 품번 FM-000가 상품 MAT-BAD-LK의 BOM에 없습니다
delete from products where model_code in ('MAT-TEST', 'MAT-BAD');
```

---

### Task 7: API 공통 헬퍼 (인증 + 마스터 CRUD 팩토리)

**Files:**
- Create: `app/api/bom/_lib/auth.ts`
- Create: `app/api/bom/_lib/master.ts`
- Test: `app/lib/bom/__tests__/master.test.ts`

**Interfaces:**
- Consumes: `app/lib/supabase/server.ts`의 `createClient()`
- Produces: `auth.ts`의 `requireUser(): Promise<{ supabase, user } | { error: NextResponse }>`
- Produces: `master.ts`의 `masterHandlers(cfg: MasterConfig)` → `{ list, create, get, update, remove }` (Next Route Handler 시그니처), `pickColumns(body, columns)`

- [ ] **Step 1: `app/api/bom/_lib/auth.ts` 작성**

```ts
// 로그인 사용자 확인. 미로그인은 401.
import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function requireUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) } as const;
    }
    return { supabase, user } as const;
}

/** Supabase 오류를 JSON 응답으로 */
export function dbError(e: { message: string; code?: string }, status = 400) {
    return NextResponse.json({ error: e.message, code: e.code }, { status });
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — `app/lib/bom/__tests__/master.test.ts`**

`pickColumns`만 순수 함수로 검증한다 (핸들러는 Supabase 연결이 필요하므로 `tsc`와 1B 화면에서 확인).

```ts
import { describe, it, expect } from 'vitest';
import { pickColumns } from '../../../api/bom/_lib/master';

describe('pickColumns', () => {
    it('허용 컬럼만 남기고 undefined는 버린다', () => {
        expect(pickColumns({ name: 'a', evil: 1, note: undefined, spec: null }, ['name', 'note', 'spec']))
            .toEqual({ name: 'a', spec: null });
    });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run app/lib/bom/__tests__/master.test.ts`
Expected: FAIL — `Cannot find module`

- [ ] **Step 4: `app/api/bom/_lib/master.ts` 작성**

```ts
// ============================================================
// 마스터 테이블 CRUD 핸들러 팩토리 (items/vendors/employees 공용)
// ============================================================
import { NextResponse } from 'next/server';
import { requireUser, dbError } from './auth';

export interface MasterConfig {
    table: string;
    pk: string;
    columns: string[];        // 쓰기 허용 컬럼 (pk 포함)
    searchColumns?: string[]; // ?q= 검색 대상
    orderBy?: string;
    validate?: (row: Record<string, unknown>, isCreate: boolean) => string | null; // 오류 메시지 또는 null
}

export function pickColumns(body: Record<string, unknown>, columns: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const c of columns) if (body[c] !== undefined) out[c] = body[c];
    return out;
}

type Ctx = { params: Promise<{ id: string }> };

export function masterHandlers(cfg: MasterConfig) {
    const order = cfg.orderBy ?? cfg.pk;

    async function list(req: Request) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const url = new URL(req.url);
        const q = url.searchParams.get('q');
        let query = auth.supabase.from(cfg.table).select('*').order(order);
        // 단순 동등 필터: ?category=폼 처럼 컬럼명=값
        for (const [k, v] of url.searchParams) {
            if (k !== 'q' && cfg.columns.includes(k)) query = query.eq(k, v);
        }
        if (q && cfg.searchColumns?.length) {
            query = query.or(cfg.searchColumns.map(c => `${c}.ilike.%${q}%`).join(','));
        }
        const { data, error } = await query;
        if (error) return dbError(error, 500);
        return NextResponse.json(data);
    }

    async function create(req: Request) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const row = pickColumns(await req.json(), cfg.columns);
        if (!row[cfg.pk]) return NextResponse.json({ error: `${cfg.pk}는 필수입니다.` }, { status: 400 });
        const msg = cfg.validate?.(row, true);
        if (msg) return NextResponse.json({ error: msg }, { status: 400 });
        const { data, error } = await auth.supabase.from(cfg.table).insert(row).select().single();
        if (error) return dbError(error, error.code === '23505' ? 409 : 400);
        return NextResponse.json(data, { status: 201 });
    }

    async function get(_req: Request, { params }: Ctx) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const { id } = await params;
        const { data, error } = await auth.supabase.from(cfg.table).select('*').eq(cfg.pk, id).maybeSingle();
        if (error) return dbError(error, 500);
        if (!data) return NextResponse.json({ error: '없는 항목입니다.' }, { status: 404 });
        return NextResponse.json(data);
    }

    async function update(req: Request, { params }: Ctx) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const { id } = await params;
        const row = pickColumns(await req.json(), cfg.columns.filter(c => c !== cfg.pk));
        const msg = cfg.validate?.(row, false);
        if (msg) return NextResponse.json({ error: msg }, { status: 400 });
        const { data, error } = await auth.supabase.from(cfg.table).update(row).eq(cfg.pk, id).select().maybeSingle();
        if (error) return dbError(error);
        if (!data) return NextResponse.json({ error: '없는 항목입니다.' }, { status: 404 });
        return NextResponse.json(data);
    }

    async function remove(_req: Request, { params }: Ctx) {
        const auth = await requireUser();
        if ('error' in auth) return auth.error;
        const { id } = await params;
        const { error } = await auth.supabase.from(cfg.table).delete().eq(cfg.pk, id);
        // 23503 = FK 위반 (참조 중)
        if (error) return dbError(error, error.code === '23503' ? 409 : 400);
        return NextResponse.json({ ok: true });
    }

    return { list, create, get, update, remove };
}
```

- [ ] **Step 5: 테스트·타입 확인**

Run: `npx vitest run app/lib/bom/__tests__/master.test.ts && npx tsc --noEmit`
Expected: PASS, tsc 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add app/api/bom/_lib/auth.ts app/api/bom/_lib/master.ts app/lib/bom/__tests__/master.test.ts
git commit -m "feat(bom): API 인증 헬퍼 및 마스터 CRUD 팩토리 추가"
```

---

### Task 8: 마스터 API (items / vendors / employees) + 상품 목록

**Files:**
- Create: `app/api/bom/_lib/configs.ts`
- Create: `app/api/bom/items/route.ts`, `app/api/bom/items/[id]/route.ts`, `app/api/bom/items/next-no/route.ts`
- Create: `app/api/bom/vendors/route.ts`, `app/api/bom/vendors/[id]/route.ts`
- Create: `app/api/bom/employees/route.ts`, `app/api/bom/employees/[id]/route.ts`
- Create: `app/api/bom/products/route.ts`

**Interfaces:**
- Consumes: `masterHandlers`, `requireUser`, `dbError` (Task 7), DB 함수 `next_item_no` (Task 4)
- Produces (HTTP):
  - `GET /api/bom/items?q=&category=` → `Item[]`, `POST /api/bom/items` → `Item`
  - `GET|PATCH|DELETE /api/bom/items/{item_no}`
  - `GET /api/bom/items/next-no?prefix=CV&start=1&end=9` → `{ item_no: 'CV-008' }`
  - vendors/employees 동일 패턴
  - `GET /api/bom/products?model_code=` → `{ model_code, products: Product[] }[]`

- [ ] **Step 1: `app/api/bom/_lib/configs.ts` 작성**

```ts
import type { MasterConfig } from './master';

export const ITEM_NO_RE = /^(CV|FM|ST|CT|SN|PK|SW)-\d{3}$/;

export const ITEMS: MasterConfig = {
    table: 'items', pk: 'item_no',
    columns: ['item_no', 'name', 'category', 'subcategory', 'item_type', 'spec', 'unit', 'revision', 'spec_url', 'memo', 'wizard_option_key', 'attributes'],
    searchColumns: ['item_no', 'name'],
    validate: (row, isCreate) => {
        if (isCreate && !ITEM_NO_RE.test(String(row.item_no))) return '품번 형식 오류 (예: CV-001)';
        if (isCreate && !row.name) return '품명은 필수입니다.';
        return null;
    },
};

export const VENDORS: MasterConfig = {
    table: 'vendors', pk: 'vendor_code',
    columns: ['vendor_code', 'name', 'vendor_type', 'country', 'contact_name', 'phone', 'email', 'main_items', 'note'],
    searchColumns: ['vendor_code', 'name', 'main_items'],
    validate: (row, isCreate) => (isCreate && !row.name ? '협력사명은 필수입니다.' : null),
};

export const EMPLOYEES: MasterConfig = {
    table: 'employees', pk: 'employee_id',
    columns: ['employee_id', 'name', 'department', 'title', 'email', 'phone', 'role', 'auth_user_id', 'note'],
    searchColumns: ['employee_id', 'name', 'department'],
    validate: (row) => {
        const roles = ['admin', 'pm', 'purchasing', 'engineer', 'quality', 'viewer'];
        if (row.role !== undefined && !roles.includes(String(row.role))) return `role은 ${roles.join('/')} 중 하나여야 합니다.`;
        return null;
    },
};
```

- [ ] **Step 2: 라우트 파일 6개 작성**

`app/api/bom/items/route.ts`
```ts
import { masterHandlers } from '../_lib/master';
import { ITEMS } from '../_lib/configs';
const h = masterHandlers(ITEMS);
export const GET = h.list;
export const POST = h.create;
```
`app/api/bom/items/[id]/route.ts`
```ts
import { masterHandlers } from '../../_lib/master';
import { ITEMS } from '../../_lib/configs';
const h = masterHandlers(ITEMS);
export const GET = h.get;
export const PATCH = h.update;
export const DELETE = h.remove;
```
`app/api/bom/vendors/route.ts` — 위와 같되 `VENDORS` 사용:
```ts
import { masterHandlers } from '../_lib/master';
import { VENDORS } from '../_lib/configs';
const h = masterHandlers(VENDORS);
export const GET = h.list;
export const POST = h.create;
```
`app/api/bom/vendors/[id]/route.ts`
```ts
import { masterHandlers } from '../../_lib/master';
import { VENDORS } from '../../_lib/configs';
const h = masterHandlers(VENDORS);
export const GET = h.get;
export const PATCH = h.update;
export const DELETE = h.remove;
```
`app/api/bom/employees/route.ts`
```ts
import { masterHandlers } from '../_lib/master';
import { EMPLOYEES } from '../_lib/configs';
const h = masterHandlers(EMPLOYEES);
export const GET = h.list;
export const POST = h.create;
```
`app/api/bom/employees/[id]/route.ts`
```ts
import { masterHandlers } from '../../_lib/master';
import { EMPLOYEES } from '../../_lib/configs';
const h = masterHandlers(EMPLOYEES);
export const GET = h.get;
export const PATCH = h.update;
export const DELETE = h.remove;
```

- [ ] **Step 3: 자동 채번 — `app/api/bom/items/next-no/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { ITEM_PREFIXES } from '../../../../lib/bom/codes';

export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    const prefix = u.searchParams.get('prefix') ?? '';
    const start = parseInt(u.searchParams.get('start') ?? '1', 10);
    const end = parseInt(u.searchParams.get('end') ?? '999', 10);
    if (!(ITEM_PREFIXES as string[]).includes(prefix)) return NextResponse.json({ error: `prefix는 ${ITEM_PREFIXES.join('/')} 중 하나` }, { status: 400 });
    const { data, error } = await auth.supabase.rpc('next_item_no', { p_prefix: prefix, p_start: start, p_end: end });
    if (error) return dbError(error, 500);
    return NextResponse.json({ item_no: data });
}
```

- [ ] **Step 4: 상품 목록 — `app/api/bom/products/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../_lib/auth';

/** GET /api/bom/products?model_code=MAT-001&status=개발 → model_code로 그룹 */
export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    let q = auth.supabase.from('products')
        .select('product_code, model_code, name, family, status, launch_target_date, pm_id, size_preset_id, width_mm, depth_mm, is_dual, delivery_option, created_at, updated_at')
        .order('model_code').order('width_mm');
    const model = u.searchParams.get('model_code');
    const status = u.searchParams.get('status');
    if (model) q = q.eq('model_code', model);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return dbError(error, 500);
    const groups = new Map<string, typeof data>();
    for (const p of data) {
        if (!groups.has(p.model_code)) groups.set(p.model_code, []);
        groups.get(p.model_code)!.push(p);
    }
    return NextResponse.json([...groups.entries()].map(([model_code, products]) => ({ model_code, products })));
}
```

- [ ] **Step 5: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add app/api/bom
git commit -m "feat(bom): 품목·협력사·담당자 마스터 API, 자동 채번, 상품 목록 API 추가"
```

---

### Task 9: 위자드 → 상품+BOM 생성 API, 상품 상세, AVL API

**Files:**
- Create: `app/lib/bom/tree.ts`
- Test: `app/lib/bom/__tests__/tree.test.ts`
- Create: `app/api/bom/products/from-design/route.ts`
- Create: `app/api/bom/products/[code]/route.ts`
- Create: `app/api/bom/avl/route.ts`

**Interfaces:**
- Consumes: `buildBom` (Task 2), DB 함수 `bom_create_products` (Task 4), `requireUser`
- Produces: `tree.ts`의 `toTree<T extends { level: number; item_no: string; parent_item_no: string | null }>(lines: T[]): (T & { children: T[] })[]`
- Produces (HTTP):
  - `POST /api/bom/products/from-design` body `{ model_code?, name, family?, pm_id?, sizes: SizeSpec[], design: BomDesignInput & { deliveryId: string|null }, snapshot: unknown }` → `{ product_codes: string[], model_code, unmapped: UnmappedOption[] }`
  - `GET /api/bom/products/{code}` → `{ product, lines: BomLineRow[], tree }`, `PATCH` (name/status/family/pm_id/note/delivery_option/launch_target_date), `DELETE`
  - `GET /api/bom/avl?item_no=` → AVL 행 + 협력사명/담당자명/품명, `POST /api/bom/avl` (upsert), `DELETE /api/bom/avl?item_no=&vendor_code=`

- [ ] **Step 1: 실패하는 테스트 — `app/lib/bom/__tests__/tree.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { toTree } from '../tree';

describe('toTree', () => {
    it('레벨1 아래에 레벨2를 붙이고 순서를 보존한다', () => {
        const t = toTree([
            { level: 1, item_no: 'FM-000', parent_item_no: null },
            { level: 1, item_no: 'ST-000', parent_item_no: null },
            { level: 2, item_no: 'ST-002', parent_item_no: 'ST-000' },
            { level: 2, item_no: 'FM-003', parent_item_no: 'FM-000' },
        ]);
        expect(t.map(n => n.item_no)).toEqual(['FM-000', 'ST-000']);
        expect(t[0].children.map(c => c.item_no)).toEqual(['FM-003']);
        expect(t[1].children.map(c => c.item_no)).toEqual(['ST-002']);
    });
    it('상위가 없는 레벨2는 루트로 올린다 (데이터 오류 가시화)', () => {
        const t = toTree([{ level: 2, item_no: 'X-001', parent_item_no: 'X-000' }]);
        expect(t[0].item_no).toBe('X-001');
    });
});
```

- [ ] **Step 2: 테스트 실패 확인** — Run: `npx vitest run app/lib/bom/__tests__/tree.test.ts` → FAIL `Cannot find module '../tree'`

- [ ] **Step 3: `app/lib/bom/tree.ts` 작성**

```ts
// BOM 평면 줄 → 2단계 트리
export function toTree<T extends { level: number; item_no: string; parent_item_no: string | null }>(lines: T[]): (T & { children: T[] })[] {
    const roots: (T & { children: T[] })[] = [];
    const byNo = new Map<string, T & { children: T[] }>();
    for (const l of lines) if (l.level === 1) { const n = { ...l, children: [] as T[] }; roots.push(n); byNo.set(l.item_no, n); }
    for (const l of lines) if (l.level !== 1) {
        const p = l.parent_item_no ? byNo.get(l.parent_item_no) : undefined;
        if (p) p.children.push(l); else roots.push({ ...l, children: [] });
    }
    return roots;
}
```

- [ ] **Step 4: 테스트 통과 확인** — Run: `npx vitest run app/lib/bom/__tests__/tree.test.ts` → PASS

- [ ] **Step 5: `app/api/bom/products/from-design/route.ts` 작성**

```ts
// 위자드 상태 + 사이즈 목록 → 사이즈별 상품 + BOM 원자 생성
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { buildBom } from '../../../../lib/bom/bomBuilder';
import type { BomDesignInput, SizeSpec } from '../../../../lib/bom/types';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Body {
    model_code?: string;
    name: string;
    family?: string;
    pm_id?: string;
    sizes: SizeSpec[];
    design: BomDesignInput & { deliveryId: string | null };
    snapshot: unknown;   // useDesignStore 전체 상태 (재오픈용)
}

/** MAT-### 다음 번호 */
async function nextModelCode(supabase: SupabaseClient) {
    const { data } = await supabase.from('products').select('model_code').like('model_code', 'MAT-%').order('model_code', { ascending: false }).limit(1);
    const last = data?.[0]?.model_code as string | undefined;
    const n = last ? parseInt(last.slice(4), 10) + 1 : 1;
    return `MAT-${String(n).padStart(3, '0')}`;
}

export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const body = (await req.json()) as Body;

    if (!body.name?.trim()) return NextResponse.json({ error: '상품명은 필수입니다.' }, { status: 400 });
    if (!Array.isArray(body.sizes) || body.sizes.length === 0) return NextResponse.json({ error: '사이즈를 1개 이상 선택하세요.' }, { status: 400 });
    for (const s of body.sizes) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(s.size_preset_id) || !(s.width_mm > 0) || !(s.depth_mm > 0)) {
            return NextResponse.json({ error: `사이즈 형식 오류: ${JSON.stringify(s)}` }, { status: 400 });
        }
    }
    if (body.model_code && !/^[A-Z0-9]+-[A-Z0-9]+$/.test(body.model_code)) return NextResponse.json({ error: '모델코드 형식 오류 (예: MAT-001)' }, { status: 400 });

    const model_code = body.model_code ?? await nextModelCode(auth.supabase);
    const built = body.sizes.map(s => ({ size: s, ...buildBom(body.design, s) }));
    const unmapped = built[0].unmapped;

    const p_products = built.map(({ size, lines }) => ({
        product_code: `${model_code}-${size.size_preset_id}`,
        model_code, name: body.name.trim(), family: body.family ?? null, status: '기획', pm_id: body.pm_id ?? null,
        cover_split_count: 2,
        size_preset_id: size.size_preset_id, width_mm: size.width_mm, depth_mm: size.depth_mm,
        is_dual: body.design.isDual, delivery_option: body.design.deliveryId,
        design_snapshot: body.snapshot ?? null,
        note: unmapped.length ? `품번 미발급 옵션: ${unmapped.map(u => `${u.step}=${u.optionKey}`).join(', ')}` : null,
        bom_lines: lines,
    }));

    const { data, error } = await auth.supabase.rpc('bom_create_products', { p_products });
    if (error) return dbError(error, error.code === '23505' ? 409 : 400);
    return NextResponse.json({ product_codes: data, model_code, unmapped }, { status: 201 });
}
```

- [ ] **Step 6: `app/api/bom/products/[code]/route.ts` 작성**

```ts
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { pickColumns } from '../../_lib/master';
import { toTree } from '../../../../lib/bom/tree';

type Ctx = { params: Promise<{ code: string }> };
const BOM_SELECT = 'product_code, item_no, level, parent_item_no, quantity, required, alt_item_no, spec_text, dims, note, source, items(name, unit, category, revision)';

export async function GET(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const { data: product, error: e1 } = await auth.supabase.from('products').select('*').eq('product_code', code).maybeSingle();
    if (e1) return dbError(e1, 500);
    if (!product) return NextResponse.json({ error: '없는 상품입니다.' }, { status: 404 });
    const { data: lines, error: e2 } = await auth.supabase.from('bom_lines').select(BOM_SELECT).eq('product_code', code).order('level').order('item_no');
    if (e2) return dbError(e2, 500);
    return NextResponse.json({ product, lines, tree: toTree(lines) });
}

export async function PATCH(req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const row = pickColumns(await req.json(), ['name', 'family', 'status', 'launch_target_date', 'pm_id', 'cover_split_count', 'delivery_option', 'note']);
    const { data, error } = await auth.supabase.from('products').update(row).eq('product_code', code).select().maybeSingle();
    if (error) return dbError(error);
    if (!data) return NextResponse.json({ error: '없는 상품입니다.' }, { status: 404 });
    return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const { error } = await auth.supabase.from('products').delete().eq('product_code', code); // bom_lines는 cascade
    if (error) return dbError(error);
    return NextResponse.json({ ok: true });
}
```

- [ ] **Step 7: `app/api/bom/avl/route.ts` 작성**

```ts
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../_lib/auth';
import { pickColumns } from '../_lib/master';

const COLS = ['item_no', 'vendor_code', 'owner_id', 'approval_status', 'lead_time_days', 'moq', 'unit_price', 'currency', 'approved_at', 'price_type', 'price_constant', 'price_base', 'price_steps', 'note'];
const SELECT = '*, items(name, category), vendors(name), employees(name)';

export async function GET(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    let q = auth.supabase.from('avl').select(SELECT).order('item_no').order('vendor_code');
    const itemNo = u.searchParams.get('item_no');
    const vendor = u.searchParams.get('vendor_code');
    if (itemNo) q = q.eq('item_no', itemNo);
    if (vendor) q = q.eq('vendor_code', vendor);
    const { data, error } = await q;
    if (error) return dbError(error, 500);
    return NextResponse.json(data);
}

/** POST = upsert (item_no, vendor_code) */
export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const row = pickColumns(await req.json(), COLS);
    if (!row.item_no || !row.vendor_code) return NextResponse.json({ error: 'item_no, vendor_code는 필수입니다.' }, { status: 400 });
    if (row.price_type !== undefined && !['FIXED', 'VOLUME', 'WIDTH_STEP'].includes(String(row.price_type))) return NextResponse.json({ error: 'price_type은 FIXED/VOLUME/WIDTH_STEP' }, { status: 400 });
    if (row.price_type === 'WIDTH_STEP' && !Array.isArray(row.price_steps)) return NextResponse.json({ error: 'WIDTH_STEP은 price_steps 배열이 필요합니다.' }, { status: 400 });
    if (row.approval_status === '승인' && !row.approved_at) row.approved_at = new Date().toISOString().slice(0, 10);
    const { data, error } = await auth.supabase.from('avl').upsert(row, { onConflict: 'item_no,vendor_code' }).select(SELECT).single();
    if (error) return dbError(error);
    return NextResponse.json(data);
}

export async function DELETE(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const u = new URL(req.url);
    const itemNo = u.searchParams.get('item_no'), vendor = u.searchParams.get('vendor_code');
    if (!itemNo || !vendor) return NextResponse.json({ error: 'item_no, vendor_code 쿼리가 필요합니다.' }, { status: 400 });
    const { error } = await auth.supabase.from('avl').delete().eq('item_no', itemNo).eq('vendor_code', vendor);
    if (error) return dbError(error);
    return NextResponse.json({ ok: true });
}
```

- [ ] **Step 8: 타입 확인** — Run: `npx tsc --noEmit` → 오류 없음

- [ ] **Step 9: 커밋**

```bash
git add app/lib/bom/tree.ts app/lib/bom/__tests__/tree.test.ts app/api/bom/products app/api/bom/avl
git commit -m "feat(bom): 위자드→상품/BOM 생성 API, 상품 상세·AVL API 추가"
```

---

### Task 10: 견적 계산 API + 모델 견적서 xlsx 생성(Storage 저장)

**Files:**
- Create: `app/lib/bom/quoteSpecs.ts`
- Test: `app/lib/bom/__tests__/quoteSpecs.test.ts`
- Create: `app/lib/bom/quoteXlsx.ts`
- Create: `app/api/bom/products/[code]/quote/route.ts`
- Create: `app/api/bom/documents/quote/route.ts`

**Interfaces:**
- Consumes: `priceBom` (Task 3), `topFoamHeight` (Task 2), 기존 `resource/견적포맷.xlsx`, ExcelJS
- Produces: `quoteSpecs.ts`의 `specLines(lines: { level:number; item_no:string; quantity:number; spec_text:string|null; items:{name:string; category:string}|null }[]): string[]`, `SIZE_LABEL: Record<string,string>`
- Produces: `quoteXlsx.ts`의 `fillQuoteTemplate(input: { coverName: string; title: string; specsList: string[]; sizeData: { label: string; w: number; d: number; h: number; price: number }[] }): Promise<Buffer>`
- Produces (HTTP): `GET /api/bom/products/{code}/quote` → `QuoteResult & { lines: (PricedLine & { name: string })[] }`; `POST /api/bom/documents/quote` body `{ model_code, title?, condition?: { laborRate, materialRate, salesRate, marginRate } }` → `{ doc_id, url, sizes: { product_code, label, price }[] }`

- [ ] **Step 1: 실패하는 테스트 — `app/lib/bom/__tests__/quoteSpecs.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { specLines, SIZE_LABEL } from '../quoteSpecs';

describe('specLines', () => {
    it('레벨2 줄을 대분류별로 묶어 견적서 구성 문구를 만든다', () => {
        const out = specLines([
            { level: 1, item_no: 'FM-000', quantity: 1, spec_text: null, items: { name: '폼 어셈블리', category: '폼' } },
            { level: 2, item_no: 'FM-003', quantity: 1, spec_text: '1800×2000×70', items: { name: '상단폼 70mm (2Layer 5:2)', category: '폼' } },
            { level: 2, item_no: 'FM-014', quantity: 4, spec_text: 'D: …', items: { name: '가드폼 80mm 미디엄', category: '폼' } },
            { level: 2, item_no: 'ST-002', quantity: 2, spec_text: '780×1840×200', items: { name: 'V4 TPU 에어셀', category: '스트링' } },
            { level: 2, item_no: 'CV-020', quantity: 1, spec_text: null, items: { name: '로우라벨 (법정표시)', category: '커버' } },
        ]);
        expect(out).toEqual([
            '- 폼: 상단폼 70mm (2Layer 5:2), 가드폼 80mm 미디엄 ×4',
            '- 스트링: V4 TPU 에어셀 ×2 (780×1840×200)',
            '- 커버: 로우라벨 (법정표시)',
        ]);
    });
    it('사이즈 라벨', () => {
        expect(SIZE_LABEL.Q_KR).toBe('Q');
        expect(SIZE_LABEL.CK).toBe('CK');
    });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npx vitest run app/lib/bom/__tests__/quoteSpecs.test.ts` → FAIL

- [ ] **Step 3: `app/lib/bom/quoteSpecs.ts` 작성**

```ts
// 견적서 "구성" 문구: BOM 레벨2 줄을 대분류 순서로 요약
const CATEGORY_ORDER = ['폼', '스트링', '커버', '컨트롤러', '센서', '포장', 'APP'];

export const SIZE_LABEL: Record<string, string> = {
    SS: 'SS', Q_KR: 'Q', K_KR: 'K', LK: 'LK', TW: 'T', FU: 'F', Q_US: 'Q', K_US: 'K', CK: 'CK',
};

export interface SpecLineInput {
    level: number; item_no: string; quantity: number; spec_text: string | null;
    items: { name: string; category: string } | null;
}

export function specLines(lines: SpecLineInput[]): string[] {
    const byCat = new Map<string, string[]>();
    for (const l of lines) {
        if (l.level !== 2 || !l.items) continue;
        const qty = l.quantity > 1 ? ` ×${l.quantity}` : '';
        // 치수는 스트링(코어)만 표기. 폼·커버는 사이즈별로 달라 생략
        const spec = l.items.category === '스트링' && l.spec_text ? ` (${l.spec_text})` : '';
        if (!byCat.has(l.items.category)) byCat.set(l.items.category, []);
        byCat.get(l.items.category)!.push(`${l.items.name}${qty}${spec}`);
    }
    return CATEGORY_ORDER.filter(c => byCat.has(c)).map(c => `- ${c}: ${byCat.get(c)!.join(', ')}`);
}
```

- [ ] **Step 4: 통과 확인** — Run: `npx vitest run app/lib/bom/__tests__/quoteSpecs.test.ts` → PASS

- [ ] **Step 5: `app/lib/bom/quoteXlsx.ts` 작성** — 기존 `app/api/quote/generate/route.ts`의 채우기 로직을 그대로 옮긴다 (기존 라우트는 수정하지 않는다).

```ts
// 견적포맷.xlsx 템플릿 채우기 (기존 /api/quote/generate와 동일한 셀 배치)
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';

export interface QuoteTemplateInput {
    coverName: string;
    title: string;
    specsList: string[];
    sizeData: { label: string; w: number; d: number; h: number; price: number }[];
}

export async function fillQuoteTemplate(input: QuoteTemplateInput): Promise<Buffer> {
    const filePath = path.join(process.cwd(), 'resource', '견적포맷.xlsx');
    if (!fs.existsSync(filePath)) throw new Error('견적포맷.xlsx 파일을 찾을 수 없습니다.');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    const startRow = 33;
    input.sizeData.forEach((s, i) => {
        const row = ws.getRow(startRow + i);
        // B(2) 분류, C(3) 모델명, D(4) 구성, E(5) 규격, F(6) D, G(7) W, H(8) H, I(9) 공급가
        row.getCell(5).value = s.label;
        row.getCell(6).value = s.d;
        row.getCell(7).value = s.w;
        row.getCell(8).value = s.h;
        row.getCell(9).value = s.price;
        row.getCell(9).numFmt = '#,##0';
        row.commit();
    });
    const c2 = ws.getCell(startRow, 2); c2.value = input.coverName; c2.alignment = { vertical: 'middle', horizontal: 'center' };
    const c3 = ws.getCell(startRow, 3); c3.value = input.title || 'MDT-000'; c3.alignment = { vertical: 'middle', horizontal: 'center' };
    const c4 = ws.getCell(startRow, 4); c4.value = input.specsList.join('\n'); c4.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
}
```

- [ ] **Step 6: `app/api/bom/products/[code]/quote/route.ts` 작성**

```ts
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../../_lib/auth';
import { priceBom } from '../../../../../lib/bom/pricing';
import type { AvlPriceRow, BomLine } from '../../../../../lib/bom/types';

type Ctx = { params: Promise<{ code: string }> };

/** 상품 1개의 BOM을 AVL 승인 단가로 계산 */
export async function GET(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { code } = await params;
    const { data: product, error: e1 } = await auth.supabase.from('products').select('product_code, width_mm, delivery_option').eq('product_code', code).maybeSingle();
    if (e1) return dbError(e1, 500);
    if (!product) return NextResponse.json({ error: '없는 상품입니다.' }, { status: 404 });
    const { data: lines, error: e2 } = await auth.supabase.from('bom_lines').select('*, items(name)').eq('product_code', code).order('level').order('item_no');
    if (e2) return dbError(e2, 500);
    const itemNos = lines.map(l => l.item_no);
    const { data: avl, error: e3 } = await auth.supabase.from('avl').select('item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps').in('item_no', itemNos);
    if (e3) return dbError(e3, 500);
    const result = priceBom(lines as BomLine[], avl as AvlPriceRow[], product);
    const nameOf = new Map(lines.map(l => [l.item_no, (l.items as { name: string } | null)?.name ?? '']));
    return NextResponse.json({ ...result, lines: result.lines.map(l => ({ ...l, name: nameOf.get(l.item_no) ?? '' })) });
}
```

- [ ] **Step 7: `app/api/bom/documents/quote/route.ts` 작성**

```ts
// 모델(model_code)의 사이즈 상품 전체로 견적서 xlsx 생성 → Storage 저장 → documents 기록
import { NextResponse } from 'next/server';
import { requireUser, dbError } from '../../_lib/auth';
import { priceBom } from '../../../../lib/bom/pricing';
import { topFoamHeight } from '../../../../lib/bom/bomBuilder';
import { specLines, SIZE_LABEL } from '../../../../lib/bom/quoteSpecs';
import { fillQuoteTemplate } from '../../../../lib/bom/quoteXlsx';
import { CORE_DEFAULT_HEIGHT } from '../../../../lib/constants';
import type { AvlPriceRow, BomLine } from '../../../../lib/bom/types';

interface Condition { laborRate: number; materialRate: number; salesRate: number; marginRate: number }
interface Body { model_code: string; title?: string; condition?: Condition }

export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const body = (await req.json()) as Body;
    if (!body.model_code) return NextResponse.json({ error: 'model_code는 필수입니다.' }, { status: 400 });

    const { data: products, error: e1 } = await auth.supabase.from('products').select('*').eq('model_code', body.model_code).order('width_mm');
    if (e1) return dbError(e1, 500);
    if (!products?.length) return NextResponse.json({ error: '해당 모델의 상품이 없습니다.' }, { status: 404 });

    const codes = products.map(p => p.product_code);
    const { data: allLines, error: e2 } = await auth.supabase.from('bom_lines').select('*, items(name, category)').in('product_code', codes).order('level').order('item_no');
    if (e2) return dbError(e2, 500);
    const { data: avl, error: e3 } = await auth.supabase.from('avl').select('item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps').in('item_no', [...new Set(allLines.map(l => l.item_no))]);
    if (e3) return dbError(e3, 500);

    const cond = body.condition;
    const applyCondition = (cost: number) => {
        if (!cond) return cost;
        const subtotal = cost * (1 + (cond.laborRate + cond.materialRate + cond.salesRate) / 100);
        return Math.round(subtotal * (1 + cond.marginRate / 100));
    };

    const warnings: string[] = [];
    const sizes = products.map(p => {
        const lines = allLines.filter(l => l.product_code === p.product_code) as (BomLine & { items: { name: string; category: string } | null })[];
        const q = priceBom(lines, avl as AvlPriceRow[], p);
        warnings.push(...q.warnings.map(w => `${p.product_code} ${w}`));
        const snap = (p.design_snapshot ?? {}) as { topFoamEnabled?: boolean; topFoamOptionId?: string | null; bottomFoamEnabled?: boolean; bottomFoamThickness?: number };
        const h = (snap.topFoamEnabled ? topFoamHeight(snap.topFoamOptionId ?? null) : 0) + CORE_DEFAULT_HEIGHT + (snap.bottomFoamEnabled ? (snap.bottomFoamThickness ?? 0) : 0);
        return { product_code: p.product_code, label: SIZE_LABEL[p.size_preset_id] ?? p.size_preset_id, w: p.width_mm, d: p.depth_mm, h, price: applyCondition(q.total), lines };
    });

    const first = sizes[0];
    const coverLine = first.lines.find(l => l.level === 2 && l.items?.category === '커버' && !l.item_no.startsWith('CV-02'));
    const title = body.title ?? products[0].name;
    const buffer = await fillQuoteTemplate({
        coverName: coverLine?.items?.name ?? '미선택',
        title,
        specsList: specLines(first.lines),
        sizeData: sizes.map(({ label, w, d, h, price }) => ({ label, w, d, h, price })),
    });

    // Storage 저장 + documents 기록
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filePath = `quote/${body.model_code}/${stamp}.xlsx`;
    const { error: e4 } = await auth.supabase.storage.from('documents').upload(filePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: false,
    });
    if (e4) return NextResponse.json({ error: `문서 저장 실패: ${e4.message}` }, { status: 500 });
    const { data: doc, error: e5 } = await auth.supabase.from('documents').insert({
        doc_type: 'quote', model_code: body.model_code, product_codes: codes, file_path: filePath,
        total_price: sizes.reduce((s, x) => s + x.price, 0), created_by: auth.user.id,
    }).select('doc_id').single();
    if (e5) return dbError(e5, 500);
    const { data: signed } = await auth.supabase.storage.from('documents').createSignedUrl(filePath, 60 * 10);
    return NextResponse.json({
        doc_id: doc.doc_id, url: signed?.signedUrl ?? null, file_path: filePath, warnings,
        sizes: sizes.map(({ product_code, label, price }) => ({ product_code, label, price })),
    }, { status: 201 });
}
```

- [ ] **Step 8: 타입 확인** — Run: `npx tsc --noEmit` → 오류 없음

- [ ] **Step 9: 커밋**

```bash
git add app/lib/bom/quoteSpecs.ts app/lib/bom/quoteXlsx.ts app/lib/bom/__tests__/quoteSpecs.test.ts app/api/bom/products app/api/bom/documents
git commit -m "feat(bom): 상품 견적 계산 API 및 모델 견적서 xlsx 생성(Storage 저장) API 추가"
```

---

### Task 11: excelIO — 템플릿 xlsx 파싱(재번호 적용)과 내보내기

**Files:**
- Create: `resource/bom_template.xlsx` (루트의 `매트리스_BOM_관리템플릿.xlsx` 복사)
- Create: `app/lib/bom/excelIO.ts`
- Test: `app/lib/bom/__tests__/excelIO.test.ts`

**Interfaces:**
- Consumes: `xlsx` (읽기), `ExcelJS` (쓰기), `SIZE_PRESETS`
- Produces: `parseTemplate(buf: Buffer, opts: { size_preset_id: string }): ImportBundle`, `RENUMBER: Record<string,string>`, `buildExportWorkbook(data: ExportData): Promise<Buffer>`, 타입 `ImportBundle`, `ExportData`
- 최종 리뷰 반영(2026-09-07): 템플릿 `CV-001~003` 일반 커버 패널은 재번호 대신 제외+로그 처리, AVL 단가 필드·BOM `spec_text/dims/source`를 내보내기/가져오기 양쪽에서 보존, `items.created_at` null 키 미전송, 왕복 테스트 추가.

- [ ] **Step 1: 템플릿 복사**

```bash
cp "G:/Antigravity_Google/Mattress_ADF/매트리스_BOM_관리템플릿.xlsx" resource/bom_template.xlsx
```

- [ ] **Step 2: 실패하는 테스트 — `app/lib/bom/__tests__/excelIO.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseTemplate, RENUMBER, buildExportWorkbook } from '../excelIO';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync(path.join(process.cwd(), 'resource', 'bom_template.xlsx'));

describe('parseTemplate', () => {
    const b = parseTemplate(buf, { size_preset_id: 'LK' });
    it('마스터 4종을 읽는다', () => {
        expect(b.employees.map(e => e.employee_id)).toEqual(['E-001', 'E-002', 'E-003', 'E-004', 'E-005']);
        expect(b.vendors.length).toBe(5);
        expect(b.items.length).toBe(25);
        expect(b.products.map(p => p.product_code)).toEqual(['MAT-001-LK', 'MAT-002-LK']);
        expect(b.products[0]).toMatchObject({ model_code: 'MAT-001', size_preset_id: 'LK', width_mm: 1800, depth_mm: 2000, cover_split_count: 2, pm_id: 'E-001' });
    });
    it('재번호: 컨트롤러 부속품 CT-002~006 → CT-010~014, CV-010 → FM-002', () => {
        expect(RENUMBER['CT-003']).toBe('CT-011');
        const hose = b.bom_lines.find(l => l.item_no === 'CT-011')!;
        expect(hose).toMatchObject({ product_code: 'MAT-001-LK', parent_item_no: 'CT-000', quantity: 2, level: 2 });
        expect(b.bom_lines.find(l => l.item_no === 'CT-003')).toBeUndefined();
        expect(b.items.find(i => i.item_no === 'FM-002')).toMatchObject({ category: '폼' });
        expect(b.avl.find(a => a.item_no === 'CT-011')?.vendor_code).toBe('V-003');
        expect(b.npi_status.find(n => n.item_no === 'CT-013')).toMatchObject({ product_code: 'MAT-001-LK', stage: 'DVT', progress: 0.6 });
    });
    it('BOM 21줄, 레벨1이 앞에 온다, 대체품번 유지', () => {
        const bom1 = b.bom_lines.filter(l => l.product_code === 'MAT-001-LK');
        expect(bom1.length).toBe(21);
        expect(bom1.slice(0, 4).every(l => l.level === 1)).toBe(true);
        expect(bom1.find(l => l.item_no === 'PK-001')?.alt_item_no).toBe('PK-002');
    });
    it('ECN과 영향 상품', () => {
        expect(b.ecn[0]).toMatchObject({ ecn_no: 'ECN-2026-001', item_no: 'CT-001', rev_from: 'A', rev_to: 'B', status: '승인' });
        expect(b.ecn_products).toEqual([{ ecn_no: 'ECN-2026-001', product_code: 'MAT-001-LK' }]);
    });
    it('변환 로그를 남긴다', () => {
        expect(b.log.some(m => m.includes('CT-003') && m.includes('CT-011'))).toBe(true);
    });
});

describe('buildExportWorkbook', () => {
    it('시트 10개를 만들고 헤더가 템플릿과 같다', async () => {
        const b = parseTemplate(buf, { size_preset_id: 'LK' });
        const out = await buildExportWorkbook({ ...b, progress: [] });
        const wb = XLSX.read(out, { type: 'buffer' });
        expect(wb.SheetNames).toEqual(['상품마스터', '품목마스터', 'BOM', '협력사마스터', '담당자마스터', 'AVL', 'NPI진행현황', '상품별완성률', 'ECN변경이력', '코드표']);
        const bom = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['BOM'], { header: 1 });
        expect(bom[0]).toEqual(['상품코드', '레벨', '상위품번', '품번', '품명', '소요량', '단위', '필수여부', '대체품번', '비고']);
        expect(bom.length).toBe(22);
    });
});
```

- [ ] **Step 3: 실패 확인** — Run: `npx vitest run app/lib/bom/__tests__/excelIO.test.ts` → FAIL

- [ ] **Step 4: `app/lib/bom/excelIO.ts` 작성**

```ts
// ============================================================
// 엑셀 템플릿(11시트) ↔ 테이블 행 (기획안 9장)
// 읽기: xlsx / 쓰기: ExcelJS
// ============================================================
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { SIZE_PRESETS } from '../constants';
import { PREFIX_CATEGORY, prefixOf } from './codes';

/** 템플릿 품번 → 새 체계 (기획안 5.1) */
export const RENUMBER: Record<string, string> = {
    'CT-002': 'CT-010', 'CT-003': 'CT-011', 'CT-004': 'CT-012', 'CT-005': 'CT-013', 'CT-006': 'CT-014',
    'CV-010': 'FM-002',
};

type Row = Record<string, unknown>;
const S = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v).trim());
const N = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
const D = (v: unknown) => {                       // 엑셀 날짜(숫자/문자) → 'YYYY-MM-DD'
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`; }
    return String(v).slice(0, 10);
};

export interface ImportBundle {
    employees: Row[]; vendors: Row[]; items: Row[]; products: Row[];
    bom_lines: Row[]; avl: Row[]; npi_status: Row[]; ecn: Row[]; ecn_products: { ecn_no: string; product_code: string }[];
    code_values: { code_type: string; value: string; sort_order: number }[];
    log: string[];
}

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<Row>(ws, { defval: '' }).filter(r => Object.values(r).some(v => v !== ''));
}

export function parseTemplate(buf: Buffer, opts: { size_preset_id: string }): ImportBundle {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const log: string[] = [];
    const size = SIZE_PRESETS.find(s => s.id === opts.size_preset_id);
    if (!size) throw new Error(`알 수 없는 사이즈 프리셋: ${opts.size_preset_id}`);
    const renum = (no: string | null) => {
        if (!no) return null;
        const to = RENUMBER[no];
        if (to) log.push(`품번 재번호: ${no} → ${to}`);
        return to ?? no;
    };
    // 상품코드에 사이즈 접미어 부여. 이미 붙어 있으면(내보내기 파일 재가져오기) 유지
    const pcode = (code: string | null) => (code ? (code.endsWith(`-${size.id}`) ? code : `${code}-${size.id}`) : null);
    const mcode = (code: string) => (code.endsWith(`-${size.id}`) ? code.slice(0, -(size.id.length + 1)) : code);

    const employees = sheetRows(wb, '담당자마스터').map(r => ({
        employee_id: S(r['담당자ID']), name: S(r['이름']), department: S(r['부서']), title: S(r['직책']),
        email: S(r['이메일']), phone: S(r['연락처']), note: S(r['비고']),
    }));
    const vendors = sheetRows(wb, '협력사마스터').map(r => ({
        vendor_code: S(r['협력사코드']), name: S(r['협력사명']), vendor_type: S(r['유형']), country: S(r['국가']),
        contact_name: S(r['담당자명']), phone: S(r['연락처']), email: S(r['이메일']), main_items: S(r['주요취급품목']), note: S(r['비고']),
    }));
    const items = sheetRows(wb, '품목마스터').map(r => {
        const item_no = renum(S(r['품번']))!;
        return {
            item_no, name: S(r['품명']), category: PREFIX_CATEGORY[prefixOf(item_no)], subcategory: S(r['중분류']),
            item_type: S(r['품목구분']), spec: S(r['규격/사양']), unit: S(r['단위']) ?? 'EA', revision: S(r['리비전']) ?? 'A',
            spec_url: S(r['사양서/도면 링크']), memo: S(r['특징/메모']), created_at: D(r['등록일']),
        };
    });
    const products = sheetRows(wb, '상품마스터').map(r => {
        const raw = S(r['상품코드'])!;
        const model_code = mcode(raw);
        return {
            product_code: pcode(raw), model_code, name: S(r['상품명']), family: S(r['상품군']), status: S(r['상태']) ?? '기획',
            launch_target_date: D(r['출시목표일']), pm_id: S(r['PM(담당자ID)']), cover_split_count: N(r['커버 분리수']) ?? 2,
            size_preset_id: size.id, width_mm: size.width, depth_mm: size.depth, is_dual: false, note: S(r['비고']),
        };
    });
    const bomRaw = sheetRows(wb, 'BOM').map(r => ({
        product_code: pcode(S(r['상품코드'])), level: N(r['레벨']), parent_item_no: renum(S(r['상위품번'])), item_no: renum(S(r['품번'])),
        quantity: N(r['소요량']) ?? 1, required: S(r['필수여부']) ?? '필수', alt_item_no: renum(S(r['대체품번'])), note: S(r['비고']), source: 'manual',
    }));
    // 상품별로 레벨1 → 레벨2 순 (DB 트리거)
    const bom_lines = [...bomRaw].sort((a, b) => String(a.product_code).localeCompare(String(b.product_code)) || (a.level ?? 0) - (b.level ?? 0));
    const avl = sheetRows(wb, 'AVL').map(r => ({
        item_no: renum(S(r['품번'])), vendor_code: S(r['협력사코드']), owner_id: S(r['사내담당자ID']), approval_status: S(r['승인상태']) ?? '후보',
        lead_time_days: N(r['리드타임(일)']), moq: N(r['MOQ']), unit_price: N(r['단가']) ?? 0, currency: S(r['통화']) ?? 'KRW',
        approved_at: D(r['승인일']), price_type: 'FIXED', note: S(r['비고']),
    }));
    const npi_status = sheetRows(wb, 'NPI진행현황').map(r => ({
        product_code: pcode(S(r['상품코드'])), item_no: renum(S(r['품번'])), owner_id: S(r['담당자ID']), stage: S(r['개발단계']) ?? '기획',
        progress: N(r['완료율']) ?? 0, start_date: D(r['시작일']), target_date: D(r['목표일']), issue_status: S(r['이슈상태']) ?? '없음',
        issue_detail: S(r['이슈내용']), next_milestone: S(r['다음 마일스톤']), note: S(r['비고']),
    }));
    const ecn_products: ImportBundle['ecn_products'] = [];
    const ecn = sheetRows(wb, 'ECN변경이력').map(r => {
        const ecn_no = S(r['ECN번호'])!;
        const [rev_from, rev_to] = (S(r['리비전(전→후)']) ?? '→').split('→').map(s => s.trim());
        for (const c of (S(r['영향 상품']) ?? '').split(',').map(s => s.trim()).filter(Boolean)) ecn_products.push({ ecn_no, product_code: pcode(c)! });
        return {
            ecn_no, ecn_date: D(r['일자']), item_no: renum(S(r['품번'])), change_type: S(r['변경구분']), rev_from: rev_from || null, rev_to: rev_to || null,
            before_text: S(r['변경 전']), after_text: S(r['변경 후']), reason: S(r['사유']), requester_id: S(r['요청자ID']), approver_id: S(r['승인자ID']),
            status: S(r['상태']) ?? '요청', note: S(r['비고']),
        };
    });
    const codeSheet = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['코드표'] ?? {}, { header: 1, defval: '' });
    const CODE_TYPE_OF: Record<string, string> = { '대분류': 'category', '품목구분': 'item_type', '개발단계': 'dev_stage', '승인상태': 'approval_status', '상품상태': 'product_status', '이슈상태': 'issue_status', '협력사유형': 'vendor_type', '변경구분': 'change_type', '필수여부': 'required' };
    const code_values: ImportBundle['code_values'] = [];
    (codeSheet[0] ?? []).forEach((h, col) => {
        const t = CODE_TYPE_OF[h]; if (!t) return;
        codeSheet.slice(1).forEach((row, i) => { const v = S(row[col]); if (v) code_values.push({ code_type: t, value: v, sort_order: i }); });
    });
    log.push(`상품 ${products.length}, 품목 ${items.length}, BOM ${bom_lines.length}, AVL ${avl.length}, NPI ${npi_status.length}, ECN ${ecn.length} 행 파싱 (사이즈 ${size.id})`);
    return { employees, vendors, items, products, bom_lines, avl, npi_status, ecn, ecn_products, code_values, log: [...new Set(log)] };
}

export interface ExportData extends Omit<ImportBundle, 'log'> { progress: Row[] }

const HEADERS: Record<string, [string, string][]> = { // 시트명 → [헤더, 컬럼]
    '상품마스터': [['상품코드', 'product_code'], ['상품명', 'name'], ['상품군', 'family'], ['상태', 'status'], ['출시목표일', 'launch_target_date'], ['PM(담당자ID)', 'pm_id'], ['커버 분리수', 'cover_split_count'], ['사이즈', 'size_preset_id'], ['비고', 'note']],
    '품목마스터': [['품번', 'item_no'], ['품명', 'name'], ['대분류', 'category'], ['중분류', 'subcategory'], ['품목구분', 'item_type'], ['규격/사양', 'spec'], ['단위', 'unit'], ['리비전', 'revision'], ['사양서/도면 링크', 'spec_url'], ['특징/메모', 'memo'], ['등록일', 'created_at']],
    'BOM': [['상품코드', 'product_code'], ['레벨', 'level'], ['상위품번', 'parent_item_no'], ['품번', 'item_no'], ['품명', 'item_name'], ['소요량', 'quantity'], ['단위', 'unit'], ['필수여부', 'required'], ['대체품번', 'alt_item_no'], ['비고', 'note']],
    '협력사마스터': [['협력사코드', 'vendor_code'], ['협력사명', 'name'], ['유형', 'vendor_type'], ['국가', 'country'], ['담당자명', 'contact_name'], ['연락처', 'phone'], ['이메일', 'email'], ['주요취급품목', 'main_items'], ['비고', 'note']],
    '담당자마스터': [['담당자ID', 'employee_id'], ['이름', 'name'], ['부서', 'department'], ['직책', 'title'], ['이메일', 'email'], ['연락처', 'phone'], ['권한', 'role'], ['비고', 'note']],
    'AVL': [['품번', 'item_no'], ['협력사코드', 'vendor_code'], ['사내담당자ID', 'owner_id'], ['승인상태', 'approval_status'], ['리드타임(일)', 'lead_time_days'], ['MOQ', 'moq'], ['단가', 'unit_price'], ['통화', 'currency'], ['승인일', 'approved_at'], ['단가방식', 'price_type'], ['상수', 'price_constant'], ['기본금', 'price_base'], ['비고', 'note']],
    'NPI진행현황': [['상품코드', 'product_code'], ['품번', 'item_no'], ['담당자ID', 'owner_id'], ['개발단계', 'stage'], ['완료율', 'progress'], ['시작일', 'start_date'], ['목표일', 'target_date'], ['이슈상태', 'issue_status'], ['이슈내용', 'issue_detail'], ['다음 마일스톤', 'next_milestone'], ['최종업데이트', 'updated_at'], ['비고', 'note']],
    '상품별완성률': [['상품코드', 'product_code'], ['상품명', 'name'], ['상태', 'status'], ['등록 부품수', 'item_count'], ['전체 완성률', 'progress_total'], ['커버', 'progress_cover'], ['폼', 'progress_foam'], ['스트링', 'progress_string'], ['컨트롤러', 'progress_controller'], ['센서', 'progress_sensor'], ['포장', 'progress_packaging'], ['APP', 'progress_app'], ['기획', 'cnt_plan'], ['EVT', 'cnt_evt'], ['DVT', 'cnt_dvt'], ['PVT', 'cnt_pvt'], ['MP(양산)', 'cnt_mp'], ['진행중/지연 이슈', 'cnt_issue']],
    'ECN변경이력': [['ECN번호', 'ecn_no'], ['일자', 'ecn_date'], ['품번', 'item_no'], ['변경구분', 'change_type'], ['리비전(전→후)', 'rev'], ['변경 전', 'before_text'], ['변경 후', 'after_text'], ['사유', 'reason'], ['요청자ID', 'requester_id'], ['승인자ID', 'approver_id'], ['영향 상품', 'affected'], ['상태', 'status'], ['비고', 'note']],
    '코드표': [],
};

export async function buildExportWorkbook(data: ExportData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const itemName = new Map(data.items.map(i => [i.item_no as string, i]));
    const rowsOf: Record<string, Row[]> = {
        '상품마스터': data.products, '품목마스터': data.items,
        'BOM': data.bom_lines.map(l => ({ ...l, item_name: itemName.get(l.item_no as string)?.name ?? '', unit: itemName.get(l.item_no as string)?.unit ?? '' })),
        '협력사마스터': data.vendors, '담당자마스터': data.employees, 'AVL': data.avl, 'NPI진행현황': data.npi_status, '상품별완성률': data.progress,
        'ECN변경이력': data.ecn.map(e => ({ ...e, rev: `${e.rev_from ?? ''}→${e.rev_to ?? ''}`, affected: data.ecn_products.filter(p => p.ecn_no === e.ecn_no).map(p => p.product_code).join(', ') })),
    };
    for (const [sheet, cols] of Object.entries(HEADERS)) {
        const ws = wb.addWorksheet(sheet);
        if (sheet === '코드표') {
            const types = [...new Set(data.code_values.map(c => c.code_type))];
            ws.addRow(types);
            const max = Math.max(0, ...types.map(t => data.code_values.filter(c => c.code_type === t).length));
            for (let i = 0; i < max; i++) ws.addRow(types.map(t => data.code_values.filter(c => c.code_type === t)[i]?.value ?? ''));
            continue;
        }
        ws.addRow(cols.map(c => c[0]));
        for (const r of rowsOf[sheet] ?? []) ws.addRow(cols.map(c => r[c[1]] ?? ''));
        ws.getRow(1).font = { bold: true };
    }
    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
}
```

- [ ] **Step 5: 통과 확인** — Run: `npx vitest run app/lib/bom/__tests__/excelIO.test.ts` → PASS (6 tests). `RENUMBER`를 거친 `CV-010`이 `category: '폼'`이 되는지, BOM 정렬로 레벨1이 앞에 오는지 실패하면 `sort` 비교식을 먼저 본다.

- [ ] **Step 6: 커밋**

```bash
git add resource/bom_template.xlsx app/lib/bom/excelIO.ts app/lib/bom/__tests__/excelIO.test.ts
git commit -m "feat(bom): 엑셀 템플릿 파서(재번호 적용)와 내보내기 워크북 생성기 추가"
```

---

### Task 12: 엑셀 import / export API

**Files:**
- Create: `app/api/bom/import/route.ts`
- Create: `app/api/bom/export/route.ts`

**Interfaces:**
- Consumes: `parseTemplate`, `buildExportWorkbook` (Task 11), `requireUser`
- Produces (HTTP): `POST /api/bom/import` (multipart: `file`, `size_preset_id`; 기본 `LK`) → `{ log: string[], counts: Record<string, number> }`; `GET /api/bom/export` → xlsx 다운로드

- [ ] **Step 1: `app/api/bom/import/route.ts` 작성**

```ts
// 엑셀 템플릿 가져오기. FK 순서: employees → vendors → items → products → bom_lines → avl → npi_status → ecn
import { NextResponse } from 'next/server';
import { requireUser } from '../_lib/auth';
import { parseTemplate } from '../../../lib/bom/excelIO';

export async function POST(req: Request) {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'file(xlsx)이 필요합니다.' }, { status: 400 });
    const sizeId = String(form.get('size_preset_id') ?? 'LK');

    let b;
    try { b = parseTemplate(Buffer.from(await file.arrayBuffer()), { size_preset_id: sizeId }); }
    catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

    const sb = auth.supabase;
    const counts: Record<string, number> = {};
    const log = [...b.log];
    const step = async (name: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
        const { error } = await fn();
        if (error) throw new Error(`${name}: ${error.message}`);
    };

    try {
        await step('code_values', () => sb.from('code_values').upsert(b.code_values, { onConflict: 'code_type,value' }));
        await step('employees', () => sb.from('employees').upsert(b.employees, { onConflict: 'employee_id' }));
        await step('vendors', () => sb.from('vendors').upsert(b.vendors, { onConflict: 'vendor_code' }));

        // 위자드 매핑 품목(wizard_option_key 있음)은 이름을 덮어쓰지 않는다
        const { data: mapped } = await sb.from('items').select('item_no').not('wizard_option_key', 'is', null);
        const keep = new Set((mapped ?? []).map(m => m.item_no));
        const newItems = b.items.filter(i => !keep.has(i.item_no as string));
        for (const i of b.items) if (keep.has(i.item_no as string)) log.push(`품목 ${i.item_no}: 기존 위자드 품목 유지 (템플릿 품명 "${i.name}" 무시)`);
        await step('items', () => sb.from('items').upsert(newItems, { onConflict: 'item_no' }));
        counts.items = newItems.length;

        await step('products', () => sb.from('products').upsert(b.products, { onConflict: 'product_code' }));
        // BOM은 상품 단위로 교체 (레벨1 → 레벨2 순서 유지)
        for (const code of [...new Set(b.bom_lines.map(l => l.product_code as string))]) {
            await step('bom_lines(delete)', () => sb.from('bom_lines').delete().eq('product_code', code));
            const lines = b.bom_lines.filter(l => l.product_code === code);
            await step('bom_lines(level1)', () => sb.from('bom_lines').insert(lines.filter(l => l.level === 1)));
            await step('bom_lines(level2)', () => sb.from('bom_lines').insert(lines.filter(l => l.level !== 1)));
        }
        await step('avl', () => sb.from('avl').upsert(b.avl, { onConflict: 'item_no,vendor_code' }));
        await step('npi_status', () => sb.from('npi_status').upsert(b.npi_status, { onConflict: 'product_code,item_no' }));
        await step('ecn', () => sb.from('ecn').upsert(b.ecn, { onConflict: 'ecn_no' }));
        await step('ecn_products', () => sb.from('ecn_products').upsert(b.ecn_products, { onConflict: 'ecn_no,product_code' }));
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message, log }, { status: 400 });
    }
    for (const k of ['employees', 'vendors', 'products', 'bom_lines', 'avl', 'npi_status', 'ecn'] as const) counts[k] = b[k].length;
    return NextResponse.json({ log, counts });
}
```

- [ ] **Step 2: `app/api/bom/export/route.ts` 작성**

```ts
import { NextResponse } from 'next/server';
import { requireUser } from '../_lib/auth';
import { buildExportWorkbook } from '../../../lib/bom/excelIO';

export async function GET() {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const sb = auth.supabase;
    const pull = async (table: string, order: string) => {
        const { data, error } = await sb.from(table).select('*').order(order);
        if (error) throw new Error(`${table}: ${error.message}`);
        return data;
    };
    try {
        const [employees, vendors, items, products, bom_lines, avl, npi_status, ecn, ecn_products, code_values, progress] = await Promise.all([
            pull('employees', 'employee_id'), pull('vendors', 'vendor_code'), pull('items', 'item_no'), pull('products', 'product_code'),
            sb.from('bom_lines').select('*').order('product_code').order('level').order('item_no').then(r => { if (r.error) throw new Error(r.error.message); return r.data; }),
            pull('avl', 'item_no'), pull('npi_status', 'product_code'), pull('ecn', 'ecn_no'), pull('ecn_products', 'ecn_no'),
            sb.from('code_values').select('*').order('code_type').order('sort_order').then(r => { if (r.error) throw new Error(r.error.message); return r.data; }),
            pull('v_product_progress', 'product_code'),
        ]);
        const buf = await buildExportWorkbook({ employees, vendors, items, products, bom_lines, avl, npi_status, ecn, ecn_products, code_values, progress });
        const stamp = new Date().toISOString().slice(0, 10);
        return new NextResponse(buf, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="BOM_export_${stamp}.xlsx"`,
            },
        });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
```

- [ ] **Step 3: 타입·전체 테스트·빌드 확인**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc 오류 없음, Vitest 전부 PASS, `next build` 성공 (`/api/bom/*` 라우트가 빌드 출력에 나열됨)

- [ ] **Step 4: 실제 DB로 왕복 검증 (dev 서버 + 로그인 세션 필요)**

`npm run dev` 후 브라우저에서 `/login`으로 로그인한 상태에서 DevTools 콘솔:
```js
const fd = new FormData();
fd.append('file', await (await fetch('/resource/bom_template.xlsx')).blob(), 'bom_template.xlsx'); // 파일이 public에 없으면 <input type=file>로 선택
await (await fetch('/api/bom/import', { method: 'POST', body: fd })).json();
// Expected: { log: [...], counts: { items: N, products: 2, bom_lines: 21, ... } }
await (await fetch('/api/bom/products')).json();
// Expected: [{ model_code: 'MAT-001', products: [{ product_code: 'MAT-001-LK', ... }] }, { model_code: 'MAT-002', ... }]
await (await fetch('/api/bom/products/MAT-001-LK/quote')).json();
// Expected: total 0 (템플릿 AVL 단가가 0) + warnings에 CT-011 등 미승인 없음
```
`GET /api/bom/export`를 주소창에서 열면 xlsx가 내려받아지고, 시트 10개에 import한 데이터가 보인다.

- [ ] **Step 5: 커밋**

```bash
git add app/api/bom/import app/api/bom/export
git commit -m "feat(bom): 엑셀 템플릿 import/export API 추가"
```

---

## 계획 자체 점검 결과

- **스펙 대조**: 기획안 4장(데이터 모델) → Task 4; 5장(품번·매핑·생성 규칙) → Task 1·2·5; 6장(단가) → Task 3·10; 8장(모듈 경계·API·Storage·Vitest) → Task 1·7~12; 9장(엑셀 이행·재번호) → Task 11·12. 7장(화면)과 위자드 9단계, 단가 관리 모달 제거, 개발요청서 BOM 표는 **1B 계획**에서 다룬다.
- **기획안과 달라진 점**: `bom_lines.dims` jsonb 추가(단가 계산용 치수), 상품 생성은 `bom_create_products` Postgres 함수로 원자 처리, `documents.total_price` 추가. 기획안 4장에 반영해 둘 것.
- **1B에 넘기는 인터페이스**: `POST /api/bom/products/from-design`(위자드 9단계), `GET /api/bom/products`·`/{code}`·`/{code}/quote`(상품 화면), `POST /api/bom/documents/quote`(견적서 버튼), `/api/bom/items|vendors|employees|avl`(마스터 화면), `/api/bom/import|export`(엑셀 화면).
