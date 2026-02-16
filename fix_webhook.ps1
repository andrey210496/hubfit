$vpsAddress = "root@31.220.103.111"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions"
$localConfig = "$PSScriptRoot\supabase\config.toml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "  SSH: $cmd" -ForegroundColor Gray
    $cmd = "export PATH=`$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin; $cmd"
    $p = Start-Process ssh.exe -ArgumentList "$addr", "`"$cmd`"" -NoNewWindow -Wait -PassThru
    return $p.ExitCode
}

function Invoke-SCP {
    param($src, $dest)
    Write-Host "  SCP: $src -> $dest" -ForegroundColor Gray
    $p = Start-Process scp.exe -ArgumentList "`"$src`"", "$dest" -NoNewWindow -Wait -PassThru
    return $p.ExitCode
}

Write-Host "=== Fix Webhook Config & Check Logs ===" -ForegroundColor Cyan

# 1. Deploy config.toml
if (Test-Path $localConfig) {
    Write-Host ">> Deploying config.toml..." -ForegroundColor Green
    Invoke-SCP $localConfig "${vpsAddress}:$remoteBase/config.toml"
}
else {
    Write-Host "Error: config.toml not found!" -ForegroundColor Red
    exit 1
}

# 2. Restart
Write-Host "`n>> Restarting Container..." -ForegroundColor Green
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"

# 3. Logs
Write-Host "`n>> Waiting for startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ">> Fetching Logs..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker logs --tail 50 supabase-edge-functions-1750867038"

Write-Host "`nDone."
