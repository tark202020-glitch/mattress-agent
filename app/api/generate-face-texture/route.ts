import { NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.0-flash-001';
const GEMINI_KEY = process.env.NANO_BANANA_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e: any) {
      console.error('[FaceTexture] JSON parsing failed:', e.message);
      return NextResponse.json({ error: '요청 본문 크기가 너무 크거나 유효하지 않은 JSON입니다. (Base64 용량 한도 초과 등)' }, { status: 413 });
    }
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64가 필요합니다.' }, { status: 400 });
    }
    if (!GEMINI_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY 설정이 필요합니다.' }, { status: 401 });
    }

    const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    let mimeType = 'image/jpeg';
    if (imageBase64.includes('image/png')) mimeType = 'image/png';
    else if (imageBase64.includes('image/webp')) mimeType = 'image/webp';

    // Gemini Vision으로 매트리스 각 면의 꼭짓점 좌표 감지
    const prompt = `You are analyzing a mattress product photo. 
Identify the pixel coordinates of the corners for each visible surface of the mattress.

The image has some width and height in pixels. Return coordinates as percentage values (0-100) relative to the image dimensions.

Return a JSON object with EXACTLY this structure (no markdown, just raw JSON):
{
  "imageDescription": "brief description of what you see",
  "topSurface": {
    "visible": true,
    "corners": {
      "topLeft": { "x": 0, "y": 0 },
      "topRight": { "x": 0, "y": 0 },
      "bottomRight": { "x": 0, "y": 0 },
      "bottomLeft": { "x": 0, "y": 0 }
    }
  },
  "frontPanel": {
    "visible": true,
    "corners": {
      "topLeft": { "x": 0, "y": 0 },
      "topRight": { "x": 0, "y": 0 },
      "bottomRight": { "x": 0, "y": 0 },
      "bottomLeft": { "x": 0, "y": 0 }
    }
  },
  "sidePanel": {
    "visible": true,
    "corners": {
      "topLeft": { "x": 0, "y": 0 },
      "topRight": { "x": 0, "y": 0 },
      "bottomRight": { "x": 0, "y": 0 },
      "bottomLeft": { "x": 0, "y": 0 }
    }
  }
}

IMPORTANT:
- Coordinates are PERCENTAGES (0-100) of image width (x) and height (y)
- "topSurface" = the top quilted/fabric surface of the mattress (the sleeping surface viewed from above at an angle)
- "frontPanel" = the LONGER side panel facing the viewer (the long edge of the mattress)
- "sidePanel" = the SHORTER side panel visible (the short edge of the mattress)
- For each surface, list corners in clockwise order starting from topLeft
- If a surface is not visible in the photo, set "visible" to false
- Be very precise with the corner positions - trace exactly along the edges of each surface`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

    console.log(`[FaceTexture] Gemini Vision으로 매트리스 면 좌표 감지 중...`);

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[FaceTexture] Gemini 오류:', errText);
      return NextResponse.json({ error: 'Gemini 분석 실패', details: errText }, { status: response.status });
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    const jsonStr = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let faceCoords;
    try {
      faceCoords = JSON.parse(jsonStr);
    } catch {
      console.error('[FaceTexture] JSON 파싱 실패:', rawText);
      return NextResponse.json({
        error: 'Gemini 분석 결과 파싱 실패',
        rawAnalysis: rawText,
      }, { status: 500 });
    }

    console.log(`[FaceTexture] ✅ 면 좌표 감지 완료:`, JSON.stringify(faceCoords).substring(0, 300));

    return NextResponse.json({ faceCoords });

  } catch (error: any) {
    console.error('[FaceTexture] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
