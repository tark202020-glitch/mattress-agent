'use client';
import MasterTable, { type FieldDef } from '../_components/MasterTable';
interface Vendor { vendor_code: string; name: string; vendor_type: string | null; country: string | null; contact_name: string | null; phone: string | null; email: string | null; main_items: string | null; [k: string]: unknown }
const FIELDS: FieldDef[] = [
    { key: 'vendor_code', label: '협력사코드', required: true, placeholder: 'V-006' }, { key: 'name', label: '협력사명', required: true },
    { key: 'vendor_type', label: '유형', type: 'select', options: { codeType: 'vendor_type' } }, { key: 'country', label: '국가', placeholder: 'KR' },
    { key: 'contact_name', label: '담당자명' }, { key: 'phone', label: '연락처' }, { key: 'email', label: '이메일' }, { key: 'main_items', label: '주요취급품목' }, { key: 'note', label: '비고', type: 'textarea' },
];
export default function VendorsPage() {
    return <MasterTable<Vendor> resource="vendors" pk="vendor_code" title="협력사마스터" desc="V-000은 현행 단가표를 옮긴 기준단가용 가상 협력사입니다." searchPlaceholder="코드·이름·품목 검색" fields={FIELDS}
        columns={[{ key: 'vendor_code', header: '코드', width: 90 }, { key: 'name', header: '협력사명' }, { key: 'vendor_type', header: '유형', width: 100 }, { key: 'country', header: '국가', width: 60 }, { key: 'contact_name', header: '담당자', width: 90 }, { key: 'phone', header: '연락처', width: 130 }, { key: 'main_items', header: '주요취급품목' }]} />;
}
