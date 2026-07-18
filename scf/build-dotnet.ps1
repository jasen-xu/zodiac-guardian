$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$PROJECT_DIR = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BUILD_DIR = Join-Path $PROJECT_DIR "scf\build"
$OUTPUT = Join-Path $PROJECT_DIR "scf\scf-deploy.zip"

Write-Host "Rebuilding SCF deploy package..."

# Clean
if (Test-Path $BUILD_DIR) { Remove-Item -Recurse -Force $BUILD_DIR }
if (Test-Path $OUTPUT) { Remove-Item -Force $OUTPUT }
New-Item -ItemType Directory -Path (Join-Path $BUILD_DIR "static") -Force | Out-Null

# Copy cloud function code
Copy-Item (Join-Path $PROJECT_DIR "scf\index.js") $BUILD_DIR
Copy-Item (Join-Path $PROJECT_DIR "scf\package.json") $BUILD_DIR
Write-Host "  [OK] index.js, package.json"

# Copy bootstrap
$bootstrap = Join-Path $PROJECT_DIR "scf\scf_bootstrap"
if (Test-Path $bootstrap) {
    Copy-Item $bootstrap $BUILD_DIR
    Write-Host "  [OK] scf_bootstrap"
}

# Copy HTML files
$htmlFiles = @(
    "index.html", "guardian.html", "fortune.html", "liuyao.html",
    "caishen.html", "caishen-bei.html", "caishen-dong.html", "caishen-nan.html", "caishen-xi.html", "caishen-zhong.html",
    "wuxing.html", "wuxing-jin.html", "wuxing-mu.html", "wuxing-shui.html", "wuxing-huo.html", "wuxing-tu.html", "wuxing-bazi.html",
    "wenchuang.html", "dongfangjing-renju.html", "dongfangjing-zuting.html"
)
foreach ($file in $htmlFiles) {
    $src = Join-Path $PROJECT_DIR $file
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $BUILD_DIR "static")
    }
}
Write-Host "  [OK] HTML files"

# Copy directories
foreach ($dir in @("css", "js", "images", "audio")) {
    $src = Join-Path $PROJECT_DIR $dir
    if (Test-Path $src) {
        Copy-Item -Recurse $src (Join-Path $BUILD_DIR "static")
        Write-Host "  [OK] $dir/"
    }
}

# Create zip with .NET (more compatible than Compress-Archive)
Write-Host "  Creating zip..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($BUILD_DIR, $OUTPUT)

# Clean build dir
Remove-Item -Recurse -Force $BUILD_DIR

$sizeMB = [math]::Round((Get-Item $OUTPUT).Length / 1MB, 2)
Write-Host "Build complete: scf\scf-deploy.zip ($sizeMB MB)"
