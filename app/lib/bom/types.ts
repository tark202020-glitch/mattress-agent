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
    currency?: string;   // 없으면 KRW로 본다
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
    incomplete: boolean;  // 경고가 하나라도 있으면 true (금액을 그대로 믿으면 안 됨)
}
