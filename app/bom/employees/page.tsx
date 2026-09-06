'use client';
import MasterTable, { type FieldDef } from '../_components/MasterTable';
import { Badge } from '../_components/ui';
interface Employee { employee_id: string; name: string; department: string | null; title: string | null; email: string | null; phone: string | null; role: string; auth_user_id: string | null; [k: string]: unknown }
const FIELDS: FieldDef[] = [
    { key: 'employee_id', label: '담당자ID', required: true, placeholder: 'E-006' }, { key: 'name', label: '이름', required: true },
    { key: 'department', label: '부서' }, { key: 'title', label: '직책' }, { key: 'email', label: '이메일' }, { key: 'phone', label: '연락처' },
    { key: 'role', label: '역할', type: 'select', options: ['admin', 'pm', 'purchasing', 'engineer', 'quality', 'viewer'], required: true },
    { key: 'auth_user_id', label: '로그인 계정 UUID', placeholder: 'Supabase auth.users.id (3차 권한 강제용)' },
];
export default function EmployeesPage() {
    return <MasterTable<Employee> resource="employees" pk="employee_id" title="담당자마스터" desc="역할은 3차(ECN·권한)에서 강제됩니다. 지금은 표시용입니다." searchPlaceholder="ID·이름·부서 검색" fields={FIELDS} defaultDraft={{ role: 'viewer' }}
        columns={[{ key: 'employee_id', header: 'ID', width: 80 }, { key: 'name', header: '이름', width: 100 }, { key: 'department', header: '부서' }, { key: 'title', header: '직책', width: 80 }, { key: 'email', header: '이메일' }, { key: 'role', header: '역할', width: 100, render: r => <Badge tone="info">{r.role}</Badge> }, { key: 'auth_user_id', header: '계정 연결', width: 80, render: r => r.auth_user_id ? <Badge tone="ok">연결</Badge> : <Badge tone="muted">없음</Badge> }]} />;
}
