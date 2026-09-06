import { describe, it, expect } from 'vitest';
import { pickColumns, sanitizeSearch } from '../../../api/bom/_lib/master';

describe('pickColumns', () => {
    it('허용 컬럼만 남기고 undefined는 버린다', () => {
        expect(pickColumns({ name: 'a', evil: 1, note: undefined, spec: null }, ['name', 'note', 'spec']))
            .toEqual({ name: 'a', spec: null });
    });
});

describe('sanitizeSearch', () => {
    it('쉼표·괄호를 제거하고 빈 값은 null', () => {
        expect(sanitizeSearch('a,b (c)')).toBe('a b c');
        expect(sanitizeSearch('  ,() ')).toBeNull();
        expect(sanitizeSearch(null)).toBeNull();
        expect(sanitizeSearch('힐링넘버')).toBe('힐링넘버');
    });
});
