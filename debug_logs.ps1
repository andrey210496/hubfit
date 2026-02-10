$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

# 1. Check Agent Config (Delay)
$sql = "SELECT name, response_delay FROM ai_agents;"
$tempSql = "debug_config.sql"
Set-Content $tempSql -Value $sql -Encoding UTF8

scp $tempSql "${vpsAddress}:/tmp/debug_config.sql"

Write-Host "--- CONFIGURAÇÃO DO AGENTE ---" -ForegroundColor Cyan
ssh $vpsAddress "docker cp /tmp/debug_config.sql supabase-db-1750867038:/tmp/debug_config.sql"
ssh $vpsAddress "docker exec -i supabase-db-1750867038 psql -U supabase_admin -d postgres -f /tmp/debug_config.sql"
ssh $vpsAddress "rm /tmp/debug_config.sql"
Remove-Item $tempSql -Force

# 2. Check Edge Function Logs
Write-Host "`n--- LOGS DA EDGE FUNCTION (Últimas 100 linhas) ---" -ForegroundColor Cyan
ssh $vpsAddress "docker logs --tail 100 supabase-edge-functions-1750867038"
