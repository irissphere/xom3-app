param(
  [int[]]$Ports = @(3000, 3001),
  [string]$HostName = "localhost",
  [string]$Tenant = "hi5",
  [string]$Name = "Trey Beasley",
  [string]$Email = "trey.beasley@hi5mg.com",
  [string]$Phone = "2143354883",
  [string]$Company = "Hi5 Media Group",
  [string]$Message = "Automation request: identify business contacts seeking internet/voice/security/networking; collect requirements; submit RFQs to vendors; position responses.",
  [string]$Source = "proposal_call",
  [string]$AssignedVendor = "Vendor Portal (TBD)"
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
      $r = Invoke-WebRequest -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 8 -Uri $Url -Method Post -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10)
    } else {
      $r = Invoke-WebRequest -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 8 -Uri $Url -Method Get
    }
    return @{ ok = $true; status = [int]$r.StatusCode; content = $r.Content }
  } catch {
    return @{ ok = $false; status = 0; content = $_.Exception.Message }
  }
}

Write-Host "HI5 Demo Seeder" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

$base = $null
foreach ($p in $Ports) {
  $u = "http://$HostName`:$p/api/diagnostics"
  $res = Hit -Url $u
  if ($res.ok -and $res.status -eq 200) {
    $json = Try-Json $res.content
    if ($null -ne $json -and $json.ok -eq $true) {
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

# 1) Mark heartbeats healthy (demo-proof)
$now = (Get-Date).ToString("o")
Hit -Url "$base/api/heartbeat/workflows" -Method POST -Body @{
  tenant = $Tenant
  key = "lead_intake"
  label = "Lead Intake"
  status = "healthy"
  lastRunAt = $now
  lastSuccessAt = $now
} | Out-Null

Hit -Url "$base/api/heartbeat/workflows" -Method POST -Body @{
  tenant = $Tenant
  key = "vendor_rfq"
  label = "Vendor RFQ"
  status = "healthy"
  lastRunAt = $now
  lastSuccessAt = $now
} | Out-Null

Hit -Url "$base/api/heartbeat/workflows" -Method POST -Body @{
  tenant = $Tenant
  key = "response_positioning"
  label = "Response Positioning"
  status = "healthy"
  lastRunAt = $now
  lastSuccessAt = $now
} | Out-Null

Hit -Url "$base/api/heartbeat/scrapers" -Method POST -Body @{
  tenant = $Tenant
  key = "linkedin"
  label = "LinkedIn Scraper"
  status = "healthy"
  lastRunAt = $now
  lastSuccessAt = $now
} | Out-Null

Hit -Url "$base/api/heartbeat/scrapers" -Method POST -Body @{
  tenant = $Tenant
  key = "job_posts"
  label = "Job Posts Monitor"
  status = "healthy"
  lastRunAt = $now
  lastSuccessAt = $now
} | Out-Null

Write-Host "✅ Heartbeats seeded (workflows + scrapers)." -ForegroundColor Green

# 2) Create a Golden Path lead record
$leadRes = Hit -Url "$base/api/hi5/pipeline/lead" -Method POST -Body @{
  tenant = $Tenant
  name = $Name
  email = $Email
  phone = $Phone
  company = $Company
  message = $Message
  source = $Source
}

if (-not $leadRes.ok -or $leadRes.status -lt 200 -or $leadRes.status -ge 300) {
  Write-Host "❌ Failed to create lead pipeline record (HTTP $($leadRes.status))." -ForegroundColor Red
  Write-Host $leadRes.content
  exit 1
}

$leadJson = Try-Json $leadRes.content
$pipelineId = $leadJson.record.id

Write-Host "✅ Golden Path lead created: $pipelineId" -ForegroundColor Green

# 3) Move it to RFQ generated
Hit -Url "$base/api/hi5/pipeline/rfq" -Method POST -Body @{
  tenant = $Tenant
  id = $pipelineId
  rfqStatus = "generated"
  assignedVendor = $AssignedVendor
} | Out-Null

# 4) Move it to response positioned
Hit -Url "$base/api/hi5/pipeline/response" -Method POST -Body @{
  tenant = $Tenant
  id = $pipelineId
  responseStatus = "positioned"
} | Out-Null

Write-Host ""
Write-Host "Open these for the call:" -ForegroundColor Cyan
Write-Host "  Cockpit:     $base/command"
Write-Host "  Diagnostics: $base/api/diagnostics"
Write-Host "  Hi5 settings:$base/api/hi5/settings"
Write-Host ""
Write-Host "Pipeline record id (copy if needed): $pipelineId" -ForegroundColor Yellow
Write-Host "Done." -ForegroundColor Green
