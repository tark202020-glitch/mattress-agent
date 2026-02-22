const { execSync } = require('child_process');

try {
    console.log("git add . 시작...");
    execSync('git add .', { stdio: 'inherit' });

    console.log("git commit 시작...");
    execSync('git commit -m "feat: [Alpha V1.047] Update layout density, add local-image API, add Supabase sign-out"', { stdio: 'inherit' });

    console.log("git push 시작...");
    execSync('git push', { stdio: 'inherit' });

    console.log("Vercel 자동 배포 트리거를 위한 Git 명령이 성공적으로 완료되었습니다!");
} catch (error) {
    console.error("Git 명령어 실행 중 오류 발생:", error);
}
