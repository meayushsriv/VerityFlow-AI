param([string]$ApiUrl = "http://localhost:8080")
$ErrorActionPreference = "Stop"
$results = [System.Collections.Generic.List[object]]::new()
function Measure-Case([string]$Name, [scriptblock]$Action) {
  $timer=[System.Diagnostics.Stopwatch]::StartNew()
  try { $value=& $Action; $timer.Stop(); $results.Add([pscustomobject]@{case=$Name;passed=$true;latency_ms=$timer.ElapsedMilliseconds;detail=$value}) }
  catch { $timer.Stop(); $results.Add([pscustomobject]@{case=$Name;passed=$false;latency_ms=$timer.ElapsedMilliseconds;detail=$_.Exception.Message}) }
}
$overview=Invoke-RestMethod "$ApiUrl/api/v1/overview"
$high=Invoke-RestMethod "$ApiUrl/api/v1/transactions?risk=high&page=1&page_size=1"
$low=Invoke-RestMethod "$ApiUrl/api/v1/transactions?risk=low&page=1&page_size=1"
if (!$high.items.Count -or !$low.items.Count) { throw "Expected synthetic high and low risk-band fixtures." }
Measure-Case "High-risk evidence references" {
  $result=Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/v1/transactions/$($high.items[0].id)/investigate" -ContentType "application/json" -Body '{"question":"Explain the evidence and suggest next checks."}'
  $ids=@($result.evidence | ForEach-Object id)
  if (!$ids.Count -or !$result.findings.Count) { throw "Evidence or findings missing." }
  foreach($finding in $result.findings){foreach($ref in $finding.evidence_ids){if($ref -notin $ids){throw "Unsupported evidence reference: $ref"}}}
  if(!$result.requires_analyst_confirmation){throw "Confirmation requirement missing."}
  "mode=$($result.mode); evidence=$($ids.Count); findings=$($result.findings.Count)"
}
Measure-Case "Lower-risk scenario fallback" {
  $result=Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/v1/transactions/$($low.items[0].id)/investigate" -ContentType "application/json" -Body '{"question":"What is missing?"}'
  if(!$result.missing_evidence.Count){throw "Missing-evidence disclosure absent."}
  "mode=$($result.mode); missing_evidence=$($result.missing_evidence.Count)"
}
Measure-Case "Missing transaction rejected" {
  try { Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/v1/transactions/NO-SUCH-ID/investigate" -ContentType "application/json" -Body '{"question":"review"}'; throw "Missing ID unexpectedly succeeded." }
  catch { if($_.Exception.Response.StatusCode.value__ -ne 404){throw} }; "HTTP 404"
}
Measure-Case "Comparison returns both fixtures" {
  $result=Invoke-RestMethod "$ApiUrl/api/v1/transactions/$($high.items[0].id)/compare?with_id=$($low.items[0].id)"
  if($result.left.id -ne $high.items[0].id -or $result.right.id -ne $low.items[0].id){throw "Comparison IDs mismatch."}; $result.limitations
}
$pass=@($results | Where-Object passed).Count
$median=if($results.Count){($results | Sort-Object latency_ms | Select-Object -Index ([int][math]::Floor(($results.Count-1)/2))).latency_ms}else{$null}
[pscustomobject]@{mode="synthetic_demo";total=$results.Count;passed=$pass;failed=$results.Count-$pass;median_latency_ms=$median;manual_unsupported_claim_rate="Not yet measured";gemini_live_tool_selection="Not measured without valid credentials";results=$results} | ConvertTo-Json -Depth 8
if($pass -ne $results.Count){exit 1}
