# XOM3 Cockpit - Production Deployment Script
# Run this to deploy the cockpit to Vercel

Write-Host "🚀 XOM3 COCKPIT DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=" * 50

# Step 1: Verify we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Not in xom3-app directory" -ForegroundColor Red
    Write-Host "Run: cd xom3-app" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Testing local build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Check errors above." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy to Vercel
Write-Host "Step 2: Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go to: https://vercel.com/preston-chenaults-projects/xom3-app/settings/environment-variables"
Write-Host "2. Add your environment variables from .env.local"
Write-Host "3. Redeploy: vercel --prod"
Write-Host ""
Write-Host "Your cockpit will be live at: https://xom3-app.vercel.app" -ForegroundColor Green
