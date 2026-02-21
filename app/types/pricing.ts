/** ============================================================
 * 부품별 단가표 타입 정의 (사이즈별 단가 구조)
 * ============================================================ */

export type FormulaType = 'VOLUME' | 'FIXED' | 'WIDTH_STEP';

/** 개별 부품 단가 항목 */
export interface PriceItem {
    id: string;                     // 고유 ID (예: 'STR_PVC')
    categoryId: string;             // 카테고리 ID
    optionId: string;               // constants.ts 옵션 ID와 매핑
    name: string;                   // 표시명
    formulaType: FormulaType;       // 적용할 수식 타입
    constant: number;               // 상수 (예: 0.0003266)
    basePrice: number;              // 기본 추가금액 (예: 9700)
    formulaString: string;          // 사용자에게 보여질 수식 문자열 (예: "가로*세로*높이*상수")
    note?: string;                  // 비고
}

/** 부품 카테고리 */
export interface PriceCategory {
    id: string;                       // 예: 'string', 'foam_top', 'cover'
    displayName: string;              // 한글 표시명
    step: number;                     // 위자드 단계 번호
    items: PriceItem[];
}

/** 단가 계산 결과 (선택 구성 기준) */
export interface PriceSummary {
    items: {
        categoryId: string;
        categoryName: string;
        optionName: string;
        unitPrice: number;
        formula?: string;
        specs?: string; // 예: "Q 사이즈 (1500 x 2000 x 50)"
        quantity?: number;
    }[];
    totalUnitPrice: number;
}
