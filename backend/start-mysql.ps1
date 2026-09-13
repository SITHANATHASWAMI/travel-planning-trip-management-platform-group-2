# ============================================================
#  TripNest Backend — MySQL (local dev)
#  Run: powershell -ExecutionPolicy Bypass -File "start-mysql.ps1"
# ============================================================

# Force Java 21
$env:JAVA_HOME = "C:\Users\Dell\AppData\Local\jdks\jdk-21.0.10"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH

# Profile — uses MySQL (tripnest_db, root, swami@06)
$env:APP_PROFILE = "local"

# ── Load secrets from .env.local (not committed to git) ──────
$envFile = Join-Path $PSScriptRoot ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
        }
    }
    Write-Host "  Secrets loaded from .env.local" -ForegroundColor Green
} else {
    Write-Host "  WARNING: .env.local not found. Copy .env.local.example and fill in your secrets." -ForegroundColor Yellow
}

# Frontend URL (local)
$env:FRONTEND_URL = "http://localhost:3000"
$env:CORS_ORIGINS = "http://localhost:3000"

Write-Host ""
Write-Host "Starting TripNest backend (MySQL)..." -ForegroundColor Cyan
Write-Host "  API  : http://localhost:8080/api" -ForegroundColor Green
Write-Host "  DB   : MySQL tripnest_db (root / swami@06)" -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
mvn spring-boot:run
