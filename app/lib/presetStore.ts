import { create } from 'zustand';
import type { DesignState } from './store';

// ── 프리셋 (설정 스냅샷) Store ──
// 모든 Step 선택값을 이름과 함께 localStorage에 저장 (최대 20개)

const STORAGE_KEY = 'mattress-presets';
const MAX_PRESETS = 20;

export interface MattressPreset {
    id: string;
    name: string;
    createdAt: string;
    state: Omit<DesignState, 'currentStep'>;
}

interface PresetStoreState {
    presets: MattressPreset[];
}

interface PresetStoreActions {
    savePreset: (name: string, state: DesignState) => boolean; // false if max reached
    loadPreset: (id: string) => MattressPreset | undefined;
    deletePreset: (id: string) => void;
    _hydrate: () => void;
}

function loadFromStorage(): MattressPreset[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveToStorage(presets: MattressPreset[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch { /* ignore quota errors */ }
}

export const usePresetStore = create<PresetStoreState & PresetStoreActions>((set, get) => ({
    presets: [],

    _hydrate: () => set({ presets: loadFromStorage() }),

    savePreset: (name, designState) => {
        const { presets } = get();
        if (presets.length >= MAX_PRESETS) return false;

        const { currentStep, ...rest } = designState;
        const newPreset: MattressPreset = {
            id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            createdAt: new Date().toISOString(),
            state: rest,
        };

        const next = [...presets, newPreset];
        saveToStorage(next);
        set({ presets: next });
        return true;
    },

    loadPreset: (id) => {
        return get().presets.find(p => p.id === id);
    },

    deletePreset: (id) => {
        const next = get().presets.filter(p => p.id !== id);
        saveToStorage(next);
        set({ presets: next });
    },
}));
