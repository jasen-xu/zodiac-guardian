const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use tar to create a zip-compatible archive
const buildDir = path.join(__dirname, 'build');
const output = path.join(__dirname, 'scf-deploy.zip');

// Remove old zip
if (fs.existsSync(output)) fs.unlinkSync(output);

// Use PowerShell Compress-Archive from within the build directory
// This ensures files are at root level
process.chdir(buildDir);

const items = fs.readdirSync('.');
const itemsList = items.map(i => `"${i}"`).join(',');

const cmd = `powershell -Command "Compress-Archive -Path ${itemsList} -DestinationPath '${output}' -Force"`;
console.log('Creating zip from build directory...');
console.log('Items:', items.join(', '));

try {
    execSync(cmd, { stdio: 'inherit', cwd: buildDir });
    const stats = fs.statSync(output);
    console.log(`\nDone! ${output} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
}
