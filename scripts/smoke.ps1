$ErrorActionPreference = "Stop"
$base = if ($env:API_URL) { $env:API_URL } else { "http://localhost:8080" }
$health = Invoke-RestMethod "$base/health"
if ($health.status -ne "ok") { throw "Health check failed" }
$overview = Invoke-RestMethod "$base/api/v1/overview"
if ($overview.mode -ne "synthetic_demo" -or $overview.total_transactions -le 0) { throw "Expected labeled synthetic demo records" }
$page = Invoke-RestMethod "$base/api/v1/transactions?page=1&page_size=5"
if ($page.items.Count -ne 5) { throw "Expected 5 paginated transactions" }
Write-Host "API smoke test passed: health, demo overview, pagination."
