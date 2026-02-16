# deploy_uazapi.ps1 - Deploy all UazAPI integration functions to VPS
# Uses Start-Process like deploy_ai_code.ps1 (handles password prompts)

$vpsAddress = "root@31.220.103.111"
$remoteBase = "/root/multiple-supabase/docker/volumes-1750867038/functions"

# Use PSScriptRoot to determine local path
$localFunctionsRoot = "$PSScriptRoot\supabase\functions"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "  SSH: $cmd" -ForegroundColor Gray
    # Ensure correct quoting for ssh command
    $cmd = "export PATH=`$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin; $cmd"
    $p = Start-Process ssh.exe -ArgumentList "$addr", "`"$cmd`"" -NoNewWindow -Wait -PassThru
    return $p.ExitCode
}

function Invoke-SCP {
    param($src, $dest)
    Write-Host "  SCP: $src -> $dest" -ForegroundColor Gray
    # Use quotes around src and dest to handle spaces properly
    $p = Start-Process scp.exe -ArgumentList "`"$src`"", "$dest" -NoNewWindow -Wait -PassThru
    return $p.ExitCode
}

# Updated list of functions to deploy
$FUNCTIONS = @(
    "uazapi-create-instance",
    "meta-embedded-signup",
    "uazapi-webhook",
    "meta-webhook",
    "whatsapp-webhook",
    "_shared"
)

Write-Host "=== UazAPI & Meta Integration Deployment ===" -ForegroundColor Cyan
Write-Host "Target: $vpsAddress" -ForegroundColor Yellow
Write-Host "You will be prompted for password for each SSH/SCP call.`n"

# 0. Deploy config.toml (Crucial for Function configuration like verify_jwt)
$localConfig = "$PSScriptRoot\supabase\config.toml"
if (Test-Path $localConfig) {
    Write-Host ">> Deploying config.toml..." -ForegroundColor Green
    Invoke-SCP $localConfig "${vpsAddress}:$remoteBase/config.toml"
}
else {
    Write-Host "Warning: config.toml not found!" -ForegroundColor Red
}

# Verify local root exists
if (-not (Test-Path $localFunctionsRoot)) {
    Write-Host "Error: Functions directory not found at $localFunctionsRoot" -ForegroundColor Red
    exit 1
}

# Change to the functions directory to use relative paths (safer for scp with spaces)
Push-Location "$localFunctionsRoot"

try {
    foreach ($func in $FUNCTIONS) {
        if (-not (Test-Path $func)) {
            Write-Host "SKIP: $func (not found in $(Get-Location))" -ForegroundColor DarkGray
            continue
        }

        Write-Host "`n>> Deploying: $func" -ForegroundColor Green

        # Create remote directory
        Invoke-SSH $vpsAddress "mkdir -p $remoteBase/$func"

        # Get all files recursively using relative paths
        $files = Get-ChildItem -Path $func -Recurse -File
        
        foreach ($file in $files) {
            # Get relative path from current location (e.g. "meta-embedded-signup\index.ts")
            # Resolve-Path -Relative returns .\path\to\file
            $relPath = Resolve-Path -Path $file.FullName -Relative
            
            # Remove .\ prefix if present
            if ($relPath.StartsWith(".\")) { $relPath = $relPath.Substring(2) }
            
            # Convert to forward slashes for remote path
            $remoteRelPath = $relPath.Replace("\", "/")
            
            # Ensure no double slashes if remoteBase doesn't end in /
            # Actually remoteBase is consistent.
            
            $remotePath = "$remoteBase/$remoteRelPath"
            
            # Create remote subdirectory if needed
            $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath).Replace("\", "/")
            
            # Extract just the parent directory of the file on remote
            # mkdir -p handles existing parents
            Invoke-SSH $vpsAddress "mkdir -p `"$remoteDir`""

            # Use relative path for local source (it handles spaces better if we are in the dir)
            Invoke-SCP ".\$relPath" "${vpsAddress}:$remotePath"
        }
    }
}
finally {
    Pop-Location
}

Write-Host "`n=== Restarting Edge Functions Container ===" -ForegroundColor Cyan
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"

Write-Host "`n=== Checking logs (wait 5s) ===" -ForegroundColor Yellow
Start-Sleep -Seconds 5
Invoke-SSH $vpsAddress "docker logs --tail 30 supabase-edge-functions-1750867038"

Write-Host "`n=== Deployment complete ===" -ForegroundColor Green
