# Build native shells (Capacitor)
# Requires: Node, Android Studio (Android), Xcode on Mac (iOS)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"

Set-Location $frontend
Write-Host "Building web bundle..."
npm run build

Write-Host "Syncing Capacitor..."
npx cap sync

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  Android: npm run cap:android  (opens Android Studio)"
Write-Host "  iOS:     npm run cap:ios      (Mac + Xcode only)"
Write-Host ""
Write-Host "Before App Store submit:"
Write-Host "  - Set REACT_APP_BACKEND_URL to production API"
Write-Host "  - Configure Firebase, RevenueCat keys in backend/.env"
Write-Host "  - Lawyer-reviewed privacy policy at /privacy"
Write-Host "  - RESEND_API_KEY for consent emails"
