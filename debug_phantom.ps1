$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

# Query to inspect the "Phantom Message" phenomenon
# checking for sequence of messages where from_me=true follows from_me=true, or duplicate user messages
$sql = "
SELECT 
    id, 
    ticket_id, 
    contact_id, 
    from_me, 
    left(body, 50) as preview, 
    created_at 
FROM messages 
ORDER BY created_at DESC 
LIMIT 20;
"

$tempSql = "debug_phantom.sql"
Set-Content $tempSql -Value $sql -Encoding UTF8

# Copy SQL to VPS
scp $tempSql "${vpsAddress}:/tmp/debug_phantom.sql"

Write-Host "Executando raio-X das mensagens..." -ForegroundColor Yellow

# Copy into container
ssh $vpsAddress "docker cp /tmp/debug_phantom.sql supabase-db-1750867038:/tmp/debug_phantom.sql"

# Execute
ssh $vpsAddress "docker exec -i supabase-db-1750867038 psql -U supabase_admin -d postgres -f /tmp/debug_phantom.sql"

# Cleanup
ssh $vpsAddress "rm /tmp/debug_phantom.sql"
Remove-Item $tempSql -Force
