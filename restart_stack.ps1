# restart_stack.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Restarting entire Supabase Stack..." -ForegroundColor Cyan
# Using --remove-orphans just in case, and ensuring we bring up everything
Invoke-SSH $vpsAddress "cd /root/multiple-supabase/docker && docker compose -f $composeFile up -d"

Write-Host "Checking service status after restart..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "docker ps --filter 'name=1750867038' --format 'table {{.Names}}\t{{.Status}}'"
