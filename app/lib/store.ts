import { create } from 'zustand';

export interface DesignState {
    // Title
    title: string;

    // Step 1: 사이즈
    sizePresetId: string | null;
    customWidth: number;
    customDepth: number;
    isDual: boolean;       // Dual 옵션

    // Step 2: 폼 선택
    topFoamEnabled: boolean | null;
    topFoamOptionId: string | null;
    guardFoamThickness: number;       // 두께 먼저 선택
    guardFoamEnabled: boolean | null;  // 유무 나중 선택
    guardFoamHardness: string;
    bottomFoamEnabled: boolean | null;
    bottomFoamThickness: number;
    bottomFoamHardness: string;

    // Step 3: 스트링
    coreId: string | null;

    // Step 4~7
    coverId: string | null;
    controllerId: string | null;
    packagingId: string | null;
    deliveryId: string | null;

    // AI 생성된 커버 이미지 (coverId -> base64 data URL)
    customCoverImages: Record<string, string>;

    currentStep: number;
}

interface DesignActions {
    setTitle: (title: string) => void;
    setSizePreset: (presetId: string, width: number, depth: number) => void;
    setCustomDimensions: (width: number, depth: number) => void;
    setIsDual: (isDual: boolean) => void;

    setTopFoamEnabled: (enabled: boolean) => void;
    setTopFoamOption: (optionId: string) => void;
    setGuardFoamThickness: (thickness: number) => void;
    setGuardFoamEnabled: (enabled: boolean) => void;
    setGuardFoamHardness: (hardness: string) => void;
    setBottomFoamEnabled: (enabled: boolean) => void;
    setBottomFoamDetails: (thickness: number, hardness: string) => void;

    setCore: (coreId: string) => void;
    setCover: (coverId: string) => void;
    setController: (controllerId: string) => void;
    setPackaging: (packagingId: string) => void;
    setDelivery: (deliveryId: string) => void;
    setCustomCoverImage: (coverId: string, imageUrl: string) => void;

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
    topFoamEnabled: null,
    topFoamOptionId: null,
    guardFoamThickness: 80,
    guardFoamEnabled: null,
    guardFoamHardness: '미디엄',
    bottomFoamEnabled: null,
    bottomFoamThickness: 30,
    bottomFoamHardness: '미디엄',
    coreId: null,
    coverId: null,
    controllerId: null,
    packagingId: null,
    deliveryId: null,
    customCoverImages: {},
    currentStep: 1,
};

export const useDesignStore = create<DesignState & DesignActions>((set) => ({
    ...initialState,

    setTitle: (title) => set({ title }),

    setSizePreset: (presetId, width, depth) =>
        set({ sizePresetId: presetId, customWidth: width, customDepth: depth }),
    setCustomDimensions: (width, depth) =>
        set({ customWidth: width, customDepth: depth }),
    setIsDual: (isDual) => set({ isDual }),

    setTopFoamEnabled: (enabled) =>
        set({ topFoamEnabled: enabled, topFoamOptionId: enabled ? null : null }),
    setTopFoamOption: (optionId) => set({ topFoamOptionId: optionId }),

    setGuardFoamThickness: (thickness) => set({ guardFoamThickness: thickness }),
    setGuardFoamEnabled: (enabled) => set({ guardFoamEnabled: enabled }),
    setGuardFoamHardness: (hardness) => set({ guardFoamHardness: hardness }),

    setBottomFoamEnabled: (enabled) => set({ bottomFoamEnabled: enabled }),
    setBottomFoamDetails: (thickness, hardness) =>
        set({ bottomFoamThickness: thickness, bottomFoamHardness: hardness }),

    setCore: (coreId) => set({ coreId }),
    setCover: (coverId) => set({ coverId }),
    setController: (controllerId) => set({ controllerId }),
    setPackaging: (packagingId) => set({ packagingId }),
    setDelivery: (deliveryId) => set({ deliveryId }),
    setCustomCoverImage: (coverId, imageUrl) => set((s) => ({ customCoverImages: { ...s.customCoverImages, [coverId]: imageUrl } })),

    nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 7) })),
    prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) })),
    goToStep: (step) => set({ currentStep: step }),
    reset: () => set(initialState),
    loadFromPreset: (presetState) => set({ ...presetState, currentStep: 1 }),
}));
