# deploy_architecture_fix.ps1
# Deploys Backend functions with Multi-Connection Architecture fixes
# Includes: _shared (providers.ts), uazapi-webhook, send-message

$vpsAddress = "root@31.220.103.111"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions"
$localFunctionsRoot = "$PSScriptRoot\supabase\functions"

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

$FUNCTIONS = @(
    "_shared",
    "uazapi-webhook",
    "send-message",
    "uazapi-create-instance",
    "uazapi-check-status"
)

Write-Host "=== Deploying Multi-Connection Architecture Fixes ===" -ForegroundColor Cyan
Write-Host "Target: $vpsAddress" -ForegroundColor Yellow

# 1. Config
$localConfig = "$PSScriptRoot\supabase\config.toml"
if (Test-Path $localConfig) {
    Write-Host ">> Deploying config.toml..." -ForegroundColor Green
    Invoke-SCP $localConfig "${vpsAddress}:$remoteBase/config.toml"
}

# 2. Functions
Push-Location "$localFunctionsRoot"
try {
    foreach ($func in $FUNCTIONS) {
        if (-not (Test-Path $func)) {
            Write-Host "SKIP: $func (not found)" -ForegroundColor DarkGray
            continue
        }

        Write-Host "`n>> Deploying: $func" -ForegroundColor Green
        Invoke-SSH $vpsAddress "mkdir -p $remoteBase/$func"

        $files = Get-ChildItem -Path $func -Recurse -File
        foreach ($file in $files) {
            $relPath = Resolve-Path -Path $file.FullName -Relative
            if ($relPath.StartsWith(".\")) { $relPath = $relPath.Substring(2) }
            $remoteRelPath = $relPath.Replace("\", "/")
            $remoteDir = [System.IO.Path]::GetDirectoryName("$remoteBase/$remoteRelPath").Replace("\", "/")
            
            Invoke-SSH $vpsAddress "mkdir -p `"$remoteDir`""
            Invoke-SCP ".\$relPath" "${vpsAddress}:$remoteBase/$remoteRelPath"
        }
    }
}
finally {
    Pop-Location
}

# 3. Restart
Write-Host "`n=== Restarting Edge Functions ===" -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"

Write-Host "`n=== DONE. Logs should show traffic on uazapi-webhook ===" -ForegroundColor Green
