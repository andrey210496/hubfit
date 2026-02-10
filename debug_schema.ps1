$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

$sql = "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_agents';
"

$tempSql = "debug_schema.sql"
Set-Content $tempSql -Value $sql -Encoding UTF8

scp $tempSql "${vpsAddress}:/tmp/debug_schema.sql"

Write-Host "--- SCHEMA DA TABELA ai_agents ---" -ForegroundColor Cyan
ssh $vpsAddress "docker cp /tmp/debug_schema.sql supabase-db-1750867038:/tmp/debug_schema.sql"
ssh $vpsAddress "docker exec -i supabase-db-1750867038 psql -U supabase_admin -d postgres -f /tmp/debug_schema.sql"
ssh $vpsAddress "rm /tmp/debug_schema.sql"
Remove-Item $tempSql -Force
