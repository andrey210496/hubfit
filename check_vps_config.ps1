# check_vps_config.ps1
$vpsAddress = "root@31.220.103.111"
$searchPath = "/root/multiple-supabase"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Searching for docker-compose.yml in $searchPath..." -ForegroundColor Cyan

# Find docker-compose files
$files = Invoke-SSH $vpsAddress "find $searchPath -name 'docker-compose.yml' -o -name 'docker-compose.yaml'"

if ($files) {
    Write-Host "Found config file(s):" -ForegroundColor Green
    Write-Host $files
    
    foreach ($file in $files -split "`n") {
        if ([string]::IsNullOrWhiteSpace($file)) { continue }
        Write-Host "`n--- Content of $file ---" -ForegroundColor Yellow
        # Read the file to check for edge-runtime settings
        Invoke-SSH $vpsAddress "cat $file"
    }
}
else {
    Write-Host "No docker-compose.yml found." -ForegroundColor Red
}
