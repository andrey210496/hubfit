# check_service_status.ps1
$vpsAddress = "root@31.220.103.111"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Checking running containers..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host "`nChecking for exited containers..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "docker ps -a --filter 'status=exited' --format 'table {{.Names}}\t{{.Status}}\t{{.ID}}'"
