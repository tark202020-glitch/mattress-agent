// 로그인 사용자 확인. 미로그인은 401.
import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function requireUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) } as const;
    }
    return { supabase, user } as const;
}

/** Supabase 오류를 JSON 응답으로 */
export function dbError(e: { message: string; code?: string }, status = 400) {
    return NextResponse.json({ error: e.message, code: e.code }, { status });
}
