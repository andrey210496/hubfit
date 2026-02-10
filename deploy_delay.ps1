$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

# 1. Apply Database Migration
Write-Host "1/2 Aplicando migracao de banco..." -ForegroundColor Yellow
$migrationFile = "c:\Users\Cross Nutrition Box\Downloads\antigravity-kit\whitelabel-executer\supabase\migrations\add_response_delay.sql"
$tempFile = "fix_delay.sql"
Copy-Item $migrationFile $tempFile

# Change: Use 'docker cp' + 'psql -f' strategy instead of pipe to avoid char loss
scp $tempFile "${vpsAddress}:/tmp/fix_delay.sql"

# Copy into container
ssh $vpsAddress "docker cp /tmp/fix_delay.sql supabase-db-1750867038:/tmp/fix_delay.sql"

# Execute inside container
ssh $vpsAddress "docker exec supabase-db-1750867038 psql -U supabase_admin -d postgres -f /tmp/fix_delay.sql"

Remove-Item $tempFile -Force

# 2. Update Edge Function
Write-Host "2/2 Atualizando Edge Function..." -ForegroundColor Yellow
$localPath = "c:\Users\Cross Nutrition Box\Downloads\antigravity-kit\whitelabel-executer\supabase\functions\ai-orchestrator\index.ts"
$remotePath = "/root/multiple-supabase/docker/volumes-1750867038/functions/ai-orchestrator/index.ts"
scp $localPath "${vpsAddress}:${remotePath}"

Write-Host "Reiniciando Edge Functions..." -ForegroundColor Yellow
ssh $vpsAddress "docker restart supabase-edge-functions-1750867038"

Write-Host "Concluido! Jaque deve estar funcioando." -ForegroundColor Cyan
