import { DesignState } from './store';
import {
    SIZE_PRESETS,
    COVER_OPTIONS,
    TOP_FOAM_OPTIONS,
    GUARD_FOAM_THICKNESS_OPTIONS,
    GUARD_FOAM_HARDNESS_OPTIONS,
    BOTTOM_FOAM_THICKNESS_OPTIONS,
    BOTTOM_FOAM_HARDNESS_OPTIONS,
    CORE_OPTIONS
} from './constants';
import { BrochureData } from '../types/brochure';
import { generatePrompts } from './promptGenerator';

export const convertStateToBrochureData = (state: DesignState): BrochureData => {
    // 1. 옵션 찾기
    const sizePreset = SIZE_PRESETS.find(s => s.id === state.sizePresetId);
    const cover = COVER_OPTIONS.find(c => c.id === state.coverId) || COVER_OPTIONS[0];
    const core = CORE_OPTIONS.find(c => c.id === state.coreId);
    const topFoam = TOP_FOAM_OPTIONS.find(t => t.id === state.topFoamOptionId);

    // 2. 메타 데이터 구성
    // 사이즈 정보 (현재 선택된 사이즈 + 가능한 모든 사이즈)
    const currentSizeLabel = sizePreset ? sizePreset.label : `Custom (${state.customWidth}x${state.customDepth})`;
    const allSizes = SIZE_PRESETS.filter(s => s.region === (sizePreset?.region || '국내')).map(s => s.id);

    // 3. 스펙 정보 구성
    const structure = state.isDual ? '듀얼 코어 (좌우 분리형)' : '싱글 코어 (일체형)';
    const hardness = `${state.guardFoamHardness} (가드) / ${state.bottomFoamHardness} (하단)`;

    // 인증 정보 (가상의 데이터 사용)
    const certifications = ['KFI 방염 인증', 'CertiPUR-US', 'OEKO-TEX Standard 100'];

    // 4. 이미지 (기본값 설정 - 실제로는 생성된 이미지를 써야 하지만, 여기서는 Resource 폴더 매핑)
    // 커버 ID에 따라 미리 준비된 이미지 매핑 (없으면 기본 이미지)
    const defaultImage = '/resource/올케어.jpg';
    const coverImage = cover.image || defaultImage;

    // 5. 프롬프트 생성
    const prompts = generatePrompts(state);

    return {
        meta: {
            title: state.title || '나만의 매트리스',
            subtitle: `${cover.label} - ${cover.description}`,
            description: `당신만을 위해 설계된 맞춤형 매트리스입니다. ${cover.grade} 등급의 프리미엄 소재와 정밀한 ${structure} 설계로 최상의 수면 경험을 제공합니다.`,
            colors: [cover.color, '#FFFFFF', '#CCCCCC'], // 예시 색상
            sizes: allSizes,
        },
        specs: {
            productName: state.title || cover.label,
            structure: structure,
            hardness: hardness,
            fabric: cover.description,
            certifications: certifications,
        },
        images: {
            page1_main: coverImage,
            page1_sub: coverImage,
            page2_layer: '/resource/pdf_pages/올케어_p2.png',
            page2_detail: coverImage,
            page2_extra: coverImage, // 기본값
        },
        prompts: {
            ...prompts,
            page2_extra: 'A photorealistic close-up of a premium smart mattress IoT controller, modern bedroom setting', // 기본 프롬프트
        }
    };
};
