import { DesignState } from './store';
import { COVER_OPTIONS, CORE_OPTIONS, TOP_FOAM_OPTIONS } from './constants';

export const generatePrompts = (state: DesignState) => {
  const cover = COVER_OPTIONS.find((c) => c.id === state.coverId) || COVER_OPTIONS[0];
  const core = CORE_OPTIONS.find((c) => c.id === state.coreId);
  const topFoam = TOP_FOAM_OPTIONS.find((t) => t.id === state.topFoamOptionId);

  // 기본 스타일 키워드
  const styleKeywords = cover.grade === '고'
    ? 'premium, luxury, high-end, hotel suite style, sophisticated'
    : 'modern, clean, minimalist, cozy, comfortable';

  // 색상 톤
  const colorTone = cover.color ? `color palette ${cover.color},` : 'neutral distinct colors,';

  // 1. Page 1 Main Image (전체 뷰)
  // 예: "A realistic studio shot of a premium mattress with [Color] fabric, soft lighting, 4k, highly detailed"
  const page1_main = `A realistic studio shot of a ${styleKeywords} mattress, 
  ${cover.label} design, ${colorTone} fabric texture, 
  soft morning sunlight, cozy bedroom interior background, 
  high resolution, 4k, photorealistic, cinematic lighting`.replace(/\n/g, ' ').trim();

  // 2. Page 1 Sub Image (헤드보드/디테일 뷰)
  // 예: "Close-up shot of mattress corner, fabric texture detail..."
  const page1_sub = `Close-up shot of a mattress corner, ${cover.label} fabric detail, 
  ${colorTone} high quality texture, soft focus background, 
  luxury bedding prop, warm lighting, 8k, macro photography`.replace(/\n/g, ' ').trim();

  // 3. Page 2 Detail Image (내장재/기능성 뷰)
  // 예: "Cross-section view of mattress layers, memory foam, spring..."
  const materials = [];
  if (topFoam) materials.push(`${topFoam.label} memory foam layer`);
  if (core) materials.push(`${core.material} air cell core`);

  const page2_detail = `Artistic 3D layer visualization of a mattress, 
  showing internal structure, ${materials.join(', ')}, 
  breathable fabric technology, technical illustration style, 
  clean white background, soft blue accents for air flow`.replace(/\n/g, ' ').trim();

  const page2_layer = `A cross section diagram of a mattress, 
    showcasing different internal layers stacked, 
    ${topFoam ? topFoam.label + ' foam layer,' : ''} 
    ${core ? core.material + ' core spring,' : ''} 
    clear separation, 3D render, white background`.replace(/\n/g, ' ').trim();

  return {
    page1_main,
    page1_sub,
    page2_layer,
    page2_detail,
  };
};
