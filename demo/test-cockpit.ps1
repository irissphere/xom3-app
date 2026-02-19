# Test XOM3 Cockpit Deployment
# Run this to verify your cockpit is working

Write-Host "🚀 Testing XOM3 Cockpit Deployment" -ForegroundColor Cyan
Write-Host "=" * 50

# Test 1: System Status API
Write-Host "`n[1/3] Testing System Status API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://www.xom3.io/api/system/status" -Method GET
    Write-Host "✅ System Status API: WORKING" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ System Status API: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Obols Status API
Write-Host "`n[2/3] Testing Obols Status API..." -ForegroundColor Yellow
try {
    $headers = @{ "x-user-id" = "test-user" }
    $response = Invoke-RestMethod -Uri "https://www.xom3.io/api/obols/status?tier=xom3" -Method GET -Headers $headers
    Write-Host "✅ Obols Status API: WORKING" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Obols Status API: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Lead Intake API
Write-Host "`n[3/3] Testing Lead Intake API..." -ForegroundColor Yellow
try {
    $body = @{
        firstName = "Test"
        lastName = "User"
        email = "test@example.com"
        company = "Test Corp"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "https://www.xom3.io/api/commander/intake" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Lead Intake API: WORKING" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Lead Intake API: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 50)
Write-Host "🎉 Testing Complete!" -ForegroundColor Cyan
Write-Host "`nYour cockpit is live at: https://www.xom3.io/xom3" -ForegroundColor Green
Write-Host "Open it in your browser now!" -ForegroundColor Green
