import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let filePath = '';
    if (type === 'drawing') {
        filePath = 'C:/Users/user/.gemini/antigravity/brain/6eaf6f82-50a5-4c86-a440-e8b702a52bd5/media__1771779287141.png';
    } else if (type === 'preview') {
        filePath = 'C:/Users/user/.gemini/antigravity/brain/6eaf6f82-50a5-4c86-a440-e8b702a52bd5/media__1771779231050.png';
    } else {
        return new NextResponse('Asset not found', { status: 404 });
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error reading local image:', error);
        return new NextResponse('Error reading local file', { status: 500 });
    }
}
