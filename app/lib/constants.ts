// ============================================================
// 매트리스 설계 에이전트 - 상수 정의 (Design Rulebook 1.1 기반)
// ============================================================

// --- 프로젝트 타이틀 ---
export const DEFAULT_TITLE = '매트리스 설계';

// --- Dual 옵션 임계값 ---
export const DUAL_MIN_WIDTH = 1500; // mm, Q(퀸) 이상

// --- 스텝 상수 ---
export const PAGE_PX = 48;
export const SIDEBAR_W = 520;
export const SECTION_GAP = 32;
export const CARD_P = 24;

// --- Step 1: 사이즈 프리셋 (mm 단위) ---
export interface SizePreset {
    id: string;
    label: string;
    region: '국내' | '해외';
    width: number;
    depth: number;
}

export const SIZE_PRESETS: SizePreset[] = [
    { id: 'SS', label: 'SS (슈퍼싱글)', region: '국내', width: 1100, depth: 2000 },
    { id: 'Q_KR', label: 'Q (퀸)', region: '국내', width: 1500, depth: 2000 },
    { id: 'K_KR', label: 'K (킹)', region: '국내', width: 1600, depth: 2000 },
    { id: 'LK', label: 'LK (라지킹)', region: '국내', width: 1800, depth: 2000 },
    { id: 'TW', label: 'Twin', region: '해외', width: 990, depth: 1905 },
    { id: 'FU', label: 'Full', region: '해외', width: 1370, depth: 1905 },
    { id: 'Q_US', label: 'Queen', region: '해외', width: 1525, depth: 2030 },
    { id: 'K_US', label: 'King', region: '해외', width: 1930, depth: 2030 },
    { id: 'CK', label: 'Cal King', region: '해외', width: 1830, depth: 2135 },
];

// --- Step 2: 폼 선택 (3단계 구성) ---

// 상단폼 옵션
export interface TopFoamOption {
    id: string;
    label: string;
    thickness: number;
    layers: string | null;
    description: string;
}

export const TOP_FOAM_OPTIONS: TopFoamOption[] = [
    { id: 'TOP_50', label: '50mm', thickness: 50, layers: null, description: '단일레이어 HR 40kg' },
    { id: 'TOP_70', label: '70mm', thickness: 70, layers: null, description: '단일레이어 HR 50kg' },
    { id: 'TOP_70_2L', label: '70mm (2Layer 5:2)', thickness: 70, layers: '5:2', description: '50mm HR 50kg, 20mm HR 40kg' },
    { id: 'TOP_80_2L', label: '80mm (2Layer 6:2)', thickness: 80, layers: '6:2', description: '60mm HR 50kg, 20mm HR 40kg' },
];

// 가드폼 옵션
export const GUARD_FOAM_THICKNESS_OPTIONS = [70, 80] as const;
export const GUARD_FOAM_HARDNESS_OPTIONS = ['소프트', '미디엄', '하드'] as const;

// 하단폼 옵션
export const BOTTOM_FOAM_THICKNESS_OPTIONS = [30, 50] as const;
export const BOTTOM_FOAM_HARDNESS_OPTIONS = ['소프트', '미디엄', '하드'] as const;

// --- Step 3: 스트링 옵션 ---
export interface CoreOption {
    id: string;
    label: string;
    material: string;
    description: string;
    color: string;
    patternId: string;
    height: number;
}

export const CORE_OPTIONS: CoreOption[] = [
    {
        id: 'V3_PVC', label: 'V3 PVC', material: 'PVC',
        description: '경제적이고 내구성이 높은 PVC 에어셀',
        color: '#4A90D9', patternId: 'pattern-pvc', height: 200,
    },
    {
        id: 'V4_TPU', label: 'V4 TPU', material: 'TPU',
        description: '프리미엄 친환경 TPU 에어셀',
        color: '#7B68EE', patternId: 'pattern-tpu', height: 200,
    },
];

// --- Step 4: 커버 디자인 옵션 ---
export interface CoverOption {
    id: string;
    label: string;
    grade: '저' | '중' | '고' | '커스텀';
    color: string;
    description: string;
    coverTopThickness: number;
    image?: string;
}

export const COVER_OPTIONS: CoverOption[] = [
    { id: 'COMPACT', label: '컴팩트 스타일', grade: '저', color: '#7C8C72', description: '심플 컴팩트 디자인', coverTopThickness: 30, image: '/covers/컴팩트.jpg' },
    { id: 'HEALING_NUMBER', label: '힐링넘버 스타일', grade: '저', color: '#D4C5A9', description: '기본형 커버', coverTopThickness: 30, image: '/covers/힐링넘버.jpg' },
    { id: 'FLAT_GRID', label: '플랫그리드 스타일', grade: '중', color: '#A0A0A0', description: '모던 그리드 패턴', coverTopThickness: 30, image: '/covers/플랫그리드.jpg' },
    { id: 'OAK_TWEED', label: '오크트위드 스타일', grade: '중', color: '#8B7355', description: '트위드 패브릭 감각', coverTopThickness: 30, image: '/covers/오크트위드.jpg' },
    { id: 'ALL_CARE', label: '올케어 스타일', grade: '중', color: '#B8D4E3', description: '항균 기능성 원단', coverTopThickness: 30, image: '/covers/올케어.jpg' },
    { id: 'I5', label: 'i5 스타일', grade: '고', color: '#1A1A2E', description: '최고급 프리미엄 라인', coverTopThickness: 30, image: '/covers/i5.jpg' },
    { id: 'GENTLE_BREED', label: '젠틀브리즈 스타일', grade: '고', color: '#2C3E50', description: '프리미엄 고급 원단', coverTopThickness: 30, image: '/covers/젠틀브리즈.jpg' },
];

// --- Step 5~7 ---
export interface GenericOption { id: string; label: string; description: string; }

export const CONTROLLER_OPTIONS: GenericOption[] = [
    { id: 'NUMBERING', label: 'Numbering', description: '기본형 넘버링 컨트롤러' },
    { id: 'CTRL_1_6', label: 'Controller 1.6', description: '1.6세대 디지털 컨트롤러' },
    { id: 'IOT', label: 'IoT Controller', description: 'Wi-Fi 연동 스마트 컨트롤러' },
    { id: 'IOT_STICK', label: 'IoT Controller (Stick add)', description: 'IoT + 스틱 리모컨 포함' },
];

export const PACKAGING_OPTIONS: GenericOption[] = [
    { id: 'ROLL', label: '롤 타입 (type A)', description: '조립상태 그대로 압축 방식' },
    { id: 'FOLD_3', label: '압축 3단접 (type B)', description: '3단 접이 후 압축 방식' },
];

export const DELIVERY_OPTIONS: GenericOption[] = [
    { id: 'SELF', label: '자체 배송', description: '박스 직접 배송건(VIP)' },
    { id: 'PARCEL', label: '택배 배송', description: '경동택배 배송(일반)' },
    { id: 'CONTAINER', label: '컨테이너', description: '파렛적재용' },
    { id: 'PENDING', label: '미정', description: '배송 방식 미정' },
];

// --- 위자드 단계 ---
export const WIZARD_STEPS = [
    { id: 1, title: '사이즈', icon: '📐', description: '매트리스 사이즈와 Single/Dual을 선택하세요' },
    { id: 2, title: '구조 선택', icon: '🛡️', description: '매트리스 폼의 레이어 구조(Basic, Standard, Premium)를 선택하세요' },
    { id: 3, title: '스트링', icon: '🔧', description: '스트링 타입을 선택하세요' },
    { id: 4, title: '커버', icon: '🎨', description: '외부 커버 디자인을 선택하세요' },
    { id: 5, title: '컨트롤러', icon: '🎮', description: '제어 장치를 선택하세요' },
    { id: 6, title: '포장', icon: '📦', description: '포장 방식을 선택하세요' },
    { id: 7, title: '배송', icon: '🚚', description: '배송 방식을 선택하세요' },
] as const;

// --- 도면 상수 ---
export const COVER_SIDE_THICKNESS = 10;
export const CORE_DEFAULT_HEIGHT = 200;

// ── Dual 모드 코어/가드폼 계산 헬퍼 ──
export function calcCoreDimensions(
    W: number, D: number, gfT: number,
    isDual: boolean, guardFoamEnabled: boolean,
) {
    if (isDual) {
        if (guardFoamEnabled) {
            // Dual + 가드폼 유: 외곽 + 중앙 구분벽
            const coreW = (W - 3 * gfT) / 2;
            const coreD = D - 2 * gfT;
            return {
                coreW: Math.round(coreW),
                coreD: Math.round(coreD),
                guardD_count: 3,   // 좌, 중앙, 우
                guardW_count: 2,   // 상, 하
                guardD_len: Math.round(coreD),
                guardW_len: W,
            };
        } else {
            // Dual + 가드폼 무: 중앙 구분벽만
            const coreW = (W - gfT) / 2;
            const coreD = D;
            return {
                coreW: Math.round(coreW),
                coreD: Math.round(coreD),
                guardD_count: 1,   // 중앙만
                guardW_count: 0,
                guardD_len: Math.round(coreD),
                guardW_len: 0,
            };
        }
    } else {
        // Single
        if (guardFoamEnabled) {
            const coreW = W - 2 * gfT;
            const coreD = D - 2 * gfT;
            return {
                coreW: Math.round(coreW),
                coreD: Math.round(coreD),
                guardD_count: 2,
                guardW_count: 2,
                guardD_len: Math.round(coreD),
                guardW_len: W,
            };
        } else {
            return {
                coreW: W, coreD: D,
                guardD_count: 0, guardW_count: 0,
                guardD_len: 0, guardW_len: 0,
            };
        }
    }
}
