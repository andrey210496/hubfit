# restore_compose.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Cleaning up corrupted file..." -ForegroundColor Cyan
# Delete all lines containing the pollution
Invoke-SSH $vpsAddress "sed -i '/PER_WORKER_POLICY_LIMIT_MS:/d' $composeFile"

Write-Host "Verifying cleanup (first 20 lines)..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "head -n 20 $composeFile"

Write-Host "Restarting stack to verify stability..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "cd /root/multiple-supabase/docker && docker compose -f $composeFile up -d"
