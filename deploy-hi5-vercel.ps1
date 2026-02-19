# HI5 Dashboard Vercel Deployment Script
# This deploys only the HI5 routes to a separate Vercel project

Write-Host "🚀 Deploying HI5 Dashboard to Vercel..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Vercel CLI is installed
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Install with: npm install -g vercel" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (!(Test-Path "vercel.hi5.json")) {
    Write-Host "❌ vercel.hi5.json not found. Run this script from the xom3-app directory." -ForegroundColor Red
    exit 1
}

# Deploy with HI5-specific configuration
Write-Host "📦 Deploying with HI5 configuration..." -ForegroundColor Yellow
vercel --prod --yes --local-config=vercel.hi5.json --name hi5-dashboard

Write-Host "✅ HI5 Dashboard deployment complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🌐 Your HI5 dashboard is being deployed to a separate project." -ForegroundColor White
Write-Host "   Check your Vercel dashboard for the exact URL." -ForegroundColor White
Write-Host "   It should be something like: https://hi5-dashboard-[random].vercel.app" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "📋 Next steps:" -ForegroundColor White
Write-Host "   1. Add environment variables in Vercel dashboard" -ForegroundColor White
Write-Host "   2. Configure domain (optional)" -ForegroundColor White
Write-Host "   3. Test all HI5 routes work correctly" -ForegroundColor White
