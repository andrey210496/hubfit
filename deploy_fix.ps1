$migrationFile = "c:\Users\Cross Nutrition Box\Downloads\antigravity-kit\whitelabel-executer\supabase\migrations\fix_agent_tools.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Erro: Arquivo nao encontrado." -ForegroundColor Red
    exit
}

$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@192.168.1.5)"

# 1. Preparar arquivo local
$content = Get-Content $migrationFile -Encoding UTF8 -Raw
# Remove BOM se existir
if ($content.StartsWith([char]0xFEFF)) { $content = $content.Substring(1) }
# Salva temporario
$tempFile = "fix_final.sql"
Set-Content $tempFile -Value $content -Encoding UTF8 -NoNewline

# 2. Upload para HOST via SCP
Write-Host "1/3 Enviando arquivo para VPS (Host)..." -ForegroundColor Yellow
scp $tempFile "${vpsAddress}:/tmp/fix_agent.sql"

if (-not $?) {
    Write-Host "Erro no SCP." -ForegroundColor Red
    exit
}

# 3. Copiar do HOST para CONTAINER
Write-Host "2/3 Copiando do Host para o Container..." -ForegroundColor Yellow
ssh $vpsAddress "docker cp /tmp/fix_agent.sql supabase-db-1750867038:/tmp/fix_agent.sql"

# 4. Executar via PSQL -f (Arquivo Local no Container)
Write-Host "3/3 Executando Migracao Blindada..." -ForegroundColor Yellow
ssh $vpsAddress "docker exec supabase-db-1750867038 psql -U supabase_admin -d postgres -f /tmp/fix_agent.sql"

# Limpeza
Remove-Item $tempFile -Force
ssh $vpsAddress "rm /tmp/fix_agent.sql"

Write-Host "Concluido! Se isso falhar, eu desisto da computacao (brincadeira)." -ForegroundColor Cyan
