import { describe, it, expect } from 'vitest';
import { pickColumns } from '../../../api/bom/_lib/master';

describe('pickColumns', () => {
    it('허용 컬럼만 남기고 undefined는 버린다', () => {
        expect(pickColumns({ name: 'a', evil: 1, note: undefined, spec: null }, ['name', 'note', 'spec']))
            .toEqual({ name: 'a', spec: null });
    });
});
