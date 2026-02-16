# debug_vps_deployment.ps1
$vpsAddress = "root@31.220.103.111"
$containerName = "supabase-edge-functions-1750867038"
$remotePath = "/root/multiple-supabase/docker/volumes-1750867038/functions/meta-embedded-signup/index.ts"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "--- Investigating Remote File Content ---" -ForegroundColor Cyan
# Read first 20 lines of the file we just uploaded
Invoke-SSH $vpsAddress "head -n 20 $remotePath"

Write-Host "`n--- Investigating Docker Mounts ---" -ForegroundColor Cyan
# Inspect container mounts to see where /home/deno/functions is mapped
Invoke-SSH $vpsAddress "docker inspect $containerName --format '{{json .Mounts}}'"
