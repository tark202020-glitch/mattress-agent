import { NextResponse } from 'next/server';

const NANO_BANANA_MODEL = 'gemini-2.5-flash-image';
const NANO_BANANA_KEY = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY;
const NANO_BANANA_API_URL = process.env.NANO_BANANA_API_URL || `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${NANO_BANANA_KEY}`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        if (!NANO_BANANA_KEY) {
            return NextResponse.json({ error: 'API Key 설정이 필요합니다.' }, { status: 401 });
        }

        console.log(`[GenerateTexture] 텍스처 생성 요청: ${prompt}`);

        // Seamless texture 생성을 위한 프롬프트 강화
        const instructions = `You are an expert material texture generator. Generate a seamless, flat, high-quality, evenly lit 2D texture based on this description: ${prompt}. The image should be perfectly tileable, and look like a raw material swatch with no lighting perspective, no shadows, no 3D objects, just a completely flat top-down texture fill.`;

        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{ text: instructions }]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                // sampleCount: 4 - 만약 여러장 필요시 적용
            }
        };

        const response = await fetch(NANO_BANANA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GenerateTexture] Error:', errorText);
            return NextResponse.json({ error: `API Error: ${response.status}`, details: errorText }, { status: response.status });
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
            return NextResponse.json({ error: '이미지가 정상적으로 반환되지 않았습니다.' }, { status: 500 });
        }

        return NextResponse.json({ images: generatedImages });

    } catch (error: any) {
        console.error('[GenerateTexture] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
