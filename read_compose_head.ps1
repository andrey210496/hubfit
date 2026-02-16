# read_compose_head.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Reading first 50 lines of $composeFile..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "head -n 50 $composeFile"
