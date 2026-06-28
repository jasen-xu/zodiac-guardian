# Tencent Cloud SCF Build Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

$PROJECT_DIR = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BUILD_DIR = Join-Path $PROJECT_DIR "scf\build"
$OUTPUT = Join-Path $PROJECT_DIR "scf\scf-deploy.zip"

Write-Host "Building SCF deploy package..."

# Clean old build
if (Test-Path $BUILD_DIR) { Remove-Item -Recurse -Force $BUILD_DIR }
if (Test-Path $OUTPUT) { Remove-Item -Force $OUTPUT }
New-Item -ItemType Directory -Path (Join-Path $BUILD_DIR "static") -Force | Out-Null

# Copy cloud function code
Copy-Item (Join-Path $PROJECT_DIR "scf\index.js") $BUILD_DIR
Copy-Item (Join-Path $PROJECT_DIR "scf\package.json") $BUILD_DIR
Write-Host "  [OK] index.js"
Write-Host "  [OK] package.json"

# Copy bootstrap
$bootstrap = Join-Path $PROJECT_DIR "scf\scf_bootstrap"
if (Test-Path $bootstrap) {
    Copy-Item $bootstrap $BUILD_DIR
    Write-Host "  [OK] scf_bootstrap"
}

# Copy HTML files
Write-Host "  Copying frontend files..."
$htmlFiles = @(
    "index.html", "guardian.html", "fortune.html", "liuyao.html",
    "caishen.html", "caishen-bei.html", "caishen-dong.html", "caishen-nan.html", "caishen-xi.html", "caishen-zhong.html",
    "wuxing.html", "wuxing-jin.html", "wuxing-mu.html", "wuxing-shui.html", "wuxing-huo.html", "wuxing-tu.html",
    "wenchuang.html", "dongfangjing-renju.html", "dongfangjing-zuting.html"
)
foreach ($file in $htmlFiles) {
    $src = Join-Path $PROJECT_DIR $file
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $BUILD_DIR "static")
        Write-Host "  [OK] $file"
    } else {
        Write-Host "  [SKIP] $file (not found)"
    }
}

# Copy directories
$dirs = @("css", "js", "images", "audio")
foreach ($dir in $dirs) {
    $src = Join-Path $PROJECT_DIR $dir
    if (Test-Path $src) {
        Copy-Item -Recurse $src (Join-Path $BUILD_DIR "static")
        Write-Host "  [OK] $dir/"
    }
}

# Create zip
Write-Host "  Creating zip package..."
if (Test-Path $OUTPUT) { Remove-Item -Force $OUTPUT }
Compress-Archive -Path (Join-Path $BUILD_DIR "*") -DestinationPath $OUTPUT -Force

# Clean build dir
Remove-Item -Recurse -Force $BUILD_DIR

# Show result
$sizeMB = [math]::Round((Get-Item $OUTPUT).Length / 1MB, 2)
Write-Host ""
Write-Host "Build complete!"
Write-Host "Output: scf\scf-deploy.zip ($sizeMB MB)"
