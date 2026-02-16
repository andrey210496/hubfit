$vpsAddress = "root@31.220.103.111"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions"
$localFunctionsRoot = "$PSScriptRoot\supabase\functions"
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

Write-Host "=== Deploying Backend Fixes (Code + Config) ===" -ForegroundColor Cyan
Write-Host "Target: $vpsAddress" -ForegroundColor Yellow

# 1. Deploy Config
if (Test-Path $localConfig) {
    Write-Host "`n>> [1/3] Deploying config.toml..." -ForegroundColor Green
    Invoke-SCP $localConfig "${vpsAddress}:$remoteBase/config.toml"
}

Push-Location "$localFunctionsRoot"

# 2. Deploy uazapi-webhook (Code Fix)
$func = "uazapi-webhook"
if (Test-Path $func) {
    Write-Host "`n>> [2/3] Deploying $func code..." -ForegroundColor Green
    Invoke-SSH $vpsAddress "mkdir -p $remoteBase/$func"
    # Recursively copy
    $files = Get-ChildItem -Path $func -Recurse -File
    foreach ($file in $files) {
        $relPath = Resolve-Path -Path $file.FullName -Relative
        if ($relPath.StartsWith(".\")) { $relPath = $relPath.Substring(2) }
        $remoteRelPath = $relPath.Replace("\", "/")
        $remotePath = "$remoteBase/$remoteRelPath"
        $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath).Replace("\", "/")
        Invoke-SSH $vpsAddress "mkdir -p `"$remoteDir`""
        Invoke-SCP ".\$relPath" "${vpsAddress}:$remotePath"
    }
}

# 3. Deploy uazapi-create-instance (Code Fix)
$func = "uazapi-create-instance"
if (Test-Path $func) {
    Write-Host "`n>> [3/3] Deploying $func code..." -ForegroundColor Green
    Invoke-SSH $vpsAddress "mkdir -p $remoteBase/$func"
    $files = Get-ChildItem -Path $func -Recurse -File
    foreach ($file in $files) {
        $relPath = Resolve-Path -Path $file.FullName -Relative
        if ($relPath.StartsWith(".\")) { $relPath = $relPath.Substring(2) }
        $remoteRelPath = $relPath.Replace("\", "/")
        $remotePath = "$remoteBase/$remoteRelPath"
        $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath).Replace("\", "/")
        Invoke-SSH $vpsAddress "mkdir -p `"$remoteDir`""
        Invoke-SCP ".\$relPath" "${vpsAddress}:$remotePath"
    }
}

Pop-Location

# 4. Restart
Write-Host "`n=== Restarting Container ===" -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"

Write-Host "`n=== Checking Logs (Last 20 lines) ===" -ForegroundColor Yellow
Start-Sleep -Seconds 5
Invoke-SSH $vpsAddress "docker logs --tail 20 supabase-edge-functions-1750867038"

Write-Host "`nDone. Try connecting again." -ForegroundColor Green
