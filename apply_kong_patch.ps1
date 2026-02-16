# apply_kong_patch.ps1
$vpsAddress = "root@31.220.103.111"
$kongFile = "/root/multiple-supabase/docker/volumes-1750867038/api/kong.yml"

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
Invoke-SCP ".\patch_kong.py" "${vpsAddress}:/root/patch_kong.py"

Write-Host "Executing patch script on VPS..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "python3 /root/patch_kong.py"

Write-Host "Verifying patch..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "grep functions-v1 -A 2 $kongFile"

Write-Host "Restarting Kong container..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker restart supabase-kong-1750867038"
