/**
 * SCF Deploy Package Builder (Node.js + archiver)
 * Creates a zip with proper Unix permissions for scf_bootstrap
 */
const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

const PROJECT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(__dirname, 'build');
const OUTPUT = path.join(__dirname, 'scf-deploy.zip');

const HTML_FILES = [
    'index.html', 'guardian.html', 'fortune.html', 'liuyao.html',
    'caishen.html', 'caishen-bei.html', 'caishen-dong.html', 'caishen-nan.html',
    'caishen-xi.html', 'caishen-zhong.html',
    'wuxing.html', 'wuxing-jin.html', 'wuxing-mu.html', 'wuxing-shui.html',
    'wuxing-huo.html', 'wuxing-tu.html', 'wuxing-bazi.html',
    'wenchuang.html', 'dongfangjing-renju.html', 'dongfangjing-zuting.html',
    'huangli.html', 'temples.html', 'temple-detail.html', 'sansha-qifu.html',
    'articles.html', 'article-detail.html'
];

const DIRS = ['css', 'js', 'images', 'audio'];

async function build() {
    // Clean
    if (fs.existsSync(BUILD_DIR)) fs.rmSync(BUILD_DIR, { recursive: true });
    if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);
    fs.mkdirSync(path.join(BUILD_DIR, 'static'), { recursive: true });

    // Copy SCF files
    fs.copyFileSync(path.join(PROJECT_DIR, 'scf', 'index.js'), path.join(BUILD_DIR, 'index.js'));
    fs.copyFileSync(path.join(PROJECT_DIR, 'scf', 'package.json'), path.join(BUILD_DIR, 'package.json'));
    console.log('  [OK] index.js, package.json');

    const bootstrap = path.join(PROJECT_DIR, 'scf', 'scf_bootstrap');
    if (fs.existsSync(bootstrap)) {
        fs.copyFileSync(bootstrap, path.join(BUILD_DIR, 'scf_bootstrap'));
        console.log('  [OK] scf_bootstrap');
    }

    // Copy HTML files
    for (const file of HTML_FILES) {
        const src = path.join(PROJECT_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(BUILD_DIR, 'static', file));
        }
    }
    console.log('  [OK] HTML files');

    // Copy directories
    for (const dir of DIRS) {
        const src = path.join(PROJECT_DIR, dir);
        if (fs.existsSync(src)) {
            copyDirSync(src, path.join(BUILD_DIR, 'static', dir));
            console.log('  [OK] ' + dir + '/');
        }
    }

    // Create zip with archiver
    console.log('  Creating zip with archiver...');
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(OUTPUT);
        const archive = new ZipArchive({ zlib: { level: 6 } });

        output.on('close', () => {
            const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
            console.log(`Build complete: scf/scf-deploy.zip (${sizeMB} MB)`);
            // Clean build dir
            fs.rmSync(BUILD_DIR, { recursive: true });
            resolve();
        });

        archive.on('error', reject);
        archive.pipe(output);

        // Add SCF root files (with proper permissions for scf_bootstrap)
        archive.file(path.join(BUILD_DIR, 'index.js'), { name: 'index.js' });
        archive.file(path.join(BUILD_DIR, 'package.json'), { name: 'package.json' });
        if (fs.existsSync(path.join(BUILD_DIR, 'scf_bootstrap'))) {
            archive.file(path.join(BUILD_DIR, 'scf_bootstrap'), {
                name: 'scf_bootstrap',
                mode: 0o755  // executable permission
            });
        }

        // Add static directory
        archive.directory(path.join(BUILD_DIR, 'static'), 'static');

        archive.finalize();
    });
}

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

build().catch(e => { console.error('Build failed:', e); process.exit(1); });
