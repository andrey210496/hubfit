# read_broken_compose.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Reading lines 390-410 of $composeFile..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "sed -n '390,410p' $composeFile"
