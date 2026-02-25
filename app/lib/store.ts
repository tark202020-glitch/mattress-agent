import { create } from 'zustand';

export interface DesignState {
    // Title
    title: string;

    // Step 1: 사이즈
    sizePresetId: string | null;
    customWidth: number;
    customDepth: number;
    isDual: boolean;       // Dual 옵션

    // Step 2: 구조 선택 (이전 폼 선택)
    structureType: 'basic' | 'standard' | 'premium' | null;
    topFoamEnabled: boolean | null;
    topFoamOptionId: string | null;
    topFoamRadius: number;
    guardFoamThickness: number;       // 두께 먼저 선택
    guardFoamEnabled: boolean | null;  // 유무 나중 선택
    guardFoamHardness: string;
    guardFoamRadius: number;
    bottomFoamEnabled: boolean | null;
    bottomFoamThickness: number;
    bottomFoamHardness: string;
    bottomFoamRadius: number;

    // Step 3: 스트링
    coreId: string | null;

    // Step 4~7
    coverId: string | null;
    controllerId: string | null;
    packagingId: string | null;
    deliveryId: string | null;

    // AI 생성된 커버 이미지 (coverId -> base64 data URL)
    customCoverImages: Record<string, string>;

    // 텍스처 추출기 결과 (상단/하단 커버별 top, front, side data URL)
    upperCoverTextures: { top: string | null; front: string | null; side: string | null };
    lowerCoverTextures: { top: string | null; front: string | null; side: string | null };

    // 텍스처 추출기 조절점 상태 (상단/하단 커버별 faceCoords)
    upperCoverCoords: any | null;
    lowerCoverCoords: any | null;

    // 텍스처 추출기 원본 이미지 (상단/하단 커버별 저장)
    coverExtractSourceImage: { upper: string | null; lower: string | null };

    // 스타일별 Default 텍스처 저장소 (Basic, Standard, Premium)
    defaultTextures: Record<string, {
        upper: { top: string | null; front: string | null; side: string | null };
        lower: { top: string | null; front: string | null; side: string | null };
        upperCoords: any | null;
        lowerCoords: any | null;
        sourceImage: { upper: string | null; lower: string | null };
    }>;

    currentStep: number;
}

interface DesignActions {
    setTitle: (title: string) => void;
    setSizePreset: (presetId: string, width: number, depth: number) => void;
    setCustomDimensions: (width: number, depth: number) => void;
    setIsDual: (isDual: boolean) => void;

    setStructureType: (type: 'basic' | 'standard' | 'premium') => void;
    setTopFoamEnabled: (enabled: boolean) => void;
    setTopFoamOption: (optionId: string) => void;
    setTopFoamRadius: (radius: number) => void;
    setGuardFoamThickness: (thickness: number) => void;
    setGuardFoamEnabled: (enabled: boolean) => void;
    setGuardFoamHardness: (hardness: string) => void;
    setGuardFoamRadius: (radius: number) => void;
    setBottomFoamEnabled: (enabled: boolean) => void;
    setBottomFoamDetails: (thickness: number, hardness: string) => void;
    setBottomFoamRadius: (radius: number) => void;

    setCore: (coreId: string) => void;
    setCover: (coverId: string) => void;
    setController: (controllerId: string) => void;
    setPackaging: (packagingId: string) => void;
    setDelivery: (deliveryId: string) => void;
    setCustomCoverImage: (coverId: string, imageUrl: string) => void;
    setUpperCoverTextures: (textures: { top: string | null; front: string | null; side: string | null }) => void;
    setLowerCoverTextures: (textures: { top: string | null; front: string | null; side: string | null }) => void;
    setUpperCoverCoords: (coords: any | null) => void;
    setLowerCoverCoords: (coords: any | null) => void;
    setCoverExtractSourceImage: (type: 'upper' | 'lower', imageUrl: string | null) => void;
    setDefaultTextures: (
        style: string,
        upper: { top: string | null; front: string | null; side: string | null },
        lower: { top: string | null; front: string | null; side: string | null },
        upperCoords: any | null,
        lowerCoords: any | null,
        sourceImage: { upper: string | null; lower: string | null }
    ) => void;

    _hydrateDefaults: () => void;

    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
    reset: () => void;
    loadFromPreset: (state: Omit<DesignState, 'currentStep'>) => void;
}

const initialState: DesignState = {
    title: '',
    sizePresetId: null,
    customWidth: 0,
    customDepth: 0,
    isDual: false,
    structureType: null,
    topFoamEnabled: null,
    topFoamOptionId: null,
    topFoamRadius: 10,
    guardFoamThickness: 80,
    guardFoamEnabled: null,
    guardFoamHardness: '미디엄',
    guardFoamRadius: 10,
    bottomFoamEnabled: null,
    bottomFoamThickness: 30,
    bottomFoamHardness: '미디엄',
    bottomFoamRadius: 0,
    coreId: null,
    coverId: null,
    controllerId: null,
    packagingId: null,
    deliveryId: null,
    customCoverImages: {},
    upperCoverTextures: { top: null, front: null, side: null },
    lowerCoverTextures: { top: null, front: null, side: null },
    upperCoverCoords: null,
    lowerCoverCoords: null,
    coverExtractSourceImage: { upper: null, lower: null },
    defaultTextures: {},
    currentStep: 1,
};

export const useDesignStore = create<DesignState & DesignActions>((set) => ({
    ...initialState,

    setTitle: (title) => set({ title }),

    setSizePreset: (presetId, width, depth) =>
        set({ sizePresetId: presetId, customWidth: width, customDepth: depth }),
    setCustomDimensions: (width, depth) =>
        set({ customWidth: width, customDepth: depth }),
    setIsDual: (isDual) => set((s) => ({
        isDual,
        // 가드폼 활성화는 오직 structureType='premium' 여부에 따름 (듀얼의 중앙가드폼은 컴포넌트 내부에서 별도 처리)
        guardFoamEnabled: s.structureType === 'premium' ? true : false
    })),

    setStructureType: (type) => set((state) => {
        let topEn = false, guardEn = false, botEn = false;
        if (type === 'standard') {
            topEn = true;
        } else if (type === 'premium') {
            topEn = true;
            guardEn = true;
            botEn = true;
        }

        let newCoverId = state.coverId;
        if (state.coverId && !state.coverId.startsWith('CUSTOM_COV_')) {
            if (type === 'basic') {
                if (state.coverId !== 'HEALING_NUMBER' && state.coverId !== 'COMPACT') newCoverId = null;
            } else if (type === 'premium') {
                if (state.coverId === 'HEALING_NUMBER' || state.coverId === 'COMPACT') newCoverId = null;
            }
        }

        return {
            structureType: type,
            topFoamEnabled: topEn,
            guardFoamEnabled: guardEn,
            bottomFoamEnabled: botEn,
            coverId: newCoverId,
        };
    }),

    setTopFoamEnabled: (enabled) =>
        set({ topFoamEnabled: enabled, topFoamOptionId: enabled ? null : null }),
    setTopFoamOption: (optionId) => set({ topFoamOptionId: optionId }),
    setTopFoamRadius: (radius) => set({ topFoamRadius: radius }),

    setGuardFoamThickness: (thickness) => set({ guardFoamThickness: thickness }),
    setGuardFoamEnabled: (enabled) => set({ guardFoamEnabled: enabled }),
    setGuardFoamHardness: (hardness) => set({ guardFoamHardness: hardness }),
    setGuardFoamRadius: (radius) => set({ guardFoamRadius: radius }),

    setBottomFoamEnabled: (enabled) => set({ bottomFoamEnabled: enabled }),
    setBottomFoamDetails: (thickness, hardness) =>
        set({ bottomFoamThickness: thickness, bottomFoamHardness: hardness }),
    setBottomFoamRadius: (radius) => set({ bottomFoamRadius: radius }),

    setCore: (coreId) => set({ coreId }),
    setCover: (coverId) => set({ coverId }),
    setController: (controllerId) => set({ controllerId }),
    setPackaging: (packagingId) => set({ packagingId }),
    setDelivery: (deliveryId) => set({ deliveryId }),
    setCustomCoverImage: (coverId, imageUrl) => set((s) => ({ customCoverImages: { ...s.customCoverImages, [coverId]: imageUrl } })),
    setUpperCoverTextures: (textures) => set({ upperCoverTextures: textures }),
    setLowerCoverTextures: (textures) => set({ lowerCoverTextures: textures }),
    setUpperCoverCoords: (coords) => set({ upperCoverCoords: coords }),
    setLowerCoverCoords: (coords) => set({ lowerCoverCoords: coords }),
    setCoverExtractSourceImage: (type, imageUrl) => set((s) => ({
        coverExtractSourceImage: { ...s.coverExtractSourceImage, [type]: imageUrl }
    })),
    setDefaultTextures: (style, upper, lower, upperCoords, lowerCoords, sourceImage) => set((s) => {
        const newDefaults = {
            ...s.defaultTextures,
            [style]: { upper, lower, upperCoords, lowerCoords, sourceImage }
        };
        if (typeof window !== 'undefined') {
            try { localStorage.setItem('mattress_default_textures', JSON.stringify(newDefaults)); } catch (e) { console.warn(e); }
        }
        return { defaultTextures: newDefaults };
    }),

    _hydrateDefaults: () => set((s) => {
        if (typeof window === 'undefined') return s;
        try {
            const raw = localStorage.getItem('mattress_default_textures');
            if (raw) return { defaultTextures: JSON.parse(raw) };
        } catch (e) { console.warn(e); }
        return s;
    }),

    nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 7) })),
    prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
    goToStep: (step) => set({ currentStep: step }),
    reset: () => set((s) => ({ ...initialState, defaultTextures: s.defaultTextures })), // preserve defaultTextures on reset
    loadFromPreset: (presetState) => set((s) => ({ ...presetState, currentStep: 1, defaultTextures: s.defaultTextures })), // preserve defaults
}));
