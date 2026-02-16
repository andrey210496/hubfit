# deploy_webhook_fix.ps1
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

$func = "uazapi-webhook"

Write-Host "=== Deploying $func ===" -ForegroundColor Cyan
Push-Location "$localFunctionsRoot"
try {
    Write-Host "Deploying..."
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
finally {
    Pop-Location
}
Invoke-SSH $vpsAddress "docker restart supabase-edge-functions-1750867038"
Write-Host "Done."
