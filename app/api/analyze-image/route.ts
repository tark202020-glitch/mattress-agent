import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'antigravity-mattress-agent';
const LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';
const GEMINI_MODEL = 'gemini-2.0-flash-001';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, imageUrl } = body;

        if (!imageBase64 && !imageUrl) {
            return NextResponse.json({ error: 'imageBase64 또는 imageUrl이 필요합니다.' }, { status: 400 });
        }

        // 1. 인증 토큰 획득
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const token = accessToken.token;

        if (!token) {
            throw new Error('Failed to get access token');
        }

        // 2. 이미지 데이터 준비
        let imageData: string;
        let mimeType = 'image/jpeg';

        if (imageBase64) {
            // data:image/... 접두사 제거
            imageData = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
            if (imageBase64.includes('image/png')) mimeType = 'image/png';
            else if (imageBase64.includes('image/webp')) mimeType = 'image/webp';
        } else {
            // URL에서 이미지 다운로드 후 base64 변환
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
            const buffer = await imgRes.arrayBuffer();
            imageData = Buffer.from(buffer).toString('base64');
            const contentType = imgRes.headers.get('content-type');
            if (contentType) mimeType = contentType;
        }

        // 3. Gemini API 호출
        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

        const prompt = `이 매트리스 커버 이미지를 분석하여 디자인 키워드를 추출해주세요.

다음 항목들을 파악해주세요:
- 소재감 (예: 니트, 트위드, 퀼팅, 메쉬 등)
- 색감/톤 (예: 네이비, 아이보리, 차콜 등)
- 패턴/텍스처 (예: 다이아몬드 패턴, 그리드, 무지 등)
- 전체 무드/스타일 (예: 프리미엄, 모던, 클래식, 미니멀 등)

결과를 한 줄로 " / "로 구분하여 한글 키워드만 출력해주세요.
예시: "프리미엄 니트 텍스처 / 네이비 톤 / 다이아몬드 퀼팅 패턴 / 고급 모던 스타일"`;

        const requestBody = {
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType,
                            data: imageData,
                        },
                    },
                    { text: prompt },
                ],
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 256,
            },
        };

        console.log(`[AnalyzeImage] 🔍 Gemini 이미지 분석 API 호출...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AnalyzeImage] ❌ Gemini Error:', errorText);
            return NextResponse.json({ error: `Gemini API Error: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const keywords = result.trim().replace(/^["']|["']$/g, '');

        console.log(`[AnalyzeImage] ✅ 분석 결과: ${keywords}`);

        return NextResponse.json({ keywords });

    } catch (error: any) {
        console.error('[AnalyzeImage] ❌ Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
