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
