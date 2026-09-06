// ============================================================
// 위자드 DesignState + 사이즈 → BOM 줄 (기획안 5장 규칙)
// 순수 함수. DB·React 의존 없음.
// ============================================================
import { calcCoreDimensions, CORE_DEFAULT_HEIGHT } from '../constants';
import { ASSEMBLY, AUTO_PARTS, IOT_CONTROLLERS, itemNoForOption, guardKey, bottomKey } from './codes';
import type { BomDesignInput, BomLine, Dim, SizeSpec, UnmappedOption } from './types';

/** 'TOP_70_2L' → 70. 없으면 0 */
export function topFoamHeight(optionId: string | null): number {
    if (!optionId) return 0;
    const n = parseInt(optionId.split('_')[1] || '0', 10);
    return Number.isFinite(n) ? n : 0;
}

const fmt = (d: Dim) => `${d.w}×${d.d}×${d.h}`;
function specText(dims: Dim[]): string {
    if (dims.length === 1 && !dims[0].label) return fmt(dims[0]);
    return dims.map(d => `${d.label ? d.label + ': ' : ''}${fmt(d)} ×${d.qty}`).join(' / ');
}

function line(partial: Partial<BomLine> & Pick<BomLine, 'item_no' | 'level' | 'parent_item_no' | 'quantity'>): BomLine {
    return {
        required: '필수', alt_item_no: null, spec_text: null, dims: null, note: null, source: 'wizard',
        ...partial,
    };
}

/** 치수 1건짜리 부품 줄 */
function partLine(itemNo: string, parent: string, w: number, d: number, h: number, qty = 1, extra: Partial<BomLine> = {}): BomLine {
    const dims: Dim[] = [{ w, d, h, qty }];
    return line({ item_no: itemNo, level: 2, parent_item_no: parent, quantity: qty, dims, spec_text: specText(dims), ...extra });
}

export function buildBom(design: BomDesignInput, size: SizeSpec): { lines: BomLine[]; unmapped: UnmappedOption[] } {
    const W = size.width_mm, D = size.depth_mm;
    const coreH = CORE_DEFAULT_HEIGHT;
    const topH = design.topFoamEnabled ? topFoamHeight(design.topFoamOptionId) : 0;
    const botH = design.bottomFoamEnabled ? design.bottomFoamThickness : 0;
    const totalH = topH + coreH + botH;
    const gfOn = design.guardFoamEnabled === true;
    const dims = calcCoreDimensions(W, D, design.guardFoamThickness, design.isDual, gfOn);
    const dualQty = design.isDual ? 2 : 1;

    const unmapped: UnmappedOption[] = [];
    const groups: { assembly: string; parts: BomLine[] }[] = [];
    const resolve = (step: string, key: string | null): string | null => {
        if (!key) return null;
        const no = itemNoForOption(key);
        if (!no) unmapped.push({ step, optionKey: key });
        return no;
    };

    // ── 폼 ──
    const foam: BomLine[] = [];
    if (design.topFoamEnabled && design.topFoamOptionId) {
        const no = resolve('상단폼', design.topFoamOptionId);
        if (no) foam.push(partLine(no, ASSEMBLY.FM, W, D, topH));
    }
    if (gfOn) {
        const no = resolve('가드폼', guardKey(design.guardFoamThickness, design.guardFoamHardness));
        if (no) {
            const t = design.guardFoamThickness;
            const gd: Dim[] = [
                { label: 'D', w: t, d: dims.guardD_len, h: coreH, qty: dims.guardD_count },
                { label: 'W', w: t, d: dims.guardW_len, h: coreH, qty: dims.guardW_count },
            ];
            foam.push(line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.FM, quantity: dims.guardD_count + dims.guardW_count, dims: gd, spec_text: specText(gd) }));
        }
    }
    if (design.bottomFoamEnabled) {
        const no = resolve('하단폼', bottomKey(design.bottomFoamThickness, design.bottomFoamHardness));
        if (no) foam.push(partLine(no, ASSEMBLY.FM, W, D, botH));
    }
    if (foam.length) groups.push({ assembly: ASSEMBLY.FM, parts: foam });

    // ── 스트링 ──
    if (design.coreId) {
        const no = resolve('스트링', design.coreId);
        if (no) groups.push({ assembly: ASSEMBLY.ST, parts: [partLine(no, ASSEMBLY.ST, dims.coreW, dims.coreD, coreH, dualQty)] });
    }

    // ── 커버 (스타일 + 라벨) ──
    if (design.coverId) {
        const no = resolve('커버', design.coverId);
        const parts: BomLine[] = [];
        if (no) parts.push(partLine(no, ASSEMBLY.CV, W, D, totalH));
        parts.push(line({ item_no: AUTO_PARTS.LABEL_LAW, level: 2, parent_item_no: ASSEMBLY.CV, quantity: 1 }));
        parts.push(line({ item_no: AUTO_PARTS.LABEL_LOGO, level: 2, parent_item_no: ASSEMBLY.CV, quantity: 1 }));
        groups.push({ assembly: ASSEMBLY.CV, parts });
    }

    // ── 컨트롤러 (본체 + 부속품) ──
    if (design.controllerId) {
        const no = resolve('컨트롤러', design.controllerId);
        const parts: BomLine[] = [];
        if (no) parts.push(line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.CT, quantity: dualQty }));
        parts.push(line({ item_no: AUTO_PARTS.ADAPTER, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        parts.push(line({ item_no: AUTO_PARTS.AIR_HOSE, level: 2, parent_item_no: ASSEMBLY.CT, quantity: dualQty * 2, note: dualQty === 2 ? '듀얼 좌/우 각 2개' : '좌/우 2개' }));
        parts.push(line({ item_no: AUTO_PARTS.MANUAL, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        if (design.controllerId === 'IOT_STICK') {
            parts.push(line({ item_no: AUTO_PARTS.IOT_STICK, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        }
        parts.push(line({ item_no: AUTO_PARTS.CTRL_BOX, level: 2, parent_item_no: ASSEMBLY.CT, quantity: 1 }));
        groups.push({ assembly: ASSEMBLY.CT, parts });
    }

    // ── 센서 ──
    if (design.sensorId) {
        const no = resolve('센서', design.sensorId);
        if (no) groups.push({ assembly: ASSEMBLY.SN, parts: [line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.SN, quantity: dualQty })] });
    }

    // ── 포장 (방식 + 포장재). 포장방식은 WIDTH_STEP 단가용으로 W/D만 기록 ──
    if (design.packagingId) {
        const no = resolve('포장', design.packagingId);
        const parts: BomLine[] = [];
        if (no) {
            const alt = no === 'PK-001' ? 'PK-002' : no === 'PK-002' ? 'PK-001' : null;
            parts.push(partLine(no, ASSEMBLY.PK, W, D, 0, 1, { alt_item_no: alt, spec_text: null }));
        }
        parts.push(line({ item_no: AUTO_PARTS.PKG_BOX, level: 2, parent_item_no: ASSEMBLY.PK, quantity: 1 }));
        parts.push(line({ item_no: AUTO_PARTS.PKG_VINYL, level: 2, parent_item_no: ASSEMBLY.PK, quantity: 1 }));
        groups.push({ assembly: ASSEMBLY.PK, parts });
    }

    // ── APP/서버 (IoT 계열 컨트롤러일 때만) ──
    if (design.controllerId && IOT_CONTROLLERS.has(design.controllerId)) {
        groups.push({
            assembly: ASSEMBLY.SW,
            parts: [AUTO_PARTS.SW_ANDROID, AUTO_PARTS.SW_IOS, AUTO_PARTS.SW_SERVER_KR]
                .map(no => line({ item_no: no, level: 2, parent_item_no: ASSEMBLY.SW, quantity: 1, note: no === AUTO_PARTS.SW_SERVER_KR ? 'KR 리전' : null })),
        });
    }

    // 레벨1 전부 → 레벨2 전부 (DB 트리거가 상위 존재를 검사하므로 순서 중요)
    const lines: BomLine[] = [
        ...groups.map(g => line({ item_no: g.assembly, level: 1, parent_item_no: null, quantity: 1 })),
        ...groups.flatMap(g => g.parts),
    ];
    return { lines, unmapped };
}
