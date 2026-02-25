import { create } from 'zustand';
import type { SizePreset, TopFoamOption, CoreOption, CoverOption, GenericOption } from './constants';

// ── 커스텀 옵션 Store ──
// localStorage를 통해 사용자가 추가한 커스텀 옵션을 영속화

const STORAGE_KEY = 'mattress-custom-options';

export interface CustomOptionsState {
    sizes: SizePreset[];
    topFoams: TopFoamOption[];
    guardThicknesses: number[];
    guardHardnesses: string[];
    bottomThicknesses: number[];
    bottomHardnesses: string[];
    cores: CoreOption[];
    covers: CoverOption[];
    controllers: GenericOption[];
    packagings: GenericOption[];
    deliveries: GenericOption[];
    coverDefaults: Record<string, {
        upper: any;
        lower: any;
        upperCoords: any;
        lowerCoords: any;
        upperSource: string | null;
        lowerSource: string | null;
    }>;
}

interface CustomOptionsActions {
    addSize: (item: SizePreset) => void;
    removeSize: (id: string) => void;
    addTopFoam: (item: TopFoamOption) => void;
    removeTopFoam: (id: string) => void;
    addGuardThickness: (val: number) => void;
    removeGuardThickness: (val: number) => void;
    addGuardHardness: (val: string) => void;
    removeGuardHardness: (val: string) => void;
    addBottomThickness: (val: number) => void;
    removeBottomThickness: (val: number) => void;
    addBottomHardness: (val: string) => void;
    removeBottomHardness: (val: string) => void;
    addCore: (item: CoreOption) => void;
    removeCore: (id: string) => void;
    addCover: (item: CoverOption) => void;
    removeCover: (id: string) => void;
    addController: (item: GenericOption) => void;
    removeController: (id: string) => void;
    addPackaging: (item: GenericOption) => void;
    removePackaging: (id: string) => void;
    addDelivery: (item: GenericOption) => void;
    removeDelivery: (id: string) => void;
    setCoverDefaults: (coverId: string, defaults: any) => void;
    _hydrate: () => void;
}

const emptyState: CustomOptionsState = {
    sizes: [],
    topFoams: [],
    guardThicknesses: [],
    guardHardnesses: [],
    bottomThicknesses: [],
    bottomHardnesses: [],
    cores: [],
    covers: [],
    controllers: [],
    packagings: [],
    deliveries: [],
    coverDefaults: {},
};

function loadFromStorage(): CustomOptionsState {
    if (typeof window === 'undefined') return emptyState;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyState;
        return { ...emptyState, ...JSON.parse(raw) };
    } catch {
        return emptyState;
    }
}

function saveToStorage(state: CustomOptionsState) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
}

export const useCustomOptionsStore = create<CustomOptionsState & CustomOptionsActions>((set, get) => ({
    ...emptyState,

    _hydrate: () => set(loadFromStorage()),

    // Size
    addSize: (item) => set((s) => {
        const next = { ...s, sizes: [...s.sizes, item] };
        saveToStorage(next);
        return next;
    }),
    removeSize: (id) => set((s) => {
        const next = { ...s, sizes: s.sizes.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Top Foam
    addTopFoam: (item) => set((s) => {
        const next = { ...s, topFoams: [...s.topFoams, item] };
        saveToStorage(next);
        return next;
    }),
    removeTopFoam: (id) => set((s) => {
        const next = { ...s, topFoams: s.topFoams.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Guard Thickness
    addGuardThickness: (val) => set((s) => {
        const next = { ...s, guardThicknesses: [...s.guardThicknesses, val] };
        saveToStorage(next);
        return next;
    }),
    removeGuardThickness: (val) => set((s) => {
        const next = { ...s, guardThicknesses: s.guardThicknesses.filter(x => x !== val) };
        saveToStorage(next);
        return next;
    }),

    // Guard Hardness
    addGuardHardness: (val) => set((s) => {
        const next = { ...s, guardHardnesses: [...s.guardHardnesses, val] };
        saveToStorage(next);
        return next;
    }),
    removeGuardHardness: (val) => set((s) => {
        const next = { ...s, guardHardnesses: s.guardHardnesses.filter(x => x !== val) };
        saveToStorage(next);
        return next;
    }),

    // Bottom Thickness
    addBottomThickness: (val) => set((s) => {
        const next = { ...s, bottomThicknesses: [...s.bottomThicknesses, val] };
        saveToStorage(next);
        return next;
    }),
    removeBottomThickness: (val) => set((s) => {
        const next = { ...s, bottomThicknesses: s.bottomThicknesses.filter(x => x !== val) };
        saveToStorage(next);
        return next;
    }),

    // Bottom Hardness
    addBottomHardness: (val) => set((s) => {
        const next = { ...s, bottomHardnesses: [...s.bottomHardnesses, val] };
        saveToStorage(next);
        return next;
    }),
    removeBottomHardness: (val) => set((s) => {
        const next = { ...s, bottomHardnesses: s.bottomHardnesses.filter(x => x !== val) };
        saveToStorage(next);
        return next;
    }),

    // Core (스트링)
    addCore: (item) => set((s) => {
        const next = { ...s, cores: [...s.cores, item] };
        saveToStorage(next);
        return next;
    }),
    removeCore: (id) => set((s) => {
        const next = { ...s, cores: s.cores.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Cover
    addCover: (item) => set((s) => {
        const next = { ...s, covers: [...s.covers, item] };
        saveToStorage(next);
        return next;
    }),
    removeCover: (id) => set((s) => {
        const next = { ...s, covers: s.covers.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Controller
    addController: (item) => set((s) => {
        const next = { ...s, controllers: [...s.controllers, item] };
        saveToStorage(next);
        return next;
    }),
    removeController: (id) => set((s) => {
        const next = { ...s, controllers: s.controllers.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Packaging
    addPackaging: (item) => set((s) => {
        const next = { ...s, packagings: [...s.packagings, item] };
        saveToStorage(next);
        return next;
    }),
    removePackaging: (id) => set((s) => {
        const next = { ...s, packagings: s.packagings.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Delivery
    addDelivery: (item) => set((s) => {
        const next = { ...s, deliveries: [...s.deliveries, item] };
        saveToStorage(next);
        return next;
    }),
    removeDelivery: (id) => set((s) => {
        const next = { ...s, deliveries: s.deliveries.filter(x => x.id !== id) };
        saveToStorage(next);
        return next;
    }),

    // Cover Defaults
    setCoverDefaults: (coverId, defaults) => set((s) => {
        const next = { ...s, coverDefaults: { ...s.coverDefaults, [coverId]: defaults } };
        saveToStorage(next);
        return next;
    }),
}));
