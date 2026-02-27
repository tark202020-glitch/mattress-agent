const { execSync } = require('child_process');
const fs = require('fs');
try {
    const result = execSync('git log -p -n 5 app/lib/constants.ts', { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 10 });
    fs.writeFileSync('C:\\Users\\user\\AppData\\Local\\Temp\\git_log.txt', result);
} catch (e) {
    fs.writeFileSync('C:\\Users\\user\\AppData\\Local\\Temp\\git_log.txt', e.toString());
}
