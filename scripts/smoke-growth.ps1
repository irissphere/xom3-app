param(
  [int[]]$Ports = @(3000, 3001),
  [string]$HostName = "localhost"
)

function Try-Json {
  param([string]$Text)
  try { return $Text | ConvertFrom-Json } catch { return $null }
}

function Hit {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [object]$Body = $null
  )
  try {
    if ($Method -eq "POST") {
      $r = Invoke-WebRequest -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 6 -Uri $Url -Method Post -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10)
    } else {
      $r = Invoke-WebRequest -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 6 -Uri $Url -Method Get
    }
    return @{ ok = $true; status = [int]$r.StatusCode; content = $r.Content }
  } catch {
    return @{ ok = $false; status = 0; content = $_.Exception.Message }
  }
}

Write-Host "HI5 Growth Smoke Test" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

$base = $null
foreach ($p in $Ports) {
  # Prefer the port that actually serves the Hi5 diagnostics endpoint (avoids false positives).
  $u = "http://$HostName`:$p/api/diagnostics"
  $res = Hit -Url $u
  if ($res.ok -and $res.status -eq 200) {
    $json = Try-Json $res.content
    if ($null -ne $json -and $json.ok -eq $true -and $null -ne $json.hi5) {
      $base = "http://$HostName`:$p"
      break
    }
  }
}

if (-not $base) {
  Write-Host "❌ Could not find a running server on ports: $($Ports -join ', ')." -ForegroundColor Red
  Write-Host "Start Next dev server: cd xom3-app; npm run dev" -ForegroundColor Yellow
  exit 1
}

Write-Host "✅ Server detected at: $base" -ForegroundColor Green

function Show-Step {
  param([string]$Name, [hashtable]$Result)
  $color = if ($Result.ok -and $Result.status -ge 200 -and $Result.status -lt 300) { "Green" } else { "Red" }
  Write-Host ""
  Write-Host "$Name -> HTTP $($Result.status)" -ForegroundColor $color
  if ($Result.ok) {
    $json = Try-Json $Result.content
    if ($null -ne $json) {
      $preview = ($json | ConvertTo-Json -Depth 6)
      if ($preview.Length -gt 900) { $preview = $preview.Substring(0, 900) + "`n…(truncated)" }
      Write-Host $preview
    } else {
      $t = $Result.content
      if ($t.Length -gt 300) { $t = $t.Substring(0, 300) + "`n…(truncated)" }
      Write-Host $t
    }
  } else {
    Write-Host $Result.content
  }
}

# Detect HI5 enablement from diagnostics (HI5 is gated/off by default now)
$diagRes = Hit -Url "$base/api/diagnostics"
$diagJson = Try-Json $diagRes.content
$hi5Enabled = $false
if ($null -ne $diagJson -and $null -ne $diagJson.hi5 -and $diagJson.hi5.enabled -eq $true) { $hi5Enabled = $true }
Write-Host ""
Write-Host ("HI5 enabled: " + ($hi5Enabled.ToString().ToLower())) -ForegroundColor Gray

# 1) Core health
Show-Step "GET /api/health" (Hit -Url "$base/api/health")
Show-Step "GET /api/diagnostics" (Hit -Url "$base/api/diagnostics")
if ($hi5Enabled) {
  Show-Step "GET /api/hi5/settings" (Hit -Url "$base/api/hi5/settings")
} else {
  Write-Host ""
  Write-Host "Skipping /api/hi5/* checks (ENABLE_HI5 is false)." -ForegroundColor Yellow
}

if ($hi5Enabled) {
  # 2) Toggle write path
  Show-Step "POST /api/hi5/toggle (enabled=true)" (Hit -Url "$base/api/hi5/toggle" -Method POST -Body @{ enabled = $true })
}

# 3) Heartbeat endpoints
Show-Step "GET /api/heartbeat/workflows" (Hit -Url "$base/api/heartbeat/workflows")
Show-Step "POST /api/heartbeat/workflows (lead_intake=healthy)" (Hit -Url "$base/api/heartbeat/workflows" -Method POST -Body @{
  key = "lead_intake"
  label = "Lead Intake"
  status = "healthy"
  lastRunAt = (Get-Date).ToString("o")
  lastSuccessAt = (Get-Date).ToString("o")
})
Show-Step "GET /api/heartbeat/scrapers" (Hit -Url "$base/api/heartbeat/scrapers")
Show-Step "POST /api/heartbeat/scrapers (linkedin=healthy)" (Hit -Url "$base/api/heartbeat/scrapers" -Method POST -Body @{
  key = "linkedin"
  label = "LinkedIn Scraper"
  status = "healthy"
  lastRunAt = (Get-Date).ToString("o")
  lastSuccessAt = (Get-Date).ToString("o")
})

# 4) Golden Path create + stage updates
if ($hi5Enabled) {
  $leadRes = Hit -Url "$base/api/hi5/pipeline/lead" -Method POST -Body @{
    name = "Demo Lead"
    email = "demo@example.com"
    company = "DemoCo"
    message = "Internet/voice/security/networking — demo"
    source = "smoke_test"
  }
  Show-Step "POST /api/hi5/pipeline/lead" $leadRes

  $leadJson = Try-Json $leadRes.content
  $pipelineId = $leadJson.record.id

  if ($pipelineId) {
    Show-Step "POST /api/hi5/pipeline/rfq" (Hit -Url "$base/api/hi5/pipeline/rfq" -Method POST -Body @{
      id = $pipelineId
      rfqStatus = "generated"
      assignedVendor = "Vendor A"
    })
    Show-Step "POST /api/hi5/pipeline/response" (Hit -Url "$base/api/hi5/pipeline/response" -Method POST -Body @{
      id = $pipelineId
      responseStatus = "positioned"
    })
    Show-Step "GET /api/hi5/pipeline/recent" (Hit -Url "$base/api/hi5/pipeline/recent?limit=5")
  } else {
    Write-Host "❌ Could not extract pipeline id from lead create response." -ForegroundColor Red
  }
} else {
  Write-Host ""
  Write-Host "HI5 is disabled, so Golden Path HI5 pipeline smoke steps were skipped." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Smoke test complete." -ForegroundColor Cyan
