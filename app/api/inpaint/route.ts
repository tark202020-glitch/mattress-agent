import { NextResponse } from 'next/server';

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.NANO_BANANA_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

/**
 * POST /api/inpaint
 * Body:
 *   imageBase64  - 원본 이미지 base64 (jpeg/png, without data: prefix)
 *   imageMimeType - image/jpeg | image/png
 *   maskBase64   - 마스킹 이미지 base64 (흰색=인페인팅 대상, 검정=보존)
 *   prompt       - 채울 원단/재질 설명
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, imageMimeType = 'image/jpeg', maskBase64, prompt } = body;

        if (!imageBase64 || !prompt) {
            return NextResponse.json({ error: '이미지와 프롬프트가 필요합니다.' }, { status: 400 });
        }
        if (!GEMINI_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY 설정이 필요합니다.' }, { status: 401 });
        }

        // ── Gemini에게 인페인팅 수행 요청 ──
        // 모든 이미지를 parts로 전송하고, 마스킹 영역 설명을 prompt에 포함
        const systemInstruction = `You are a professional fabric and material texture artist. 
Your task is to seamlessly replace fabric/material on a mattress cover in the marked region.
The original image shows a mattress cover product. The user wants to change the material/texture in the highlighted/specified region.
Keep all other parts of the image exactly the same - only change the specified area.
Make the replacement look photorealistic, natural, and seamlessly blended with the rest of the image.
Maintain consistent lighting, shadows, and perspective from the original image.`;

        const userPrompt = maskBase64
            ? `In this mattress cover image, replace the fabric/texture in the white/bright masked region with: "${prompt}". 
Keep all other parts exactly the same. Make it look photorealistic and natural.`
            : `Edit this mattress cover image by replacing the fabric/texture with: "${prompt}". 
Make it look photorealistic and natural while maintaining the same form and structure.`;

        const parts: any[] = [
            { text: userPrompt },
            {
                inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                }
            }
        ];

        // 마스크 이미지가 있으면 함께 전송
        if (maskBase64) {
            parts.push({
                inlineData: {
                    mimeType: 'image/png',
                    data: maskBase64,
                }
            });
            parts.push({
                text: 'The second image above is the mask - white areas indicate where to apply the new texture.'
            });
        }

        const url = GEMINI_API_URL;

        const requestBody = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                role: 'user',
                parts,
            }],
            generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
            }
        };

        console.log(`[Inpaint] Gemini 인페인팅 요청: ${prompt}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Inpaint] Gemini Error:', errorText);

            // Gemini 이미지 편집이 지원되지 않는 경우, imagen 방식으로 대체
            let parsed: any = {};
            try { parsed = JSON.parse(errorText); } catch { }

            return NextResponse.json(
                { error: `Gemini API 오류 (${response.status})`, detail: parsed?.error?.message || errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // 이미지 추출
        let resultImageUrl: string | null = null;
        if (data?.candidates?.length > 0) {
            for (const candidate of data.candidates) {
                for (const part of candidate?.content?.parts || []) {
                    if (part?.inlineData?.data) {
                        const mime = part.inlineData.mimeType || 'image/png';
                        resultImageUrl = `data:${mime};base64,${part.inlineData.data}`;
                        break;
                    }
                }
                if (resultImageUrl) break;
            }
        }

        if (!resultImageUrl) {
            // 응답에서 텍스트 확인 (에러 메시지일 수 있음)
            const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.error('[Inpaint] 이미지 없음. 텍스트 응답:', textResponse);
            return NextResponse.json(
                { error: '인페인팅 결과 이미지를 받지 못했습니다.', detail: textResponse },
                { status: 500 }
            );
        }

        return NextResponse.json({ imageUrl: resultImageUrl });

    } catch (error: any) {
        console.error('[Inpaint] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
