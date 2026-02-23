const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    console.log("로컬 미디어 파일 복사 중...");
    const publicImagesDir = path.join(__dirname, 'public', 'images');
    if (!fs.existsSync(publicImagesDir)) {
        fs.mkdirSync(publicImagesDir, { recursive: true });
    }

    // 복사할 파일 경로 매핑
    const filesToCopy = [
        { src: 'C:/Users/user/.gemini/antigravity/brain/6eaf6f82-50a5-4c86-a440-e8b702a52bd5/media__1771779287141.png', dest: '2d-drawing.png' },
        { src: 'C:/Users/user/.gemini/antigravity/brain/6eaf6f82-50a5-4c86-a440-e8b702a52bd5/media__1771779231050.png', dest: '3d-preview.png' }
    ];

    filesToCopy.forEach(file => {
        const destPath = path.join(publicImagesDir, file.dest);
        if (fs.existsSync(file.src)) {
            fs.copyFileSync(file.src, destPath);
            console.log(`복사 완료: ${file.dest}`);
        }
    });

    console.log("git add . 시작...");
    execSync('git add .', { stdio: 'inherit' });

    console.log("git commit 시작...");
    execSync('git commit -m "feat: [Alpha V1.053] AI Reference Images user upload and default images update"', { stdio: 'inherit' });

    console.log("git push 시작...");
    execSync('git push', { stdio: 'inherit' });

    console.log("Vercel 자동 배포 트리거를 위한 Git 명령이 성공적으로 완료되었습니다!");
} catch (error) {
    console.error("Git 명령어 실행 중 오류 발생:", error);
}
