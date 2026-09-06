// ============================================================
// 엑셀 템플릿(11시트) ↔ 테이블 행 (기획안 9장)
// 읽기: xlsx / 쓰기: ExcelJS
// ============================================================
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { SIZE_PRESETS } from '../constants';
import { PREFIX_CATEGORY, prefixOf } from './codes';

/** 배포 템플릿의 구 품번 → 새 체계. 품명이 템플릿 원본과 일치할 때만 적용 (우리 export 재가져오기 보호) */
export const TEMPLATE_LEGACY: Record<string, { to: string; name: RegExp }> = {
    'CT-002': { to: 'CT-010', name: /어댑터/ },
    'CT-003': { to: 'CT-011', name: /에어호스/ },
    'CT-004': { to: 'CT-012', name: /매뉴얼/ },
    'CT-005': { to: 'CT-013', name: /IoT\s*Stick/i },
    'CT-006': { to: 'CT-014', name: /포장박스/ },
    'CV-010': { to: 'FM-002', name: /^폼/ },
};

/** 템플릿 품번 → 새 체계 (기획안 5.1). 하위 호환용 평탄화 맵 */
export const RENUMBER: Record<string, string> = Object.fromEntries(
    Object.entries(TEMPLATE_LEGACY).map(([k, v]) => [k, v.to]),
);

type Row = Record<string, unknown>;
const S = (v: unknown) => (v === undefined || v === null || v === '' ? null : String(v).trim());
const N = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
const D = (v: unknown) => {                       // 엑셀 날짜(숫자/문자) → 'YYYY-MM-DD'
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`; }
    return String(v).slice(0, 10);
};

/** JSON 문자열 셀 → 객체. 비어 있으면 null */
const J = <T,>(v: unknown): T | null => { const s = S(v); return s ? (JSON.parse(s) as T) : null; };

/** 템플릿 일반 커버 패널 판별 (기획안 5.1) */
const LEGACY_COVER_NO = /^CV-00[1-3]$/;
const LEGACY_COVER_NAME = /^커버\d/;

/** 제외 대상 품번을 품번/상위품번/대체품번 중 하나로 참조하는 행인가 */
function refsLegacy(r: Row, legacy: Map<string, string>): boolean {
    return ['item_no', 'parent_item_no', 'alt_item_no'].some(k => legacy.has(r[k] as string));
}

export interface ImportBundle {
    employees: Row[]; vendors: Row[]; items: Row[]; products: Row[];
    bom_lines: Row[]; avl: Row[]; npi_status: Row[]; ecn: Row[]; ecn_products: { ecn_no: string; product_code: string }[];
    code_values: { code_type: string; value: string; sort_order: number }[];
    log: string[];
}

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { defval: '' }).filter((r): r is Row => Object.values(r as Row).some(v => v !== ''));
}

export function parseTemplate(buf: Buffer, opts: { size_preset_id: string }): ImportBundle {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const log: string[] = [];
    const size = SIZE_PRESETS.find(s => s.id === opts.size_preset_id);
    if (!size) throw new Error(`알 수 없는 사이즈 프리셋: ${opts.size_preset_id}`);
    // 품목마스터에 legacy 품번이 "템플릿 원본 품명"으로 실존할 때만 재번호 대상에 넣는다
    // (우리 export 재가져오기 시 같은 품번을 쓰는 시드 데이터의 품명은 다르므로 보호된다)
    const itemRows = sheetRows(wb, '품목마스터');
    const activeRenumber: Record<string, string> = {};
    for (const [code, { to, name }] of Object.entries(TEMPLATE_LEGACY)) {
        const row = itemRows.find(r => S(r['품번']) === code);
        if (row && name.test(String(S(row['품명']) ?? ''))) activeRenumber[code] = to;
    }
    const renum = (no: string | null) => {
        if (!no) return null;
        const to = activeRenumber[no];
        if (to) log.push(`품번 재번호: ${no} → ${to}`);
        return to ?? no;
    };
    // 상품코드에 사이즈 접미어 부여. 이미 붙어 있으면(내보내기 파일 재가져오기) 유지
    const pcode = (code: string | null) => (code ? (code.endsWith(`-${size.id}`) ? code : `${code}-${size.id}`) : null);
    const mcode = (code: string) => (code.endsWith(`-${size.id}`) ? code.slice(0, -(size.id.length + 1)) : code);

    const employees = sheetRows(wb, '담당자마스터').map(r => ({
        employee_id: S(r['담당자ID']), name: S(r['이름']), department: S(r['부서']), title: S(r['직책']),
        email: S(r['이메일']), phone: S(r['연락처']), role: S(r['권한']) ?? 'viewer', note: S(r['비고']),
    }));
    const vendors = sheetRows(wb, '협력사마스터').map(r => ({
        vendor_code: S(r['협력사코드']), name: S(r['협력사명']), vendor_type: S(r['유형']), country: S(r['국가']),
        contact_name: S(r['담당자명']), phone: S(r['연락처']), email: S(r['이메일']), main_items: S(r['주요취급품목']), note: S(r['비고']),
    }));
    const allItems = itemRows.map(r => {
        const item_no = renum(S(r['품번']))!;
        const created = D(r['등록일']);   // 비면 키 자체를 만들지 않는다 (items.created_at NOT NULL DEFAULT current_date)
        return {
            item_no, name: S(r['품명']), category: PREFIX_CATEGORY[prefixOf(item_no)], subcategory: S(r['중분류']),
            item_type: S(r['품목구분']), spec: S(r['규격/사양']), unit: S(r['단위']) ?? 'EA', revision: S(r['리비전']) ?? 'A',
            spec_url: S(r['사양서/도면 링크']), memo: S(r['특징/메모']), ...(created ? { created_at: created } : {}),
        };
    });
    // 템플릿의 일반 커버 패널(CV-001~003 = '커버1/2/3')은 시드 커버 스타일과 품번이 겹친다.
    // 기획안 5.1: 커버 분리수는 products.cover_split_count로 관리하므로 제외한다.
    // 내보내기 파일을 다시 가져올 때(CV-001 = '힐링넘버 스타일')는 품명이 달라 걸리지 않는다.
    const legacyPanels = new Map<string, string>(
        allItems.filter(i => LEGACY_COVER_NO.test(i.item_no) && LEGACY_COVER_NAME.test(String(i.name ?? '')))
            .map(i => [i.item_no, String(i.name ?? '')] as [string, string]),
    );
    const items = allItems.filter(i => !legacyPanels.has(i.item_no));
    const products = sheetRows(wb, '상품마스터').map(r => {
        const raw = S(r['상품코드'])!;
        const model_code = mcode(raw);
        return {
            product_code: pcode(raw), model_code, name: S(r['상품명']), family: S(r['상품군']), status: S(r['상태']) ?? '기획',
            launch_target_date: D(r['출시목표일']), pm_id: S(r['PM(담당자ID)']), cover_split_count: N(r['커버 분리수']) ?? 2,
            size_preset_id: size.id, width_mm: size.width, depth_mm: size.depth, is_dual: false, note: S(r['비고']),
        };
    });
    const bomRaw = sheetRows(wb, 'BOM').map(r => ({
        product_code: pcode(S(r['상품코드'])), level: N(r['레벨']), parent_item_no: renum(S(r['상위품번'])), item_no: renum(S(r['품번'])),
        quantity: N(r['소요량']) ?? 1, required: S(r['필수여부']) ?? '필수', alt_item_no: renum(S(r['대체품번'])), note: S(r['비고']),
        spec_text: S(r['규격']), dims: J(r['치수']), source: S(r['출처']) ?? 'manual',
    }));
    // 상품별로 레벨1 → 레벨2 순 (DB 트리거)
    const bomAll = [...bomRaw].sort((a, b) => String(a.product_code).localeCompare(String(b.product_code)) || (a.level ?? 0) - (b.level ?? 0));
    const bom_lines = bomAll.filter(l => !refsLegacy(l, legacyPanels));
    const avlAll = sheetRows(wb, 'AVL').map(r => ({
        item_no: renum(S(r['품번'])), vendor_code: S(r['협력사코드']), owner_id: S(r['사내담당자ID']), approval_status: S(r['승인상태']) ?? '후보',
        lead_time_days: N(r['리드타임(일)']), moq: N(r['MOQ']), unit_price: N(r['단가']) ?? 0, currency: S(r['통화']) ?? 'KRW',
        approved_at: D(r['승인일']), price_type: S(r['단가방식']) ?? 'FIXED', price_constant: N(r['상수']) ?? 0,
        price_base: N(r['기본금']) ?? 0, price_steps: J(r['단가구간']), note: S(r['비고']),
    }));
    const avl = avlAll.filter(a => !refsLegacy(a, legacyPanels));
    const npiAll = sheetRows(wb, 'NPI진행현황').map(r => ({
        product_code: pcode(S(r['상품코드'])), item_no: renum(S(r['품번'])), owner_id: S(r['담당자ID']), stage: S(r['개발단계']) ?? '기획',
        progress: N(r['완료율']) ?? 0, start_date: D(r['시작일']), target_date: D(r['목표일']), issue_status: S(r['이슈상태']) ?? '없음',
        issue_detail: S(r['이슈내용']), next_milestone: S(r['다음 마일스톤']), note: S(r['비고']),
    }));
    const npi_status = npiAll.filter(n => !refsLegacy(n, legacyPanels));
    const ecn_products_all: ImportBundle['ecn_products'] = [];
    const ecnAll = sheetRows(wb, 'ECN변경이력').map(r => {
        const ecn_no = S(r['ECN번호'])!;
        const [rev_from, rev_to] = (S(r['리비전(전→후)']) ?? '→').split('→').map(s => s.trim());
        for (const c of (S(r['영향 상품']) ?? '').split(',').map(s => s.trim()).filter(Boolean)) ecn_products_all.push({ ecn_no, product_code: pcode(c)! });
        const ecnDate = D(r['일자']);   // 비면 키 생략 (ecn.ecn_date NOT NULL DEFAULT current_date)
        return {
            ecn_no, ...(ecnDate ? { ecn_date: ecnDate } : {}), item_no: renum(S(r['품번'])), change_type: S(r['변경구분']), rev_from: rev_from || null, rev_to: rev_to || null,
            before_text: S(r['변경 전']), after_text: S(r['변경 후']), reason: S(r['사유']), requester_id: S(r['요청자ID']), approver_id: S(r['승인자ID']),
            status: S(r['상태']) ?? '요청', note: S(r['비고']),
        };
    });
    const ecn = ecnAll.filter(e => !refsLegacy(e, legacyPanels));
    // 제외된 ECN(레거시 커버 참조)의 영향 상품 행도 함께 제외한다
    const keptEcnNos = new Set(ecn.map(e => e.ecn_no as string));
    const ecn_products = ecn_products_all.filter(p => keptEcnNos.has(p.ecn_no));
    // 제외한 커버 패널마다 삭제된 행 수를 로그로 남긴다
    for (const [no, name] of legacyPanels) {
        const one = new Map([[no, name]]);
        const cnt = (rows: Row[]) => rows.filter(r => refsLegacy(r, one)).length;
        log.push(`템플릿 일반 커버 품목 ${no}(${name}) 제외: BOM ${cnt(bomAll)} / AVL ${cnt(avlAll)} / NPI ${cnt(npiAll)} 행 삭제 — 커버 분리수는 products.cover_split_count로 관리`);
    }
    const codeSheet = XLSX.utils.sheet_to_json<string[]>(wb.Sheets['코드표'] ?? {}, { header: 1, defval: '' });
    const CODE_TYPE_OF: Record<string, string> = { '대분류': 'category', '품목구분': 'item_type', '개발단계': 'dev_stage', '승인상태': 'approval_status', '상품상태': 'product_status', '이슈상태': 'issue_status', '협력사유형': 'vendor_type', '변경구분': 'change_type', '필수여부': 'required' };
    const code_values: ImportBundle['code_values'] = [];
    (codeSheet[0] ?? []).forEach((h, col) => {
        const t = CODE_TYPE_OF[h]; if (!t) return;
        codeSheet.slice(1).forEach((row, i) => { const v = S(row[col]); if (v) code_values.push({ code_type: t, value: v, sort_order: i }); });
    });
    log.push(`상품 ${products.length}, 품목 ${items.length}, BOM ${bom_lines.length}, AVL ${avl.length}, NPI ${npi_status.length}, ECN ${ecn.length} 행 파싱 (사이즈 ${size.id})`);
    return { employees, vendors, items, products, bom_lines, avl, npi_status, ecn, ecn_products, code_values, log: [...new Set(log)] };
}

export interface ExportData extends Omit<ImportBundle, 'log'> { progress: Row[] }

const HEADERS: Record<string, [string, string][]> = { // 시트명 → [헤더, 컬럼]
    '상품마스터': [['상품코드', 'product_code'], ['상품명', 'name'], ['상품군', 'family'], ['상태', 'status'], ['출시목표일', 'launch_target_date'], ['PM(담당자ID)', 'pm_id'], ['커버 분리수', 'cover_split_count'], ['사이즈', 'size_preset_id'], ['비고', 'note']],
    '품목마스터': [['품번', 'item_no'], ['품명', 'name'], ['대분류', 'category'], ['중분류', 'subcategory'], ['품목구분', 'item_type'], ['규격/사양', 'spec'], ['단위', 'unit'], ['리비전', 'revision'], ['사양서/도면 링크', 'spec_url'], ['특징/메모', 'memo'], ['등록일', 'created_at']],
    'BOM': [['상품코드', 'product_code'], ['레벨', 'level'], ['상위품번', 'parent_item_no'], ['품번', 'item_no'], ['품명', 'item_name'], ['소요량', 'quantity'], ['단위', 'unit'], ['필수여부', 'required'], ['대체품번', 'alt_item_no'], ['비고', 'note'], ['규격', 'spec_text'], ['치수', 'dims'], ['출처', 'source']],
    '협력사마스터': [['협력사코드', 'vendor_code'], ['협력사명', 'name'], ['유형', 'vendor_type'], ['국가', 'country'], ['담당자명', 'contact_name'], ['연락처', 'phone'], ['이메일', 'email'], ['주요취급품목', 'main_items'], ['비고', 'note']],
    '담당자마스터': [['담당자ID', 'employee_id'], ['이름', 'name'], ['부서', 'department'], ['직책', 'title'], ['이메일', 'email'], ['연락처', 'phone'], ['권한', 'role'], ['비고', 'note']],
    'AVL': [['품번', 'item_no'], ['협력사코드', 'vendor_code'], ['사내담당자ID', 'owner_id'], ['승인상태', 'approval_status'], ['리드타임(일)', 'lead_time_days'], ['MOQ', 'moq'], ['단가', 'unit_price'], ['통화', 'currency'], ['승인일', 'approved_at'], ['단가방식', 'price_type'], ['상수', 'price_constant'], ['기본금', 'price_base'], ['단가구간', 'price_steps'], ['비고', 'note']],
    'NPI진행현황': [['상품코드', 'product_code'], ['품번', 'item_no'], ['담당자ID', 'owner_id'], ['개발단계', 'stage'], ['완료율', 'progress'], ['시작일', 'start_date'], ['목표일', 'target_date'], ['이슈상태', 'issue_status'], ['이슈내용', 'issue_detail'], ['다음 마일스톤', 'next_milestone'], ['최종업데이트', 'updated_at'], ['비고', 'note']],
    '상품별완성률': [['상품코드', 'product_code'], ['상품명', 'name'], ['상태', 'status'], ['등록 부품수', 'item_count'], ['전체 완성률', 'progress_total'], ['커버', 'progress_cover'], ['폼', 'progress_foam'], ['스트링', 'progress_string'], ['컨트롤러', 'progress_controller'], ['센서', 'progress_sensor'], ['포장', 'progress_packaging'], ['APP', 'progress_app'], ['기획', 'cnt_plan'], ['EVT', 'cnt_evt'], ['DVT', 'cnt_dvt'], ['PVT', 'cnt_pvt'], ['MP(양산)', 'cnt_mp'], ['진행중/지연 이슈', 'cnt_issue']],
    'ECN변경이력': [['ECN번호', 'ecn_no'], ['일자', 'ecn_date'], ['품번', 'item_no'], ['변경구분', 'change_type'], ['리비전(전→후)', 'rev'], ['변경 전', 'before_text'], ['변경 후', 'after_text'], ['사유', 'reason'], ['요청자ID', 'requester_id'], ['승인자ID', 'approver_id'], ['영향 상품', 'affected'], ['상태', 'status'], ['비고', 'note']],
    '코드표': [],
};

export async function buildExportWorkbook(data: ExportData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const itemName = new Map(data.items.map(i => [i.item_no as string, i]));
    const rowsOf: Record<string, Row[]> = {
        '상품마스터': data.products, '품목마스터': data.items,
        'BOM': data.bom_lines.map(l => ({
            ...l, item_name: itemName.get(l.item_no as string)?.name ?? '', unit: itemName.get(l.item_no as string)?.unit ?? '',
            dims: l.dims ? JSON.stringify(l.dims) : '',
        })),
        '협력사마스터': data.vendors, '담당자마스터': data.employees,
        'AVL': data.avl.map(a => ({ ...a, price_steps: a.price_steps ? JSON.stringify(a.price_steps) : '' })),
        'NPI진행현황': data.npi_status, '상품별완성률': data.progress,
        'ECN변경이력': data.ecn.map(e => ({ ...e, rev: `${e.rev_from ?? ''}→${e.rev_to ?? ''}`, affected: data.ecn_products.filter(p => p.ecn_no === e.ecn_no).map(p => p.product_code).join(', ') })),
    };
    for (const [sheet, cols] of Object.entries(HEADERS)) {
        const ws = wb.addWorksheet(sheet);
        if (sheet === '코드표') {
            const types = [...new Set(data.code_values.map(c => c.code_type))];
            ws.addRow(types);
            const max = Math.max(0, ...types.map(t => data.code_values.filter(c => c.code_type === t).length));
            for (let i = 0; i < max; i++) ws.addRow(types.map(t => data.code_values.filter(c => c.code_type === t)[i]?.value ?? ''));
            continue;
        }
        ws.addRow(cols.map(c => c[0]));
        for (const r of rowsOf[sheet] ?? []) ws.addRow(cols.map(c => r[c[1]] ?? ''));
        ws.getRow(1).font = { bold: true };
    }
    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
}
