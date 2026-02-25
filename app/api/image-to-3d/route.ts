import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        // Content-Length 체크
        const contentLength = request.headers.get('content-length');
        console.log(`[SF3D] 요청 수신 (Content-Length: ${contentLength})`);

        const formData = await request.formData();
        const imageFile = formData.get('image') as File | null;

        if (!imageFile) {
            return NextResponse.json(
                { error: '이미지 파일이 필요합니다.' },
                { status: 400 }
            );
        }

        const apiKey = process.env.STABILITY_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'STABILITY_API_KEY가 설정되지 않았습니다.' },
                { status: 500 }
            );
        }

        // 이미지를 ArrayBuffer로 변환
        const imageBuffer = await imageFile.arrayBuffer();
        console.log(`[SF3D] 이미지: ${imageFile.name}, ${(imageBuffer.byteLength / 1024 / 1024).toFixed(2)} MB, type: ${imageFile.type}`);

        const imageBlob = new Blob([imageBuffer], { type: imageFile.type || 'image/jpeg' });

        // Stability AI SF3D API용 FormData 재구성
        const stabilityFormData = new FormData();
        stabilityFormData.append('image', imageBlob, imageFile.name || 'input.jpg');
        stabilityFormData.append('texture_resolution', '2048');
        stabilityFormData.append('foreground_ratio', '0.85');
        stabilityFormData.append('remesh', 'none');

        console.log('[SF3D] Stability AI API 호출 시작...');

        const response = await fetch(
            'https://api.stability.ai/v2beta/3d/stable-fast-3d',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: stabilityFormData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SF3D] API 오류:', response.status, errorText);
            return NextResponse.json(
                {
                    error: `Stability AI API 오류 (${response.status})`,
                    detail: errorText
                },
                { status: response.status }
            );
        }

        // GLB 바이너리 데이터를 응답으로 반환
        const glbBuffer = await response.arrayBuffer();
        console.log(`[SF3D] 변환 완료! GLB 크기: ${(glbBuffer.byteLength / 1024).toFixed(1)} KB`);

        return new NextResponse(glbBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'model/gltf-binary',
                'Content-Disposition': 'attachment; filename="model.glb"',
                'Content-Length': glbBuffer.byteLength.toString(),
            },
        });
    } catch (error: any) {
        console.error('[SF3D] 서버 오류:', error);
        return NextResponse.json(
            { error: '3D 변환 처리 중 오류가 발생했습니다.', detail: error.message },
            { status: 500 }
        );
    }
}
