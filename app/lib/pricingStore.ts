// ============================================================
// 단가 관리 Zustand Store (하이브리드: localStorage + XLSX 업로드)
// ============================================================
import { create } from 'zustand';
import type { PriceCategory, PriceItem, PriceSummary } from '../types/pricing';
import { DEFAULT_PRICING_DATA } from './pricingData';

const STORAGE_KEY = 'mattress-pricing-data';
const QTY_STORAGE_KEY = 'mattress-pricing-qty';

interface PricingState {
    categories: PriceCategory[];
    lastUpdated: string | null;
    isLoaded: boolean;
}

interface PricingActions {
    /** localStorage에서 데이터 로드 (hydrate) */
    hydrate: () => void;

    /** 전체 단가 데이터 교체 (XLSX 업로드 시) */
    replaceAllData: (categories: PriceCategory[]) => void;

    /** 특정 카테고리의 단가 업데이트 */
    updateCategory: (categoryId: string, items: PriceItem[]) => void;

    /** 특정 아이템의 수식과 단가 업데이트 */
    updateItemFormula: (itemId: string, constant: number, basePrice: number, formulaString: string) => void;

    /** 초기 샘플 데이터로 리셋 */
    resetToDefault: () => void;

    /** 특정 옵션의 단가 조회 */
    getPriceForOption: (categoryId: string, optionId: string, sizeId?: string) => number;

    /** 현재 설계 상태 기반 총 단가 계산 */
    calculateSummary: (designState: DesignStateForPricing) => PriceSummary;
}

/** store.ts DesignState에서 단가 계산에 필요한 필드만 추출 */
export interface DesignStateForPricing {
    sizePresetId: string | null;
    customWidth: number;
    customDepth: number;
    topFoamEnabled: boolean | null;
    topFoamOptionId: string | null;
    guardFoamEnabled: boolean | null;
    guardFoamThickness: number;
    bottomFoamEnabled: boolean | null;
    bottomFoamThickness: number;
    isDual: boolean;
    coreId: string | null;
    coverId: string | null;
    controllerId: string | null;
    packagingId: string | null;
    deliveryId: string | null;
}

// ── localStorage 유틸 ──
function loadFromStorage(): { categories: PriceCategory[]; lastUpdated: string | null } {
    if (typeof window === 'undefined') return { categories: DEFAULT_PRICING_DATA, lastUpdated: null };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { categories: DEFAULT_PRICING_DATA, lastUpdated: null };
        const parsed = JSON.parse(raw);
        if (!parsed.categories) return { categories: DEFAULT_PRICING_DATA, lastUpdated: parsed.lastUpdated || null };

        // 기존 데이터에 없는 신규 필드(basePrice 등)를 DEFAULT_PRICING_DATA에서 병합하여 반환
        const mergedCategories = DEFAULT_PRICING_DATA.map(defCat => {
            const parsedCat = parsed.categories.find((c: any) => c.id === defCat.id);
            if (!parsedCat) return defCat;

            return {
                ...defCat,
                ...parsedCat,
                items: defCat.items.map(defItem => {
                    const parsedItem = parsedCat.items?.find((i: any) => i.id === defItem.id);
                    if (!parsedItem) return defItem;
                    return {
                        ...defItem,
                        ...parsedItem,
                        constant: typeof parsedItem.constant === 'number' ? parsedItem.constant : defItem.constant,
                        basePrice: typeof parsedItem.basePrice === 'number' ? parsedItem.basePrice : defItem.basePrice,
                        formulaType: parsedItem.formulaType || defItem.formulaType,
                        formulaString: parsedItem.formulaString || defItem.formulaString,
                    };
                })
            };
        });

        return { categories: mergedCategories, lastUpdated: parsed.lastUpdated || null };
    } catch {
        return { categories: DEFAULT_PRICING_DATA, lastUpdated: null };
    }
}

function saveToStorage(categories: PriceCategory[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            categories,
            lastUpdated: new Date().toISOString(),
        }));
    } catch { /* quota error 무시 */ }
}


// ── Store ──
export const usePricingStore = create<PricingState & PricingActions>((set, get) => ({
    categories: DEFAULT_PRICING_DATA,
    lastUpdated: null,
    isLoaded: false,

    hydrate: () => {
        const { categories, lastUpdated } = loadFromStorage();
        set({ categories, lastUpdated, isLoaded: true });
    },

    replaceAllData: (categories) => {
        saveToStorage(categories);
        set({ categories, lastUpdated: new Date().toISOString() });
    },

    updateCategory: (categoryId, items) => {
        const cats = get().categories.map(c =>
            c.id === categoryId ? { ...c, items } : c
        );
        saveToStorage(cats);
        set({ categories: cats, lastUpdated: new Date().toISOString() });
    },

    updateItemFormula: (itemId, constant, basePrice, formulaString) => {
        const cats = get().categories.map(c => ({
            ...c,
            items: c.items.map(item => {
                if (item.id !== itemId) return item;
                return { ...item, constant, basePrice, formulaString };
            }),
        }));
        saveToStorage(cats);
        set({ categories: cats, lastUpdated: new Date().toISOString() });
    },

    resetToDefault: () => {
        saveToStorage(DEFAULT_PRICING_DATA);
        set({ categories: DEFAULT_PRICING_DATA, lastUpdated: new Date().toISOString() });
    },

    getPriceForOption: (categoryId, optionId, sizeId) => {
        // 기존 sizeId 기반 가격 조회 로직 대신 옵션 베이스 가격 반환
        const { categories } = get();
        const cat = categories.find(c => c.id === categoryId);
        if (!cat) return 0;
        const item = cat.items.find(i => i.optionId === optionId);
        if (!item) return 0;
        return item.basePrice;
    },

    calculateSummary: (ds) => {
        const { categories } = get();
        const items: PriceSummary['items'] = [];

        // 치수 기본값 (프리셋이 없으면 custom 사용)
        let W = ds.customWidth || 1500;
        let D = ds.customDepth || 2000;

        // 전체 높이 H를 위한 각 옵션 두께 추출
        const topH = ds.topFoamEnabled && ds.topFoamOptionId ? parseInt(ds.topFoamOptionId.split('_')[1] || '0') : 0;
        const botH = ds.bottomFoamEnabled ? ds.bottomFoamThickness : 0;
        const coreH = 200; // string의 기본 높이
        const totalH = topH + botH + coreH;

        const calcItem = (categoryId: string, optionId: string, w: number, d: number, h: number, qtyMultiplier: number = 1, optionSuffix: string = '') => {
            const cat = categories.find(c => c.id === categoryId);
            if (!cat) return;
            const item = cat.items.find(i => i.optionId === optionId);
            if (!item) return;

            let price = 0;
            if (item.formulaType === 'FIXED') {
                price = item.basePrice;
            } else if (item.formulaType === 'VOLUME') {
                price = Math.floor(w * d * h * item.constant) + item.basePrice;
            } else if (item.formulaType === 'WIDTH_STEP') {
                if (item.optionId === 'ROLL') {
                    if (w <= 1100) { price = 7000; optionSuffix = ' (Box: 1400×310×310)'; }
                    else if (w <= 1500) { price = 8500; optionSuffix = ' (Box: 1800×310×310)'; }
                    else { price = 13000; optionSuffix = ' (Box: 2100×310×310)'; }
                } else if (item.optionId === 'FOLD_3') {
                    if (w <= 1499) { price = 12000; optionSuffix = ' (Box: 1100×410×410)'; }
                    else if (w <= 1700) { price = 15000; optionSuffix = ' (Box: 1100×470×470)'; }
                    else { price = 18000; optionSuffix = ' (Box: 1200×550×550)'; }
                }
            }

            price = price * qtyMultiplier;

            items.push({
                categoryId: item.categoryId,
                categoryName: cat.displayName,
                optionName: item.name + optionSuffix,
                unitPrice: price,
                formula: item.formulaString,
                specs: `${w} × ${d} × ${h}`,
                quantity: qtyMultiplier
            });
        };

        // 상단폼
        if (ds.topFoamEnabled && ds.topFoamOptionId) {
            calcItem('foam_top', ds.topFoamOptionId, W, D, topH);
        }

        // 가드폼 (W, D 방향 분리 계산)
        if (ds.guardFoamEnabled) {
            const optId = `GUARD_${ds.guardFoamThickness}`;
            const t = ds.guardFoamThickness;

            // D 방향 (좌/우/중앙 세로 측면) -> T x (D - 2T) x H
            const dMultiplier = ds.isDual ? 3 : 2;
            calcItem('foam_guard', optId, t, D - 2 * t, coreH, dMultiplier, ' (D)');

            // W 방향 (상/하 가로 측면) -> T x W x H
            calcItem('foam_guard', optId, t, W, coreH, 2, ' (W)');
        }

        // 하단폼
        if (ds.bottomFoamEnabled) {
            const optId = `BOTTOM_${ds.bottomFoamThickness}`;
            calcItem('foam_bottom', optId, W, D, botH);
        }

        // 스트링
        if (ds.coreId) {
            const multiplier = ds.isDual ? 2 : 1;
            const coreW = ds.isDual ? (ds.guardFoamEnabled ? (W - 3 * ds.guardFoamThickness) / 2 : W / 2) : (ds.guardFoamEnabled ? W - 2 * ds.guardFoamThickness : W);
            const coreD = ds.guardFoamEnabled ? D - 2 * ds.guardFoamThickness : D;
            calcItem('string', ds.coreId, coreW, coreD, coreH, multiplier);
        }

        // 커버
        if (ds.coverId) {
            calcItem('cover', ds.coverId, W, D, totalH);
        }

        // 컨트롤러
        if (ds.controllerId) {
            const multiplier = ds.isDual ? 2 : 1;
            calcItem('controller', ds.controllerId, W, D, 0, multiplier);
        }

        // 포장
        if (ds.packagingId) {
            calcItem('packaging', ds.packagingId, W, D, 0);
        }

        // 배송
        if (ds.deliveryId) {
            calcItem('delivery', ds.deliveryId, W, D, 0);
        }

        const totalUnitPrice = items.reduce((sum, i) => sum + i.unitPrice, 0);
        return {
            items,
            totalUnitPrice,
        };
    },
}));
