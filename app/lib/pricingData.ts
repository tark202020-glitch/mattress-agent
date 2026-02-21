// ============================================================
// 부품별 단가 데이터 (상수, 기본금액 및 수식 기반 관리)
// ============================================================
import type { PriceCategory } from '../types/pricing';

export const DEFAULT_PRICING_DATA: PriceCategory[] = [
    // ── Step 2: 폼 ──
    {
        id: 'foam_top',
        displayName: '상단폼',
        step: 2,
        items: [
            { id: 'FT_50', categoryId: 'foam_top', optionId: 'TOP_50', name: '50mm 단일 레이어', formulaType: 'VOLUME', constant: 0.0003266, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
            { id: 'FT_70', categoryId: 'foam_top', optionId: 'TOP_70', name: '70mm 단일 레이어', formulaType: 'VOLUME', constant: 0.0004286, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
            { id: 'FT_70_2L', categoryId: 'foam_top', optionId: 'TOP_70_2L', name: '70mm 2Layer (5:2)', formulaType: 'VOLUME', constant: 0.0004654, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
            { id: 'FT_80_2L', categoryId: 'foam_top', optionId: 'TOP_80_2L', name: '80mm 2Layer (6:2)', formulaType: 'VOLUME', constant: 0.0004654, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
        ],
    },
    {
        id: 'foam_guard',
        displayName: '가드폼',
        step: 2,
        items: [
            { id: 'FG_70', categoryId: 'foam_guard', optionId: 'GUARD_70', name: '70mm 가드폼', formulaType: 'VOLUME', constant: 0.0003266, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
            { id: 'FG_80', categoryId: 'foam_guard', optionId: 'GUARD_80', name: '80mm 가드폼', formulaType: 'VOLUME', constant: 0.0003266, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
        ],
    },
    {
        id: 'foam_bottom',
        displayName: '하단폼',
        step: 2,
        items: [
            { id: 'FB_30', categoryId: 'foam_bottom', optionId: 'BOTTOM_30', name: '30mm 하단폼', formulaType: 'VOLUME', constant: 0.0003266, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
            { id: 'FB_50', categoryId: 'foam_bottom', optionId: 'BOTTOM_50', name: '50mm 하단폼', formulaType: 'VOLUME', constant: 0.0003266, basePrice: 0, formulaString: '=가로*세로*높이*상수' },
        ],
    },

    // ── Step 3: 스트링 ──
    {
        id: 'string',
        displayName: '스트링',
        step: 3,
        items: [
            { id: 'STR_PVC', categoryId: 'string', optionId: 'V3_PVC', name: 'V3 PVC', formulaType: 'VOLUME', constant: 0.0001755, basePrice: 9700, formulaString: '=(가로*세로*높이*상수)+9700' },
            { id: 'STR_TPU', categoryId: 'string', optionId: 'V4_TPU', name: 'V4 TPU', formulaType: 'VOLUME', constant: 0.0003159, basePrice: 9700, formulaString: '=(가로*세로*높이*상수)+9700' },
        ],
    },

    // ── Step 4: 커버 ──
    {
        id: 'cover',
        displayName: '커버',
        step: 4,
        items: [
            { id: 'COV_HEALING', categoryId: 'cover', optionId: 'HEALING_NUMBER', name: '힐링넘버 스타일', formulaType: 'VOLUME', constant: 0.0000839, basePrice: 30000, formulaString: '=(가로*세로*높이*상수)+30000' },
            { id: 'COV_OAK', categoryId: 'cover', optionId: 'OAK_TWEED', name: '오크트위드 스타일', formulaType: 'VOLUME', constant: 0.0002807, basePrice: 20000, formulaString: '=(가로*세로*높이*상수)+20000' },
            { id: 'COV_FLAT', categoryId: 'cover', optionId: 'FLAT_GRID', name: '플랫그리드 스타일', formulaType: 'VOLUME', constant: 0.0001743, basePrice: 150000, formulaString: '=(가로*세로*높이*상수)+150000' },
            { id: 'COV_ALLCARE', categoryId: 'cover', optionId: 'ALL_CARE', name: '올케어 스타일', formulaType: 'VOLUME', constant: 0.0001174, basePrice: 50000, formulaString: '=(가로*세로*높이*상수)+50000' },
            { id: 'COV_GENTLE', categoryId: 'cover', optionId: 'GENTLE_BREED', name: '젠틀브리드 스타일', formulaType: 'VOLUME', constant: 0.0001010, basePrice: 150000, formulaString: '=(가로*세로*높이*상수)+150000' },
            { id: 'COV_I5', categoryId: 'cover', optionId: 'I5', name: 'i5 스타일', formulaType: 'VOLUME', constant: 0.0001867, basePrice: 100000, formulaString: '=(가로*세로*높이*상수)+100000' },
            { id: 'COV_COMPACT', categoryId: 'cover', optionId: 'COMPACT', name: '컴팩트 스타일', formulaType: 'VOLUME', constant: 0.0000839, basePrice: 30000, formulaString: '=(가로*세로*높이*상수)+30000' },
        ],
    },

    // ── Step 5: 컨트롤러 ──
    {
        id: 'controller',
        displayName: '컨트롤러',
        step: 5,
        items: [
            { id: 'CTRL_NUM', categoryId: 'controller', optionId: 'NUMBERING', name: 'Numbering', formulaType: 'FIXED', constant: 1, basePrice: 72000, formulaString: '=72000' },
            { id: 'CTRL_16', categoryId: 'controller', optionId: 'CTRL_1_6', name: 'Controller 1.6', formulaType: 'FIXED', constant: 1, basePrice: 72000, formulaString: '=72000' },
            { id: 'CTRL_IOT', categoryId: 'controller', optionId: 'IOT', name: 'IoT Controller', formulaType: 'FIXED', constant: 1, basePrice: 78000, formulaString: '=78000' },
            { id: 'CTRL_IOT_S', categoryId: 'controller', optionId: 'IOT_STICK', name: 'IoT + Stick', formulaType: 'FIXED', constant: 1, basePrice: 90000, formulaString: '=90000' },
        ],
    },

    // ── Step 6: 포장 ──
    {
        id: 'packaging',
        displayName: '포장',
        step: 6,
        items: [
            { id: 'PKG_ROLL', categoryId: 'packaging', optionId: 'ROLL', name: '롤 타입 (type A)', formulaType: 'WIDTH_STEP', constant: 1, basePrice: 0, formulaString: '가로기준 1100이하 7000, 1500이하 8500, 1800이하 13000' },
            { id: 'PKG_FOLD3', categoryId: 'packaging', optionId: 'FOLD_3', name: '압축 3단접 (type B)', formulaType: 'WIDTH_STEP', constant: 1, basePrice: 0, formulaString: '1499이하 12000, 1700이하 15000, 2000이하 18000' },
        ],
    },

    // ── Step 7: 배송 ──
    {
        id: 'delivery',
        displayName: '배송',
        step: 7,
        items: [
            { id: 'DLV_SELF', categoryId: 'delivery', optionId: 'SELF', name: '자체 배송', formulaType: 'FIXED', constant: 0, basePrice: 0, formulaString: '=0' },
            { id: 'DLV_PARCEL', categoryId: 'delivery', optionId: 'PARCEL', name: '택배 배송', formulaType: 'FIXED', constant: 0, basePrice: 0, formulaString: '=0' },
            { id: 'DLV_CONTAINER', categoryId: 'delivery', optionId: 'CONTAINER', name: '컨테이너', formulaType: 'FIXED', constant: 0, basePrice: 0, formulaString: '=0' },
            { id: 'DLV_PENDING', categoryId: 'delivery', optionId: 'PENDING', name: '미정', formulaType: 'FIXED', constant: 0, basePrice: 0, formulaString: '=0' },
        ],
    },
];
