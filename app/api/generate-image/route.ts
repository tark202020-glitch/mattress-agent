import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

// Vertex AI 설정
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'antigravity-mattress-agent';
const LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';

// 모델 ID
const MODEL_GENERATE = 'imagen-3.0-generate-002';        // 텍스트 전용 생성
const MODEL_CAPABILITY = 'imagen-3.0-capability-001';     // Subject Customization (참고 이미지 기반)

// 한글 포함 여부 감지
function containsKorean(text: string): boolean {
    return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/.test(text);
}

// Google Cloud Translation API로 번역
async function translateToEnglish(text: string, token: string): Promise<string> {
    const url = `https://translation.googleapis.com/language/translate/v2`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            q: text,
            source: 'ko',
            target: 'en',
            format: 'text',
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Translation] Error:', errorText);
        throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            prompt,
            aspectRatio = '4:3',
            enhancePrompt = false,
            referenceImages,      // Base64 string[] — 복수 참고 이미지
            subjectDescription,   // Subject description
        } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // ── 디버깅 ──
        const refCount = Array.isArray(referenceImages) ? referenceImages.length : 0;
        const useSubjectRef = refCount > 0;

        if (useSubjectRef) {
            const totalKB = referenceImages.reduce((sum: number, img: string) => sum + img.length, 0) / 1024;
            console.log(`[GenerateImage] 📷 Subject Reference 모드 — ${refCount}장, 총 ${Math.round(totalKB)}KB`);
            console.log(`[GenerateImage] 📷 subjectDescription: ${subjectDescription}`);
        } else {
            console.log(`[GenerateImage] 📝 텍스트 전용 모드`);
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

        // 2. 한글 감지 → 영어 번역
        let finalPrompt = prompt;
        let wasTranslated = false;

        if (containsKorean(prompt)) {
            console.log(`[GenerateImage] 🇰🇷 한글 감지, 번역 시도...`);
            try {
                finalPrompt = await translateToEnglish(prompt, token);
                wasTranslated = true;
                console.log(`[GenerateImage] Translated: ${finalPrompt}`);
            } catch (translationError: any) {
                console.warn(`[GenerateImage] ⚠️ 번역 실패, 원본 사용: ${translationError.message}`);
                finalPrompt = prompt;
            }
        }

        // 3. 모델 분기
        const modelId = useSubjectRef ? MODEL_CAPABILITY : MODEL_GENERATE;
        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:predict`;

        console.log(`[GenerateImage] 🔧 Model: ${modelId}, Prompt: ${finalPrompt.substring(0, 150)}...`);

        // 4. Request body 구성
        let requestBody: any;

        if (useSubjectRef) {
            // ═══════════════════════════════════════════════════════════
            // Subject Customization — 복수 참고 이미지 지원 (최대 4장)
            // 같은 referenceId=1 로 묶으면 AI가 같은 subject로 인식
            // ═══════════════════════════════════════════════════════════
            // 비정사각형 비율(4:3 등)에서는 참고 이미지 최대 2장만 허용
            const maxImages = aspectRatio === '1:1' ? 4 : 2;
            const refImageObjects = referenceImages.slice(0, maxImages).map((base64: string) => ({
                referenceType: 'REFERENCE_TYPE_SUBJECT',
                referenceId: 1,
                referenceImage: {
                    bytesBase64Encoded: base64,
                },
                subjectImageConfig: {
                    subjectType: 'SUBJECT_TYPE_PRODUCT',
                    subjectDescription: subjectDescription || 'a premium mattress',
                },
            }));

            requestBody = {
                instances: [
                    {
                        prompt: finalPrompt,
                        referenceImages: refImageObjects,
                    },
                ],
                parameters: {
                    sampleCount: 4, // Changed from 1 to 4
                    aspectRatio: aspectRatio,
                },
            };

            console.log(`[GenerateImage] 📤 Subject Reference: ${refImageObjects.length}장 전송`);
        } else {
            // ═══════════════════════════════════════════════════════════
            // 텍스트 전용 생성 모드
            // ═══════════════════════════════════════════════════════════
            requestBody = {
                instances: [
                    {
                        prompt: finalPrompt,
                    },
                ],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: aspectRatio,
                    enhancePrompt: enhancePrompt,
                    personGeneration: 'allow_adult',
                },
            };
        }

        // 5. Vertex AI API 호출
        console.log(`[GenerateImage] 🚀 API 호출...`);
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
            console.error('[GenerateImage] ❌ Vertex AI Error:', errorText);

            let errorMessage = `Vertex AI API Error: ${response.statusText}`;
            if (response.status === 403) {
                errorMessage = `Google Cloud 권한 오류 (403): 프로젝트(${PROJECT_ID})에서 Vertex AI API를 확인해주세요.`;
            } else if (response.status === 400) {
                errorMessage = `요청 오류 (400): ${errorText}`;
            } else if (response.status === 429) {
                errorMessage = `요청 한도 초과 (429): 잠시 후 다시 시도해주세요.`;
            }

            return NextResponse.json({ error: errorMessage, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        console.log(`[GenerateImage] ✅ 성공, predictions: ${data.predictions?.length}`);

        // 6. 응답 파싱
        const predictions = data.predictions;
        if (!predictions || predictions.length === 0) {
            return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        // 모든 생성 이미지를 배열로 반환
        const images = predictions.map((p: any) => ({
            imageUrl: `data:${p.mimeType || 'image/png'};base64,${p.bytesBase64Encoded}`,
            base64: p.bytesBase64Encoded,
        }));

        return NextResponse.json({
            images,
            translatedPrompt: wasTranslated ? finalPrompt : null,
            wasTranslated,
            model: modelId,
            refImageCount: refCount,
        });

    } catch (error: any) {
        console.error('[GenerateImage] ❌ Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
