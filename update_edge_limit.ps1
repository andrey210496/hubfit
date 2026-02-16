# update_edge_limit.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Updating configuration to increase CPU Limit..." -ForegroundColor Cyan

# Use sed to insert the environment variable.
# We match '    environment:' and append the new variable on the next line with 6 spaces indentation.
# 60000 ms = 1 minute
$sedCmd = "sed -i 's/    environment:/    environment:\n      PER_WORKER_POLICY_LIMIT_MS: 60000/' $composeFile"

Invoke-SSH $vpsAddress $sedCmd

Write-Host "Verifying change..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "grep -C 2 PER_WORKER_POLICY_LIMIT_MS $composeFile"

Write-Host "Applying changes (restarting container)..." -ForegroundColor Cyan
# Try docker compose first, then docker-compose
Invoke-SSH $vpsAddress "cd /root/multiple-supabase/docker && (docker compose -f $composeFile up -d --force-recreate functions || docker-compose -f $composeFile up -d --force-recreate functions)"

Write-Host "Done. The functions container should now have a 60s CPU limit." -ForegroundColor Green
