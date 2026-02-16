# apply_limit_safely.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

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

Write-Host "Transferring update script..." -ForegroundColor Cyan
# Fix for powershell variable expansion before colon
Invoke-SCP ".\update_compose.py" "${vpsAddress}:/root/update_compose.py"

Write-Host "Executing update script on VPS..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "python3 /root/update_compose.py"

Write-Host "Verifying change in file..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "grep -C 5 PER_WORKER_POLICY_LIMIT_MS $composeFile"

Write-Host "Restarting functions container..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "cd /root/multiple-supabase/docker && docker compose -f $composeFile up -d --force-recreate functions"
