import { describe, it, expect, vi, afterEach } from 'vitest';
import { bomApi, ApiError } from '../client';

const okJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('bomApi', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('경로 접두어와 JSON 본문을 붙이고 응답을 파싱한다', async () => {
        const fetchMock = vi.fn().mockResolvedValue(okJson({ ok: 1 }));
        vi.stubGlobal('fetch', fetchMock);
        const r = await bomApi<{ ok: number }>('/items', { method: 'POST', json: { a: 1 } });
        expect(r).toEqual({ ok: 1 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/bom/items');
        expect(init.method).toBe('POST');
        expect(init.body).toBe('{"a":1}');
        expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
    it('오류 응답은 ApiError(status, message, code)로 던진다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ error: '로그인이 필요합니다.', code: 'X' }, 401)));
        await expect(bomApi('/items')).rejects.toMatchObject({ status: 401, message: '로그인이 필요합니다.', code: 'X' } satisfies Partial<ApiError>);
    });
    it('JSON이 아닌 오류 본문도 메시지로 감싼다', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Internal', { status: 500 })));
        await expect(bomApi('/items')).rejects.toMatchObject({ status: 500, message: 'Internal' });
    });
});
