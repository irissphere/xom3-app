# XOM3 Development Environment Manager
# Run this script to start all development services

Write-Host "🚀 Starting XOM3 Development Environment..." -ForegroundColor Cyan

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Kill any existing processes on our ports
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
$ports = @(3000, 5678)
foreach ($port in $ports) {
    if (Test-Port -Port $port) {
        Write-Host "Port $port is in use, attempting to free it..." -ForegroundColor Yellow
        # This is a simplified approach - in production you'd want more robust process management
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        foreach ($process in $processes) {
            try {
                Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped process $process using port $port" -ForegroundColor Green
            } catch {
                Write-Host "Could not stop process $process" -ForegroundColor Red
            }
        }
    }
}

# Start n8n in background (assuming it's installed)
Write-Host "🤖 Starting n8n workflow engine..." -ForegroundColor Magenta
$n8nJob = Start-Job -ScriptBlock {
    try {
        Set-Location "C:\path\to\n8n\installation" # Update this path
        n8n start
    } catch {
        Write-Host "n8n not found or failed to start. Please ensure n8n is installed." -ForegroundColor Red
    }
}

# Start Next.js app
Write-Host "⚛️ Starting Next.js application..." -ForegroundColor Blue
$env:PORT = 3000
$nextjsJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\prest\exom3\xom3-app"
    npm run dev
}

# Wait a moment for services to start
Start-Sleep -Seconds 5

# Check if services are running
Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
if (Test-Port -Port 3000) {
    Write-Host "✅ Next.js App: http://localhost:3000" -ForegroundColor Green
    Write-Host "   📱 Development Hub: http://localhost:3000/dev" -ForegroundColor Green
    Write-Host "   🎯 HI5 Dashboard: http://localhost:3000/hi5" -ForegroundColor Green
    Write-Host "   📊 Workflow Monitor: http://localhost:3000/hi5/monitor" -ForegroundColor Green
} else {
    Write-Host "❌ Next.js App: Not running" -ForegroundColor Red
}

if (Test-Port -Port 5678) {
    Write-Host "✅ n8n Engine: http://localhost:5678" -ForegroundColor Green
} else {
    Write-Host "❌ n8n Engine: Not running" -ForegroundColor Red
}

Write-Host "`n🎯 Ready for development! Access your services at:" -ForegroundColor Cyan
Write-Host "http://localhost:3000/dev" -ForegroundColor Yellow
Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Gray

# Keep script running to monitor services
try {
    while ($true) {
        Start-Sleep -Seconds 10
        # Could add health checks here
    }
} finally {
    Write-Host "`n🛑 Stopping services..." -ForegroundColor Yellow
    Stop-Job -Job $n8nJob -ErrorAction SilentlyContinue
    Stop-Job -Job $nextjsJob -ErrorAction SilentlyContinue
    Remove-Job -Job $n8nJob -ErrorAction SilentlyContinue
    Remove-Job -Job $nextjsJob -ErrorAction SilentlyContinue
}




