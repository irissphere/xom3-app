# XOM3 Vercel Environment Setup Script
# Run this to set up all required environment variables for production

Write-Host "Setting up Vercel environment variables for XOM3..." -ForegroundColor Green

# Change to the xom3-app directory
Set-Location $PSScriptRoot

# Required environment variables for production
$envVars = @(
    @{
        Name = "AIRTABLE_USHA_BASE_ID"
        Value = "app4y7GKkeUfZm8rS"
        Description = "Healthcare CRM Airtable base ID"
    },
    @{
        Name = "NODE_ENV"
        Value = "production"
        Description = "Production environment flag"
    },
    @{
        Name = "SLACK_WEBHOOK_URL"
        Value = ""
        Description = "Slack webhook URL for notifications (leave empty if not set up yet)"
    }
)

foreach ($env in $envVars) {
    Write-Host "Setting up $($env.Name): $($env.Description)" -ForegroundColor Yellow

    if ($env.Value -eq "") {
        $value = Read-Host "Enter value for $($env.Name) (or press Enter to skip)"
        if ($value -eq "") {
            Write-Host "Skipping $($env.Name)" -ForegroundColor Gray
            continue
        }
        $env.Value = $value
    }

    # Use echo to pipe the value to vercel env add
    $env.Value | vercel env add $env.Name

    Write-Host "✓ Added $($env.Name)" -ForegroundColor Green
}

Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run 'vercel --prod' to redeploy with new environment variables"
Write-Host "2. Test notifications at /settings/notifications"
Write-Host "3. Set up domains in Vercel dashboard if needed"








