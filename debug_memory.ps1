$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@31.220.103.111)"
if ([string]::IsNullOrWhiteSpace($vpsAddress)) { $vpsAddress = "root@31.220.103.111" }

# Query to find tickets for the specific phone number involved in the "Amnesia" case
# Phone: 5511954083484 (from logs)
$sql = "
SELECT 
    created_at,
    from_me,
    left(body, 50) as content,
    ticket_id
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;
"

$tempSql = "debug_context.sql"
Set-Content $tempSql -Value $sql -Encoding UTF8

# Copy SQL to VPS
scp $tempSql "${vpsAddress}:/tmp/debug_context.sql"

Write-Host "Executando consulta no banco..." -ForegroundColor Yellow

# Copy into container (Fix for 'No such file')
ssh $vpsAddress "docker cp /tmp/debug_context.sql supabase-db-1750867038:/tmp/debug_context.sql"

# Execute inside container
ssh $vpsAddress "docker exec -i supabase-db-1750867038 psql -U supabase_admin -d postgres -f /tmp/debug_context.sql"

# Cleanup
ssh $vpsAddress "rm /tmp/debug_context.sql"
Remove-Item $tempSql -Force
