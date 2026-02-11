# deploy_uazapi.ps1 - Deploy all UazAPI integration functions to VPS
# Uses Start-Process like deploy_ai_code.ps1 (handles password prompts)

$vpsAddress = "root@31.220.103.111"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions"
$localBase = "$PSScriptRoot\supabase\functions"

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
    "uazapi-create-instance",
    "meta-webhook",
    "send-message",
    "send-template",
    "send-interactive",
    "send-reaction",
    "ai-agent-process",
    "ai-orchestrator"
)

Write-Host "=== UazAPI Integration Deployment ===" -ForegroundColor Cyan
Write-Host "Target: $vpsAddress" -ForegroundColor Yellow
Write-Host "You will be prompted for password for each SSH/SCP call.`n"

foreach ($func in $FUNCTIONS) {
    $localPath = "$localBase\$func"
    if (-not (Test-Path $localPath)) {
        Write-Host "SKIP: $func (not found)" -ForegroundColor DarkGray
        continue
    }

    Write-Host "`n>> Deploying: $func" -ForegroundColor Green

    # Create remote directory
    Invoke-SSH $vpsAddress "mkdir -p $remoteBase/$func"

    # Get all files in the function directory (non-recursive for flat dirs)
    $files = Get-ChildItem -Path $localPath -File
    foreach ($file in $files) {
        Invoke-SCP $file.FullName "${vpsAddress}:${remoteBase}/${func}/$($file.Name)"
    }

    # Handle subdirectories (e.g., ai-orchestrator/chains, ai-orchestrator/tools)
    $subDirs = Get-ChildItem -Path $localPath -Directory
    foreach ($subDir in $subDirs) {
        Invoke-SSH $vpsAddress "mkdir -p $remoteBase/$func/$($subDir.Name)"
        $subFiles = Get-ChildItem -Path $subDir.FullName -File
        foreach ($sf in $subFiles) {
            Invoke-SCP $sf.FullName "${vpsAddress}:${remoteBase}/${func}/$($subDir.Name)/$($sf.Name)"
        }
    }
}

Write-Host "`n=== Restarting Edge Functions ===" -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"

Write-Host "`n=== Checking logs (wait 5s) ===" -ForegroundColor Yellow
Start-Sleep -Seconds 5
Invoke-SSH $vpsAddress "docker logs --tail 30 supabase-edge-functions-1750867038"

Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
