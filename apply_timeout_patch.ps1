# apply_timeout_patch.ps1
$vpsAddress = "root@31.220.103.111"
$mainFile = "/root/multiple-supabase/docker/volumes-1750867038/functions/main/index.ts"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

function Invoke-SCP {
    param($src, $dest)
    Write-Host "SCP: $src -> $dest" -ForegroundColor Gray
    scp $src $dest
}

Write-Host "Transferring patch script..." -ForegroundColor Cyan
Invoke-SCP ".\patch_timeout.py" "${vpsAddress}:/root/patch_timeout.py"

Write-Host "Executing patch script on VPS..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "python3 /root/patch_timeout.py"

Write-Host "Verifying patch..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "grep workerTimeoutMs $mainFile"

Write-Host "Restarting functions container..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"
