# Test script for XOM3 Healthcare CRM endpoints
$baseUrl = "http://localhost:3000"
$endpoints = @(
    "/app",
    "/app/healthcare",
    "/api/usha/pipeline",
    "/api/usha/analytics",
    "/api/usha/tasks",
    "/api/usha/followups/activity"
)

Write-Host "`n=== Testing XOM3 Endpoints ===`n" -ForegroundColor Cyan

foreach ($endpoint in $endpoints) {
    $url = "$baseUrl$endpoint"
    Write-Host "Testing: $url" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        Write-Host "  ✓ Status: $($response.StatusCode)" -ForegroundColor Green
        
        if ($endpoint -like "/api/*") {
            $content = $response.Content | ConvertFrom-Json
            Write-Host "  ✓ Response received (JSON)" -ForegroundColor Green
            if ($content | Get-Member -Name "clients" -ErrorAction SilentlyContinue) {
                Write-Host "  ✓ Clients count: $($content.clients.Count)" -ForegroundColor Green
            }
            if ($content | Get-Member -Name "pipelineCounts" -ErrorAction SilentlyContinue) {
                Write-Host "  ✓ Analytics data present" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "=== Testing Complete ===`n" -ForegroundColor Cyan
