# PowerShell setup for Windows (run in Cursor terminal as Administrator if installs fail)

Write-Host "=== game0701 local setup ===" -ForegroundColor Cyan

# 1. Install prerequisites via winget (skip if already installed)
$packages = @(
    "Python.Python.3.12",
    "OpenJS.NodeJS.LTS",
    "MongoDB.Server"
)
foreach ($pkg in $packages) {
    Write-Host "Checking $pkg ..."
    winget install --id $pkg -e --accept-source-agreements --accept-package-agreements 2>$null
}

# 2. Re-open terminal after installs, then:
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "`nInstalling backend deps..." -ForegroundColor Yellow
Set-Location backend
python -m pip install -r requirements.txt

Write-Host "`nInstalling frontend deps..." -ForegroundColor Yellow
Set-Location ..\frontend
corepack enable 2>$null
yarn install

Write-Host "`nDownloading hero images (if missing)..." -ForegroundColor Yellow
$dest = "src\assets\emergent"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$files = @{
    "hero.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/4d1c4412c0db8eb926168ed4c837ed65609fd13aba3c6108f8361583dc6f7e50.png"
    "student.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/e107b7c106d7f97f7b92fe570b755516063dd742f39bda9bfdc80c5213b92569.png"
    "parent.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/987e9a1d69803b87fa479a643b0520655a522c8361dafedb4f2a26b2e6e3001d.png"
    "teacher.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/8d82900a1847a03f1fce8b9e38d362729bd7947de1accea5aed70d1729c95e85.png"
    "camera-bg.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/6e359f7aeed7399df32d3f855ac94ea52eda4c4f129027368e87bbc2b194f29c.png"
    "boss.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/5ebfb4090fa6c80b07c42cecf7edb828703141e03a55306d0d9ff91931ba91aa.png"
    "world-map.png" = "https://static.prod-images.emergentagent.com/jobs/96c2d81a-68f1-47b1-8d48-5cd97edd0fc9/images/fb2a9fe3bdb1a067d60f4a31b84027120084335d5995788dca166ce209fd8337.png"
}
foreach ($name in $files.Keys) {
    $out = Join-Path $dest $name
    if (-not (Test-Path $out)) {
        try {
            Invoke-WebRequest -Uri $files[$name] -OutFile $out -UseBasicParsing
            Write-Host "  OK $name"
        } catch {
            Write-Host "  FAIL $name" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host @"

Next steps (3 terminals):

  Terminal 1 — MongoDB (if not running as service):
    mongod --dbpath C:\data\db

  Terminal 2 — Backend:
    cd backend
    uvicorn server:app --reload --port 8000

  Terminal 3 — Frontend:
    cd frontend
    yarn start

  Terminal 4 — Tests:
    `$env:REACT_APP_BACKEND_URL='http://localhost:8000'
    cd backend
    python -m pytest tests/ -v

Edit backend/.env: GEMINI_API_KEY (optional), RESEND_API_KEY (optional)
Login: use Dev Sign In at /login (DEV_AUTH_ENABLED=true)
"@
