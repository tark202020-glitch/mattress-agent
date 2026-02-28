import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Next.js App Router: body size limit 해제 (base64 이미지가 크므로)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            body = await req.json();
        } catch (parseErr: any) {
            console.error('[SaveImage] JSON parse error (body too large?):', parseErr.message);
            return NextResponse.json({ error: 'Request body parse failed. Image may be too large.' }, { status: 413 });
        }

        const { base64, coverLabel, angleId, folder = 'AI-cover' } = body;

        if (!base64 || !coverLabel || !angleId) {
            console.error('[SaveImage] Missing fields:', { hasBase64: !!base64, coverLabel, angleId });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`[SaveImage] Received save request: coverLabel=${coverLabel}, angleId=${angleId}, base64Length=${base64.length}`);

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
        const filename = `${coverLabel}_${timestamp}_${angleId}.png`.replace(/\s+/g, '_');

        const targetDir = path.join(process.cwd(), 'resource', folder);

        // Ensure directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, filename);

        // Remove data header if it exists
        const formattedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(formattedBase64, 'base64');

        fs.writeFileSync(filePath, buffer);

        console.log(`[SaveImage] ✅ Image saved successfully: ${filename} (${buffer.length} bytes)`);

        return NextResponse.json({ success: true, filename, filePath });
    } catch (error: any) {
        console.error('[SaveImage] ❌ Error saving image:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
