import type { MasterConfig } from './master';

export const ITEM_NO_RE = /^(CV|FM|ST|CT|SN|PK|SW)-\d{3}$/;

export const ITEMS: MasterConfig = {
    table: 'items', pk: 'item_no',
    columns: ['item_no', 'name', 'category', 'subcategory', 'item_type', 'spec', 'unit', 'revision', 'spec_url', 'memo', 'wizard_option_key', 'attributes'],
    searchColumns: ['item_no', 'name'],
    validate: (row, isCreate) => {
        if (isCreate && !ITEM_NO_RE.test(String(row.item_no))) return '품번 형식 오류 (예: CV-001)';
        if (isCreate && !row.name) return '품명은 필수입니다.';
        return null;
    },
};

export const VENDORS: MasterConfig = {
    table: 'vendors', pk: 'vendor_code',
    columns: ['vendor_code', 'name', 'vendor_type', 'country', 'contact_name', 'phone', 'email', 'main_items', 'note'],
    searchColumns: ['vendor_code', 'name', 'main_items'],
    validate: (row, isCreate) => (isCreate && !row.name ? '협력사명은 필수입니다.' : null),
};

export const EMPLOYEES: MasterConfig = {
    table: 'employees', pk: 'employee_id',
    columns: ['employee_id', 'name', 'department', 'title', 'email', 'phone', 'role', 'auth_user_id', 'note'],
    searchColumns: ['employee_id', 'name', 'department'],
    validate: (row) => {
        const roles = ['admin', 'pm', 'purchasing', 'engineer', 'quality', 'viewer'];
        if (row.role !== undefined && !roles.includes(String(row.role))) return `role은 ${roles.join('/')} 중 하나여야 합니다.`;
        return null;
    },
};
