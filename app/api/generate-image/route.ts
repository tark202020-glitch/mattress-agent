import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // 60 seconds timeout
// App Router API does not support config.api.bodyParser

// ── NANO BANANA (Vertex AI 대체) 환경 설정 ──
// AI Studio의 Gemini 이미지 생성 모델(Nano Banana) 호출
const USE_NANO_BANANA = true;
const NANO_BANANA_MODEL = 'gemini-2.5-flash-image';
const NANO_BANANA_KEY = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY;
const NANO_BANANA_API_URL = process.env.NANO_BANANA_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${NANO_BANANA_KEY}`;

// ── 기존 Vertex AI 설정 (폴백용) ──
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'antigravity-mattress-agent';
const LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';
const MODEL_GENERATE = 'imagen-3.0-generate-002';        // 텍스트 전용 생성
const MODEL_CAPABILITY = 'imagen-3.0-capability-001';     // Subject Customization (참고 이미지 기반)

// 한글 포함 여부 감지
function containsKorean(text: string): boolean {
    return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/.test(text);
}

// Gemini Text 모델로 번역
async function translateWithGemini(text: string, apiKey: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: `Translate the following Korean text to English for an AI image generation prompt. Output ONLY the translated English text without any additional explanation or markdown formatting:\n\n${text}` }]
            }]
        }),
    });

    if (!response.ok) {
        console.error('[Translation] Gemini Error:', await response.text());
        throw new Error(`Gemini Translation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
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
            coverLabel,           // 프론트에서 넘겨준 커버 분류명
            imageSize,            // 요청 해상도 (예: 2048)
        } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const refCount = Array.isArray(referenceImages) ? referenceImages.length : 0;
        const useSubjectRef = refCount > 0;

        console.log(`[GenerateImage] 🍌 모드 체크: NANO BANANA = ${USE_NANO_BANANA}, RefImages = ${refCount}`);

        // Vertex AI / Google Cloud Token 초기화 (이제 번역 대신 폴백 모델 생성용으로만 남김)
        let token = '';
        try {
            const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
            const client = await auth.getClient();
            const accessToken = await client.getAccessToken();
            token = accessToken.token || '';
        } catch (authError) {
            console.warn('[GenerateImage] Google Auth 토큰 발급 실패 (NANO BANANA 전용 키 사용 시 무시 가능):', (authError as Error).message);
        }

        // 2. 한글 -> 영어 번역 (배경/씬 번역)
        let finalScene = prompt;
        let wasTranslated = false;
        if (containsKorean(prompt)) {
            console.log(`[GenerateImage] 🇰🇷 한글 감지, Gemini를 통한 번역 시도...`);
            if (NANO_BANANA_KEY) {
                try {
                    finalScene = await translateWithGemini(prompt, NANO_BANANA_KEY);
                    wasTranslated = true;
                    console.log(`[GenerateImage] Translated scene: ${finalScene}`);
                } catch (err: any) {
                    console.warn(`[GenerateImage] ⚠️ 번역 실패, 원본 사용`, err.message);
                }
            } else {
                console.warn(`[GenerateImage] ⚠️ NANO_BANANA_KEY(Gemini API Key)가 없어 번역 불가능, 원본 사용`);
            }
        }

        // 3. 템플릿 조립
        let finalPrompt = finalScene;
        if (useSubjectRef && !finalScene.includes('[1]')) {
            finalPrompt = `Create an image about ${subjectDescription || 'a premium mattress'} [1] to match the description: ${finalScene}`;
        } else if (!useSubjectRef && !finalScene.toLowerCase().includes('mattress')) {
            finalPrompt = `A premium ${coverLabel || 'mattress'} ${finalScene}`;
        }

        // ── NANO BANANA (AI Studio 계열 - Gemini 호환 파이프라인) 호출 로직 ──
        if (USE_NANO_BANANA) {
            if (!NANO_BANANA_KEY) {
                return NextResponse.json({ error: 'NANO_BANANA_API_KEY (또는 GEMINI_API_KEY) 설정이 필요합니다.' }, { status: 401 });
            }

            console.log(`[GenerateImage] 🍌 NANO BANANA 모델 호출 시도... (${NANO_BANANA_MODEL})`);

            // Gemini 기반 멀티모달 프롬프트 조립
            const parts: any[] = [];

            // 텍스트 프롬프트
            const maxImages = 1; // 3앵글 동시 요청이므로 1장씩만 생성
            let instructions = useSubjectRef
                ? `You are an expert AI image generator. IMPORTANT: You MUST strictly maintain the visual style, shape, texture, and core product design shown in the provided reference images. The generated mattress must look like the same model as the reference. Please generate exactly ${maxImages} distinct images showing different angles/arrangements of this exact mattress. ${finalPrompt}`
                : `You are an expert AI image generator. Please generate exactly ${maxImages} distinct images based on this description. ${finalPrompt}`;

            instructions += `\nThe requested aspect ratio is ${aspectRatio}.`;
            if (imageSize) {
                instructions += `\nGenerate the image at ${imageSize}x${imageSize} pixel resolution for high quality output.`;
            }
            parts.push({ text: instructions });

            // 참조 이미지
            if (useSubjectRef) {
                for (let i = 0; i < Math.min(refCount, 2); i++) {
                    parts.push({
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: referenceImages[i].replace(/^data:image\/\w+;base64,/, ''),
                        }
                    });
                }
            }

            const requestBody = {
                contents: [{
                    role: 'user',
                    parts: parts
                }],
                generationConfig: {
                    responseModalities: ["Text", "Image"]
                }
            };

            const response = await fetch(NANO_BANANA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[GenerateImage] 🍌 NANO BANANA Error:', errorText);
                return NextResponse.json({ error: `NANO BANANA API Error: ${response.status}`, details: errorText }, { status: response.status });
            }

            const data = await response.json();

            let generatedImages: { imageUrl: string, base64: string }[] = [];

            if (data && data.candidates && data.candidates.length > 0) {
                for (const candidate of data.candidates) {
                    const partsList = candidate.content?.parts || [];
                    for (const p of partsList) {
                        if (p.inlineData && p.inlineData.data) {
                            generatedImages.push({
                                imageUrl: `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`,
                                base64: p.inlineData.data
                            });
                        }
                    }
                }
            }

            if (generatedImages.length === 0) {
                console.warn('[GenerateImage] 🍌 NANO BANANA 생성 이미지가 없어 폴백 처리 진행. Response:', JSON.stringify(data).substring(0, 500));
                return NextResponse.json({ error: 'NANO BANANA 결과물에서 이미지를 찾을 수 없습니다. (텍스트만 뱉음)' }, { status: 500 });
            }

            console.log(`[GenerateImage] 🍌 성공, NANO BANANA 이미지 생성 (총 ${generatedImages.length}장)`);
            return NextResponse.json({
                images: generatedImages,
                translatedPrompt: wasTranslated ? finalPrompt : null,
                wasTranslated,
                model: 'NANO BANANA',
                refImageCount: refCount,
            });
        }

        // =========================================================================
        // 🚀 Vertex AI (기존 Imagen) 폴백 호출 로직
        // =========================================================================
        const modelId = useSubjectRef ? MODEL_CAPABILITY : MODEL_GENERATE;
        const vertexUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${modelId}:predict`;

        console.log(`[GenerateImage] 🔧 Fallback Model: ${modelId}, Prompt: ${finalPrompt.substring(0, 150)}...`);

        let vertexRequestBody: any;
        if (useSubjectRef) {
            const maxImages = 1;
            const refImageObjects = referenceImages.slice(0, maxImages).map((base64: string) => ({
                referenceType: 'REFERENCE_TYPE_SUBJECT',
                referenceId: 1,
                referenceImage: { bytesBase64Encoded: base64 },
                subjectImageConfig: { subjectType: 'SUBJECT_TYPE_PRODUCT', subjectDescription: subjectDescription || 'a premium mattress' },
            }));
            vertexRequestBody = {
                instances: [{ prompt: finalPrompt, referenceImages: refImageObjects }],
                parameters: { sampleCount: 1, aspectRatio: aspectRatio },
            };
        } else {
            vertexRequestBody = {
                instances: [{ prompt: finalPrompt }],
                parameters: { sampleCount: 1, aspectRatio: aspectRatio, enhancePrompt, personGeneration: 'allow_adult' },
            };
        }

        const vertexResponse = await fetch(vertexUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(vertexRequestBody),
        });

        if (!vertexResponse.ok) {
            const errorText = await vertexResponse.text();
            console.error('[GenerateImage] ❌ Vertex AI Error:', errorText);
            return NextResponse.json({ error: `Vertex AI API Error: ${vertexResponse.statusText}`, details: errorText }, { status: vertexResponse.status });
        }

        const vertexData = await vertexResponse.json();
        const predictions = vertexData.predictions;
        if (!predictions || predictions.length === 0) {
            return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        const images = predictions.map((p: any) => ({
            imageUrl: `data:${p.mimeType || 'image/png'};base64,${p.bytesBase64Encoded}`,
            base64: p.bytesBase64Encoded,
        }));

        return NextResponse.json({ images, translatedPrompt: wasTranslated ? finalPrompt : null, wasTranslated, model: modelId, refImageCount: refCount });

    } catch (error: any) {
        console.error('[GenerateImage] ❌ Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
