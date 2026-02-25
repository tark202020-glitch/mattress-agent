import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'nano-banana-442807';
const LOCATION = process.env.GOOGLE_LOCATION || 'us-central1';
const GEMINI_MODEL = 'gemini-2.0-flash-001'; // or gemini-2.5-flash

export const maxDuration = 60;
// Node.js limits apply, but App Router does not support exporting a config object


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64 } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: 'imageBase64가 필요합니다.' }, { status: 400 });
        }

        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        const token = accessToken.token;

        if (!token) {
            throw new Error('Failed to get access token');
        }

        let imageData = imageBase64;
        let mimeType = 'image/jpeg';

        // data:image/... 접두사 제거
        const match = imageBase64.match(/^data:(image\/[^;]+);base64,/);
        if (match) {
            mimeType = match[1];
            imageData = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
        }

        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

        const prompt = `Describe the visual appearance, texture, color, and design of this mattress or mattress cover in one short English sentence (under 15 words) suitable for an AI image generation prompt. For example: "a white and light grey antimicrobial mattress cover with smooth surface and brand label" or "a premium mattress cover with fine knit texture". Only reply with the description itself, nothing else. Do not use quotes.`;

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
                temperature: 0.2,
                maxOutputTokens: 60,
            },
        };

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
            console.error('[AnalyzeImagePrompt] ❌ Gemini Error:', errorText);
            return NextResponse.json({ error: `Gemini API Error: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        let description = 'a premium mattress cover';

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content.parts.length > 0) {
            description = data.candidates[0].content.parts[0].text.trim().replace(/^["']|["']$/g, '');
        }

        return NextResponse.json({ description });

    } catch (error: any) {
        console.error('[AnalyzeImagePrompt] ❌ Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
