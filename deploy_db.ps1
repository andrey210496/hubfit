$migrationFile = "c:\Users\Cross Nutrition Box\Downloads\antigravity-kit\whitelabel-executer\supabase\migrations\20260129172505_62e278ac-7e0b-401e-a87f-ab8c79c34f96.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "Erro: Arquivo de migracao nao encontrado em: $migrationFile" -ForegroundColor Red
    exit
}

$vpsAddress = Read-Host "Digite o endereco SSH da VPS (ex: root@192.168.1.5)"

if ([string]::IsNullOrWhiteSpace($vpsAddress)) {
    Write-Host "Endereco invalido!" -ForegroundColor Red
    exit
}

Write-Host "Lendo e enviando migracao para $vpsAddress..." -ForegroundColor Green
$sql = Get-Content $migrationFile -Encoding UTF8 -Raw

# Remove BOM if present (Postgres can complain)
if ($sql.StartsWith([char]0xFEFF)) {
    $sql = $sql.Substring(1)
}

$sql | ssh $vpsAddress "docker exec -i supabase-db-1750867038 psql -U supabase_admin -d postgres"

if ($?) {
    Write-Host "Migracao concluida com sucesso! A Jaque agora tem cerebro." -ForegroundColor Cyan
}
else {
    Write-Host "Erro ao conectar na VPS. Verifique o IP/Usuario." -ForegroundColor Red
}
