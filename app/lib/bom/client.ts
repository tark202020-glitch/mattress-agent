// ============================================================
// /api/bom/* 호출 래퍼. 화면은 Supabase를 직접 부르지 않고 이 함수만 쓴다.
// ============================================================
export class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) {
        super(message);
        this.name = 'ApiError';
    }
}

type Init = RequestInit & { json?: unknown };

async function toError(res: Response): Promise<ApiError> {
    const text = await res.text();
    try {
        const j = JSON.parse(text) as { error?: string; code?: string };
        return new ApiError(res.status, j.error ?? text, j.code);
    } catch {
        return new ApiError(res.status, text || `HTTP ${res.status}`);
    }
}

export async function bomApi<T>(path: string, init: Init = {}): Promise<T> {
    const { json, headers, ...rest } = init;
    const res = await fetch(`/api/bom${path}`, {
        ...rest,
        headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(headers as Record<string, string> | undefined) },
        body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    if (!res.ok) throw await toError(res);
    return (await res.json()) as T;
}

/** 파일 다운로드용 (export 등) */
export async function bomApiBlob(path: string, init: RequestInit = {}): Promise<Blob> {
    const res = await fetch(`/api/bom${path}`, init);
    if (!res.ok) throw await toError(res);
    return res.blob();
}

/** Blob을 브라우저 다운로드로 저장 */
export function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
