# debug_remote_logs.ps1
# Script para capturar logs brutos e detalhados do Supabase
$vpsAddress = "root@31.220.103.111"
$containerName = "supabase-edge-functions-1750867038"

Write-Host "Capturando ultimos 200 logs do container (Sem filtros)..." -ForegroundColor Cyan
Write-Host "Isso nos ajudara a ver o erro real." -ForegroundColor Yellow

# Fetch last 200 logs WITHOUT grep to ensure we see the full stack trace
ssh $vpsAddress "docker logs --tail 200 $containerName 2>&1"

Write-Host "`n--- Fim dos Logs ---" -ForegroundColor Cyan
