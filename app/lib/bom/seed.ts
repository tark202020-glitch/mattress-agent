// ============================================================
// 시드 데이터: 코드표 · 협력사 · 담당자 · 품목 · V-000 AVL
// constants.ts를 유일한 원천으로 삼아 SQL을 생성한다.
// ============================================================
import {
    TOP_FOAM_OPTIONS, CORE_OPTIONS, COVER_OPTIONS,
    CONTROLLER_OPTIONS, SENSOR_OPTIONS, PACKAGING_OPTIONS,
} from '../constants';
import { ASSEMBLY, AUTO_PARTS, HARDNESS, GUARD_THICKNESS, BOTTOM_THICKNESS, guardKey, bottomKey, itemNoForOption, PREFIX_CATEGORY, prefixOf } from './codes';
import { legacyAvlRows } from './legacyPricing';

export interface SeedItem {
    item_no: string; name: string; category: string; subcategory: string | null; item_type: string;
    spec: string | null; unit: string; revision: string; memo: string | null;
    wizard_option_key: string | null; attributes: Record<string, unknown> | null;
}

const item = (item_no: string, name: string, p: Partial<SeedItem> = {}): SeedItem => ({
    item_no, name, category: PREFIX_CATEGORY[prefixOf(item_no)], subcategory: null, item_type: '부품',
    spec: null, unit: 'EA', revision: 'A', memo: null, wizard_option_key: null, attributes: null, ...p,
});

export function seedItems(): SeedItem[] {
    const out: SeedItem[] = [];
    // 어셈블리
    const asmName: Record<string, string> = { CV: '커버 어셈블리', FM: '폼 어셈블리', ST: '스트링 어셈블리', CT: '컨트롤러 어셈블리', SN: '센서 어셈블리', PK: '완제품 포장 어셈블리', SW: 'APP/서버 세트' };
    for (const [pfx, no] of Object.entries(ASSEMBLY)) out.push(item(no, asmName[pfx], { item_type: '어셈블리', subcategory: '어셈블리', unit: 'SET' }));
    // 폼
    for (const o of TOP_FOAM_OPTIONS) out.push(item(itemNoForOption(o.id)!, `상단폼 ${o.label}`, { subcategory: '상단폼', spec: o.description, wizard_option_key: o.id, attributes: { thickness: o.thickness, layers: o.layers } }));
    for (const t of GUARD_THICKNESS) for (const h of HARDNESS) out.push(item(itemNoForOption(guardKey(t, h))!, `가드폼 ${t}mm ${h}`, { subcategory: '가드폼', wizard_option_key: guardKey(t, h), attributes: { thickness: t, hardness: h } }));
    for (const t of BOTTOM_THICKNESS) for (const h of HARDNESS) out.push(item(itemNoForOption(bottomKey(t, h))!, `하단폼 ${t}mm ${h}`, { subcategory: '하단폼', wizard_option_key: bottomKey(t, h), attributes: { thickness: t, hardness: h } }));
    // 스트링
    for (const o of CORE_OPTIONS) out.push(item(itemNoForOption(o.id)!, `${o.label} 에어셀`, { subcategory: '에어셀', spec: o.description, wizard_option_key: o.id, attributes: { material: o.material, height: o.height } }));
    // 커버 스타일 + 단가표에만 있는 올케어 + 라벨
    for (const o of COVER_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '커버', spec: o.description, wizard_option_key: o.id, attributes: { grade: o.grade, coverTopThickness: o.coverTopThickness } }));
    out.push(item(itemNoForOption('ALL_CARE')!, '올케어 스타일', { subcategory: '커버', wizard_option_key: 'ALL_CARE', attributes: { grade: '중' } }));
    out.push(item(AUTO_PARTS.LABEL_LAW, '로우라벨 (법정표시)', { subcategory: '라벨', memo: 'KC/세탁표시 등' }));
    out.push(item(AUTO_PARTS.LABEL_LOGO, '로고라벨', { subcategory: '라벨' }));
    // 컨트롤러 본체 + 부속품
    for (const o of CONTROLLER_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '본체', spec: o.description, wizard_option_key: o.id }));
    out.push(item(AUTO_PARTS.ADAPTER, '어댑터', { subcategory: '전원', memo: '인증(KC) 여부 확인' }));
    out.push(item(AUTO_PARTS.AIR_HOSE, '에어호스', { subcategory: '배관' }));
    out.push(item(AUTO_PARTS.MANUAL, '매뉴얼', { subcategory: '문서', item_type: '문서' }));
    out.push(item(AUTO_PARTS.IOT_STICK, 'IoT Stick', { subcategory: '통신', memo: 'FW 버전은 ECN으로 추적' }));
    out.push(item(AUTO_PARTS.CTRL_BOX, '컨트롤러 포장박스', { subcategory: '포장재', item_type: '포장재' }));
    // 센서
    for (const o of SENSOR_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '센서', spec: o.description, wizard_option_key: o.id }));
    // 포장
    for (const o of PACKAGING_OPTIONS) out.push(item(itemNoForOption(o.id)!, o.label, { subcategory: '포장사양', item_type: '포장사양', unit: '-', spec: o.description, wizard_option_key: o.id }));
    out.push(item(AUTO_PARTS.PKG_BOX, '완제품 포장박스', { subcategory: '박스', item_type: '포장재' }));
    out.push(item(AUTO_PARTS.PKG_VINYL, '포장비닐', { subcategory: '비닐', item_type: '포장재' }));
    // APP/서버
    const sw = (no: string, name: string, sub: string, memo: string | null = null) => item(no, name, { subcategory: sub, item_type: '소프트웨어', unit: '-', revision: '1.0.0', memo });
    out.push(sw(AUTO_PARTS.SW_ANDROID, 'Android 앱', '모바일앱'));
    out.push(sw(AUTO_PARTS.SW_IOS, 'iOS 앱', '모바일앱'));
    out.push(sw(AUTO_PARTS.SW_SERVER_KR, '서버 - KR 리전', '서버'));
    out.push(sw('SW-004', '서버 - US 리전', '서버', '해외 출시 시 사용'));
    return out;
}

export const CODE_VALUES: Record<string, string[]> = {
    category: ['커버', '폼', '스트링', '컨트롤러', '센서', '포장', 'APP'],
    item_type: ['어셈블리', '부품', '포장재', '포장사양', '문서', '소프트웨어'],
    dev_stage: ['기획', 'EVT', 'DVT', 'PVT', 'MP(양산)', '단종'],
    approval_status: ['후보', '샘플평가', '승인', '보류', '탈락'],
    product_status: ['기획', '개발', '양산', '단종'],
    issue_status: ['없음', '진행중', '지연', '해결'],
    vendor_type: ['제조', 'OEM/ODM', '소프트웨어', '인쇄', '물류', '기타'],
    change_type: ['사양변경', '제조사변경', '도면변경', 'SW버전', '포장변경', '기타'],
    required: ['필수', '옵션'],
    app_role: ['admin', 'pm', 'purchasing', 'engineer', 'quality', 'viewer'],
};

const VENDORS: [string, string, string, string, string][] = [
    ['V-000', '기준단가(협력사 미지정)', '기타', 'KR', '현행 단가표 이관용. 실제 협력사 승인 시 대체됨'],
    ['V-001', 'OO텍스타일', '제조', 'KR', '예시 데이터'],
    ['V-002', 'OO폼', '제조', 'KR', '예시 데이터'],
    ['V-003', 'OO전자', 'OEM/ODM', 'CN', '예시 데이터'],
    ['V-004', 'OO패키지', '인쇄', 'KR', '예시 데이터'],
    ['V-005', '(자체개발)', '소프트웨어', 'KR', '예시 데이터'],
];

const EMPLOYEES: [string, string, string, string, string][] = [
    ['E-001', '김OO', '상품기획', 'PM', 'pm'],
    ['E-002', '이OO', '커버개발', '과장', 'engineer'],
    ['E-003', '박OO', 'H/W개발', '차장', 'engineer'],
    ['E-004', '최OO', 'S/W개발', '팀장', 'engineer'],
    ['E-005', '정OO', '구매/포장', '대리', 'purchasing'],
];

/** SQL 문자열 리터럴 (null 허용) */
const q = (v: unknown): string =>
    v === null || v === undefined ? 'null' :
    typeof v === 'number' ? String(v) :
    typeof v === 'boolean' ? (v ? 'true' : 'false') :
    typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb` :
    `'${String(v).replace(/'/g, "''")}'`;

export function buildSeedSql(): string {
    const L: string[] = ['-- 생성물: npm run seed:gen (app/lib/bom/seed.ts). 직접 편집하지 말 것.', ''];

    L.push('insert into code_values (code_type, value, sort_order) values');
    L.push(Object.entries(CODE_VALUES).flatMap(([t, vs]) => vs.map((v, i) => `  (${q(t)}, ${q(v)}, ${i})`)).join(',\n'));
    L.push('on conflict (code_type, value) do update set sort_order = excluded.sort_order;', '');

    L.push('insert into vendors (vendor_code, name, vendor_type, country, note) values');
    L.push(VENDORS.map(v => `  (${v.map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (vendor_code) do update set name = excluded.name, vendor_type = excluded.vendor_type;', '');

    L.push('insert into employees (employee_id, name, department, title, role) values');
    L.push(EMPLOYEES.map(e => `  (${e.map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (employee_id) do update set name = excluded.name, department = excluded.department, title = excluded.title;', '');

    L.push('insert into items (item_no, name, category, subcategory, item_type, spec, unit, revision, memo, wizard_option_key, attributes) values');
    L.push(seedItems().map(i => `  (${[i.item_no, i.name, i.category, i.subcategory, i.item_type, i.spec, i.unit, i.revision, i.memo, i.wizard_option_key, i.attributes].map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (item_no) do update set name = excluded.name, subcategory = excluded.subcategory, item_type = excluded.item_type, spec = excluded.spec, unit = excluded.unit, wizard_option_key = excluded.wizard_option_key, attributes = excluded.attributes;', '');

    L.push('insert into avl (item_no, vendor_code, approval_status, approved_at, price_type, unit_price, price_constant, price_base, price_steps, currency, note) values');
    L.push(legacyAvlRows().map(r => `  (${[r.item_no, r.vendor_code, r.approval_status, r.approved_at, r.price_type, r.unit_price, r.price_constant, r.price_base, r.price_steps, 'KRW', '현행 단가표 이관'].map(q).join(', ')})`).join(',\n'));
    L.push('on conflict (item_no, vendor_code) do update set price_type = excluded.price_type, unit_price = excluded.unit_price, price_constant = excluded.price_constant, price_base = excluded.price_base, price_steps = excluded.price_steps;', '');

    return L.join('\n');
}
