# inspect_container_env.ps1
$vpsAddress = "root@31.220.103.111"
$containerName = "supabase-edge-functions-1750867038"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Inspecting Environment Variables for $containerName..." -ForegroundColor Cyan

# Inspect specific Env settings related to limits or general config
Invoke-SSH $vpsAddress "docker inspect $containerName --format '{{range .Config.Env}}{{println .}}{{end}}'"
