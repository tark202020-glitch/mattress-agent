import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { base64, coverLabel, angleId } = body;

        if (!base64 || !coverLabel || !angleId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
        const filename = `${coverLabel}_${timestamp}_${angleId}.png`.replace(/\s+/g, '_');

        const targetDir = path.join(process.cwd(), 'resource', 'AI-cover');

        // Ensure directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const filePath = path.join(targetDir, filename);

        // Remove data header if it exists
        const formattedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(formattedBase64, 'base64');

        fs.writeFileSync(filePath, buffer);

        console.log(`[SaveImage] Image saved successfully to ${filePath}`);

        return NextResponse.json({ success: true, filename, filePath });
    } catch (error: any) {
        console.error('[SaveImage] Error saving image:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
