# fix_compose_file.ps1
$vpsAddress = "root@31.220.103.111"
$composeFile = "/root/multiple-supabase/docker/docker-compose-1750867038.yml"

function Invoke-SSH {
    param($addr, $cmd)
    Write-Host "SSH: $cmd" -ForegroundColor Gray
    ssh $addr $cmd
}

Write-Host "Reverting bad changes (removing all PER_WORKER_POLICY_LIMIT_MS lines)..." -ForegroundColor Cyan
# Remove the bad lines globally first to clean up
Invoke-SSH $vpsAddress "sed -i '/PER_WORKER_POLICY_LIMIT_MS: 60000/d' $composeFile"

Write-Host "Applying the fix correctly ONLY to the functions service..." -ForegroundColor Cyan
# We look for "image: supabase/edge-runtime" and then find the "environment:" block below it
# and append the variable. This is tricky with sed.
# Alternative: Search for the specific unique string in functions service or line number range?
# The functions service uses "image: supabase/edge-runtime:v1.58.2"
# Let's use a perl one-liner or just careful sed.

# Strategy:
# 1. Find the line number of "container_name: supabase-edge-functions-1750867038"
# 2. Find the next "environment:" line after that.
# 3. Append the config there.

$script = @'
    LINE=$(grep -n "container_name: supabase-edge-functions-1750867038" /root/multiple-supabase/docker/docker-compose-1750867038.yml | cut -d: -f1)
    # Find the next "environment:" after that line
    ENV_LINE=$(tail -n +$LINE /root/multiple-supabase/docker/docker-compose-1750867038.yml | grep -n "environment:" | head -n 1 | cut -d: -f1)
    REAL_ENV_LINE=$((LINE + ENV_LINE - 1))
    
    # Insert safely
    sed -i "${REAL_ENV_LINE}a\      PER_WORKER_POLICY_LIMIT_MS: 60000" /root/multiple-supabase/docker/docker-compose-1750867038.yml
'@

Invoke-SSH $vpsAddress $script

Write-Host "Verifying fix..." -ForegroundColor Yellow
Invoke-SSH $vpsAddress "grep -C 5 PER_WORKER_POLICY_LIMIT_MS $composeFile"

Write-Host "Restarting services..." -ForegroundColor Cyan
Invoke-SSH $vpsAddress "cd /root/multiple-supabase/docker && docker compose -f $composeFile up -d --force-recreate"
